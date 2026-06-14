// yt-dlp(youtube-dl-exec) + ffmpeg-static 래퍼. child_process 경계(서버 전용).
// 보안 불변식: 인자는 전부 구조화된 배열(셸 보간 0), videoId는 URL 값으로만,
// temp는 os.tmpdir() 하위 고유명, abort/timeout 시 자식 프로세스 kill.

import youtubeDl, { type Flags } from 'youtube-dl-exec';
import ffmpegStatic from 'ffmpeg-static';
import os from 'node:os';
import path from 'node:path';
import { writeFile, rm } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import type { ConvertFormat } from '@/types';

/** 변환 한 건의 상한 시간. 초과하면 프로세스를 kill 하고 CONVERSION_FAILED. */
export const CONVERT_TIMEOUT_MS = 5 * 60 * 1000;

/** 변환 경계에서 던지는 에러. `code`는 라우트가 통일 HTTP 상태로 매핑한다(docs/API.md). */
export class ConvertError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ConvertError';
  }
}

export type ConvertArgs = {
  videoId: string;
  format: ConvertFormat;
  signal?: AbortSignal;
};

/** 호스팅 환경(특히 클라우드 데이터센터 IP)에서 봇 차단을 우회하기 위한 선택적 옵션. */
export type ConvertExtra = {
  /** `--proxy` — yt-dlp 트래픽을 우회시킬 HTTP/SOCKS 프록시(예: Cloudflare WARP). */
  proxy?: string;
  /** `--cookies` — YouTube 로그인 세션 cookies.txt 파일 경로(인증 요청으로 위장). */
  cookies?: string;
};

/**
 * 포맷별 yt-dlp 플래그를 구성한다(camelCase = 타입 안전, 런타임엔 `-x/-f/-o` 동치 배열).
 * - mp3: `--extract-audio --audio-format mp3 --audio-quality 0`
 * - mp4: `--format bestvideo+bestaudio/best --merge-output-format mp4`
 * - 공통: `--ffmpeg-location <ffmpeg-static>`, `--output <tmp 경로>`
 * - 선택: `--proxy`/`--cookies` (값이 있을 때만 — 호스팅 환경 IP 차단 우회용).
 */
export function buildFlags(
  format: ConvertFormat,
  outPath: string,
  ffmpegLocation: string,
  extra?: ConvertExtra,
): Flags {
  const common: Flags = {
    ffmpegLocation,
    output: outPath,
    ...(extra?.proxy ? { proxy: extra.proxy } : {}),
    ...(extra?.cookies ? { cookies: extra.cookies } : {}),
  };
  if (format === 'mp3') {
    return { extractAudio: true, audioFormat: 'mp3', audioQuality: 0, ...common };
  }
  return { format: 'bestvideo+bestaudio/best', mergeOutputFormat: 'mp4', ...common };
}

// 영상 자체에 접근 불가(삭제/비공개/지역·연령 차단)임을 알리는 yt-dlp stderr 신호.
const UNAVAILABLE_RE =
  /unavailable|private video|has been removed|been terminated|not available|sign in to confirm your age|age.?restrict|blocked it|geo.?restrict/i;

/** 변환 실패 원인을 통일 코드로 분류한다(stderr/spawn code 기반). */
function classifyError(err: unknown): ConvertError {
  if (err instanceof ConvertError) return err;
  const e = err as { code?: string; stderr?: string; message?: string };
  const text = `${e?.stderr ?? ''}\n${e?.message ?? ''}`;

  // 바이너리 자체를 못 찾음(yt-dlp/ffmpeg 실행 불가).
  if (e?.code === 'ENOENT') {
    return new ConvertError('CONVERTER_UNAVAILABLE', '변환 도구를 사용할 수 없습니다.');
  }
  if (UNAVAILABLE_RE.test(text)) {
    return new ConvertError('VIDEO_UNAVAILABLE', '영상에 접근할 수 없습니다.');
  }
  return new ConvertError('CONVERSION_FAILED', '변환에 실패했습니다.');
}

/**
 * 영상을 mp3/mp4로 변환해 temp 파일 경로를 반환한다.
 * 호출자(라우트)는 반환 경로를 스트리밍한 뒤 삭제하고, code별 HTTP로 매핑한다.
 */
export async function convertToFile({ videoId, format, signal }: ConvertArgs): Promise<string> {
  const ffmpegLocation = ffmpegStatic;
  if (!ffmpegLocation) {
    console.error('[convert] ffmpeg-static binary path is unavailable');
    throw new ConvertError('CONVERTER_UNAVAILABLE', '변환 도구를 사용할 수 없습니다.');
  }

  // 고유 출력명: videoId + nonce. videoId는 라우트에서 정규식 검증을 통과한 값.
  const nonce = randomBytes(6).toString('hex');
  const outPath = path.join(os.tmpdir(), `${videoId}-${nonce}.${format}`);
  const url = `https://www.youtube.com/watch?v=${videoId}`;

  // 호스팅 환경 IP 차단 우회(서버 전용 env). 값이 있을 때만 yt-dlp에 전달한다.
  // - YTDLP_PROXY: 프록시 URL을 그대로 --proxy로.
  // - YOUTUBE_COOKIES: cookies.txt 본문 → temp 파일로 써서 --cookies 경로로(비밀이라 finally에서 정리).
  const proxy = process.env.YTDLP_PROXY?.trim() || undefined;
  let cookiePath: string | undefined;
  const cookiesContent = process.env.YOUTUBE_COOKIES;
  if (cookiesContent && cookiesContent.trim()) {
    cookiePath = path.join(os.tmpdir(), `cookies-${randomBytes(6).toString('hex')}.txt`);
    await writeFile(cookiePath, cookiesContent, 'utf8');
  }

  const subprocess = youtubeDl.exec(
    url,
    buildFlags(format, outPath, ffmpegLocation, { proxy, cookies: cookiePath }),
  );

  // abort: 클라가 탭을 닫으면 자식 프로세스를 즉시 kill.
  const onAbort = () => {
    subprocess.kill();
  };
  if (signal) {
    if (signal.aborted) onAbort();
    else signal.addEventListener('abort', onAbort);
  }

  // timeout: 상한 초과 시 kill 하고 실패로 거부(race).
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      subprocess.kill();
      reject(new ConvertError('CONVERSION_FAILED', '변환 시간이 초과되었습니다.'));
    }, CONVERT_TIMEOUT_MS);
  });

  try {
    await Promise.race([subprocess, timeout]);
    return outPath;
  } catch (err) {
    // 실패 원인을 서버 로그로 남긴다(클라엔 통일 코드만 노출). yt-dlp stderr엔 쿠키 "내용"이
    // 담기지 않으므로 안전 — 배포 환경에서 봇 차단/포맷 오류 등을 진단하는 유일한 단서다.
    const e = err as { code?: string; stderr?: string; message?: string };
    console.error('[convert] failed', {
      videoId,
      format,
      code: e?.code,
      detail: (e?.stderr || e?.message || '').slice(0, 1000),
    });
    throw classifyError(err);
  } finally {
    if (timer) clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
    // 쿠키 temp는 비밀이므로 변환이 끝나면(성공/실패 무관) 즉시 지운다.
    if (cookiePath) await rm(cookiePath, { force: true }).catch(() => {});
  }
}
