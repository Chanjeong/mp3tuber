import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import os from 'node:os';

// 바이너리(yt-dlp/ffmpeg)는 단위 테스트에서 절대 호출하지 않는다.
// youtube-dl-exec와 ffmpeg-static을 모킹해 인자 구성·프로세스 수명만 검증한다.
vi.mock('youtube-dl-exec', () => ({ default: { exec: vi.fn() } }));
vi.mock('ffmpeg-static', () => ({ default: '/fake/ffmpeg.exe' }));
// 쿠키 temp 파일 쓰기/정리는 디스크 없이 스파이로만 검증한다.
vi.mock('node:fs/promises', () => {
  const writeFile = vi.fn().mockResolvedValue(undefined);
  const rm = vi.fn().mockResolvedValue(undefined);
  return { writeFile, rm, default: { writeFile, rm } };
});

import youtubeDl from 'youtube-dl-exec';
import { writeFile, rm } from 'node:fs/promises';
import { convertToFile, buildFlags, ConvertError, CONVERT_TIMEOUT_MS } from './convert';

const mockedExec = vi.mocked(youtubeDl.exec);
const mockedWriteFile = vi.mocked(writeFile);
const mockedRm = vi.mocked(rm);

// await 가능한 subprocess 흉내: resolve/reject를 외부에서 제어 + kill 스파이.
function makeProc() {
  let resolveFn: (v: unknown) => void = () => {};
  let rejectFn: (e: unknown) => void = () => {};
  const promise = new Promise((res, rej) => {
    resolveFn = res;
    rejectFn = rej;
  });
  return Object.assign(promise, {
    kill: vi.fn(),
    resolve: resolveFn,
    reject: rejectFn,
  });
}

const VID = 'jfKfPfyJRdk';

describe('buildFlags', () => {
  it('builds the mp3 arg array (-x/--audio-format/--audio-quality + ffmpeg-location + output)', async () => {
    // 런타임에서 yt-dlp로 넘어갈 실제 배열을 라이브러리의 args()로 그대로 검증한다.
    // (args는 런타임 export지만 .d.ts에 타입이 없어 캐스팅한다.)
    const { args } = (await vi.importActual('youtube-dl-exec')) as {
      args: (flags: Record<string, unknown>) => string[];
    };
    const flags = buildFlags('mp3', '/tmp/out.mp3', '/fake/ffmpeg.exe');
    expect(args(flags)).toEqual([
      '--extract-audio',
      '--audio-format',
      'mp3',
      '--audio-quality',
      '0',
      '--ffmpeg-location',
      '/fake/ffmpeg.exe',
      '--output',
      '/tmp/out.mp3',
    ]);
  });

  it('builds the mp4 arg array (-f bestvideo+bestaudio/best + --merge-output-format mp4)', async () => {
    const { args } = (await vi.importActual('youtube-dl-exec')) as {
      args: (flags: Record<string, unknown>) => string[];
    };
    const flags = buildFlags('mp4', '/tmp/out.mp4', '/fake/ffmpeg.exe');
    expect(args(flags)).toEqual([
      '--format',
      'bestvideo+bestaudio/best',
      '--merge-output-format',
      'mp4',
      '--ffmpeg-location',
      '/fake/ffmpeg.exe',
      '--output',
      '/tmp/out.mp4',
    ]);
  });

  it('appends --proxy/--cookies when extra options are provided (Vercel IP 우회용)', async () => {
    const { args } = (await vi.importActual('youtube-dl-exec')) as {
      args: (flags: Record<string, unknown>) => string[];
    };
    const flags = buildFlags('mp3', '/tmp/out.mp3', '/fake/ffmpeg.exe', {
      proxy: 'http://127.0.0.1:8080',
      cookies: '/tmp/cookies-abc.txt',
    });
    expect(args(flags)).toEqual([
      '--extract-audio',
      '--audio-format',
      'mp3',
      '--audio-quality',
      '0',
      '--ffmpeg-location',
      '/fake/ffmpeg.exe',
      '--output',
      '/tmp/out.mp3',
      '--proxy',
      'http://127.0.0.1:8080',
      '--cookies',
      '/tmp/cookies-abc.txt',
    ]);
  });
});

describe('convertToFile', () => {
  beforeEach(() => {
    mockedExec.mockReset();
    mockedWriteFile.mockClear().mockResolvedValue(undefined);
    mockedRm.mockClear().mockResolvedValue(undefined);
    delete process.env.YTDLP_PROXY;
    delete process.env.YOUTUBE_COOKIES;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.YTDLP_PROXY;
    delete process.env.YOUTUBE_COOKIES;
  });

  it('calls yt-dlp with the watch URL + structured flags, returns a unique tmpdir path', async () => {
    const proc = makeProc();
    proc.resolve({ exitCode: 0 });
    mockedExec.mockReturnValue(proc as never);

    const out = await convertToFile({ videoId: VID, format: 'mp3' });

    expect(mockedExec).toHaveBeenCalledTimes(1);
    const [url, flags] = mockedExec.mock.calls[0];
    // videoId는 셸 문자열이 아니라 URL 값으로만 전달된다.
    expect(url).toBe(`https://www.youtube.com/watch?v=${VID}`);
    expect(flags).toMatchObject({
      extractAudio: true,
      audioFormat: 'mp3',
      audioQuality: 0,
      ffmpegLocation: '/fake/ffmpeg.exe',
    });
    // 출력은 os.tmpdir() 하위, videoId + nonce 로 고유.
    expect(out.startsWith(os.tmpdir())).toBe(true);
    expect(out).toMatch(new RegExp(`${VID}-[0-9a-f]+\\.mp3$`));
    // -o(--output)가 반환 경로와 일치.
    expect((flags as { output?: string }).output).toBe(out);
  });

  it('produces a unique output path on each call (nonce)', async () => {
    const p1 = makeProc();
    p1.resolve({ exitCode: 0 });
    const p2 = makeProc();
    p2.resolve({ exitCode: 0 });
    mockedExec.mockReturnValueOnce(p1 as never).mockReturnValueOnce(p2 as never);

    const a = await convertToFile({ videoId: VID, format: 'mp4' });
    const b = await convertToFile({ videoId: VID, format: 'mp4' });
    expect(a).not.toBe(b);
  });

  it('passes flags as structured data, never an interpolated shell string', async () => {
    const proc = makeProc();
    proc.resolve({ exitCode: 0 });
    mockedExec.mockReturnValue(proc as never);

    await convertToFile({ videoId: VID, format: 'mp4' });

    const [, flags] = mockedExec.mock.calls[0];
    expect(typeof flags).toBe('object');
    expect(Array.isArray(flags)).toBe(false);
    // 어떤 값도 "flag + value"가 한 문자열로 붙어있지 않다(셸 보간 흔적).
    for (const value of Object.values(flags as Record<string, unknown>)) {
      if (typeof value === 'string') expect(value).not.toMatch(/\s--?[a-z]/i);
    }
  });

  it('passes YTDLP_PROXY env through to yt-dlp as --proxy', async () => {
    process.env.YTDLP_PROXY = 'http://127.0.0.1:8080';
    const proc = makeProc();
    proc.resolve({ exitCode: 0 });
    mockedExec.mockReturnValue(proc as never);

    await convertToFile({ videoId: VID, format: 'mp3' });

    const [, flags] = mockedExec.mock.calls[0];
    expect(flags).toMatchObject({ proxy: 'http://127.0.0.1:8080' });
  });

  it('writes YOUTUBE_COOKIES to a tmp file, passes its path, and removes it afterward', async () => {
    process.env.YOUTUBE_COOKIES = '# Netscape HTTP Cookie File\nyoutube.com\tTRUE\t/\tTRUE\t0\tFOO\tbar';
    const proc = makeProc();
    proc.resolve({ exitCode: 0 });
    mockedExec.mockReturnValue(proc as never);

    await convertToFile({ videoId: VID, format: 'mp3' });

    // 쿠키 내용이 os.tmpdir() 하위 파일로 기록되고, 그 경로가 --cookies로 전달된다.
    expect(mockedWriteFile).toHaveBeenCalledTimes(1);
    const [cookiePath, contents] = mockedWriteFile.mock.calls[0];
    expect(String(cookiePath).startsWith(os.tmpdir())).toBe(true);
    expect(String(cookiePath)).toMatch(/cookies-[0-9a-f]+\.txt$/);
    expect(contents).toBe(process.env.YOUTUBE_COOKIES);

    const [, flags] = mockedExec.mock.calls[0];
    expect((flags as { cookies?: string }).cookies).toBe(cookiePath);

    // 변환이 끝나면 쿠키 temp는 정리된다(비밀이 디스크에 남지 않게).
    expect(mockedRm).toHaveBeenCalledWith(cookiePath, expect.objectContaining({ force: true }));
  });

  it('does not write a cookie file or set proxy when env is unset', async () => {
    const proc = makeProc();
    proc.resolve({ exitCode: 0 });
    mockedExec.mockReturnValue(proc as never);

    await convertToFile({ videoId: VID, format: 'mp3' });

    expect(mockedWriteFile).not.toHaveBeenCalled();
    const [, flags] = mockedExec.mock.calls[0];
    expect((flags as { proxy?: string }).proxy).toBeUndefined();
    expect((flags as { cookies?: string }).cookies).toBeUndefined();
  });

  it('kills the subprocess when the abort signal fires', async () => {
    const proc = makeProc();
    mockedExec.mockReturnValue(proc as never);

    const ac = new AbortController();
    const p = convertToFile({ videoId: VID, format: 'mp3', signal: ac.signal });
    ac.abort();

    expect(proc.kill).toHaveBeenCalled();

    // 실제 프로세스라면 kill 후 거부된다 — 정리되며 ConvertError로 매핑되는지 확인.
    proc.reject(Object.assign(new Error('killed'), { stderr: 'Process terminated' }));
    await expect(p).rejects.toBeInstanceOf(ConvertError);
  });

  it('kills and fails with CONVERSION_FAILED on timeout', async () => {
    vi.useFakeTimers();
    try {
      const proc = makeProc();
      mockedExec.mockReturnValue(proc as never);

      const p = convertToFile({ videoId: VID, format: 'mp3' });
      const assertion = expect(p).rejects.toMatchObject({ code: 'CONVERSION_FAILED' });
      await vi.advanceTimersByTimeAsync(CONVERT_TIMEOUT_MS + 1);

      expect(proc.kill).toHaveBeenCalled();
      await assertion;
    } finally {
      vi.useRealTimers();
    }
  });

  it('maps spawn ENOENT (missing binary) to CONVERTER_UNAVAILABLE', async () => {
    const proc = makeProc();
    mockedExec.mockReturnValue(proc as never);
    proc.reject(Object.assign(new Error('spawn yt-dlp ENOENT'), { code: 'ENOENT' }));

    await expect(convertToFile({ videoId: VID, format: 'mp3' })).rejects.toMatchObject({
      code: 'CONVERTER_UNAVAILABLE',
    });
  });

  it('maps "Video unavailable" stderr to VIDEO_UNAVAILABLE', async () => {
    const proc = makeProc();
    mockedExec.mockReturnValue(proc as never);
    proc.reject(
      Object.assign(new Error('failed'), { stderr: 'ERROR: [youtube] Video unavailable' }),
    );

    await expect(convertToFile({ videoId: VID, format: 'mp4' })).rejects.toMatchObject({
      code: 'VIDEO_UNAVAILABLE',
    });
  });

  it('maps a generic failure to CONVERSION_FAILED', async () => {
    const proc = makeProc();
    mockedExec.mockReturnValue(proc as never);
    proc.reject(Object.assign(new Error('ffmpeg exited 1'), { stderr: 'ffmpeg: muxing failed' }));

    await expect(convertToFile({ videoId: VID, format: 'mp3' })).rejects.toMatchObject({
      code: 'CONVERSION_FAILED',
    });
  });
});
