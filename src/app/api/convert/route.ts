// GET /api/convert — 선택 영상을 mp3/mp4로 변환해 스트리밍 다운로드(docs/API.md).
// 라우트는 입력 검증 + 통일 에러 매핑 + temp 정리만 담당하고, 변환은 lib/convert(서버)에 위임한다.

import { convertToFile, ConvertError } from '@/lib/convert';
import { isValidVideoId, parseFormat } from '@/lib/validation';
import { sanitizeFilename } from '@/lib/filename';
import type { ConvertFormat, ApiError } from '@/types';
import { stat, rm } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { Readable } from 'node:stream';

// child_process/fs/스트림을 쓰므로 Node 런타임 필수(Edge 불가).
export const runtime = 'nodejs';

// 에러 코드 → HTTP 상태(docs/API.md 카탈로그).
const STATUS_BY_CODE: Record<string, number> = {
  INVALID_VIDEO_ID: 400,
  INVALID_FORMAT: 400,
  VIDEO_UNAVAILABLE: 404,
  CONVERTER_UNAVAILABLE: 500,
  CONVERSION_FAILED: 500,
};

const CONTENT_TYPE_BY_FORMAT: Record<ConvertFormat, string> = {
  mp3: 'audio/mpeg',
  mp4: 'video/mp4',
};

function errorResponse(code: string, message: string): Response {
  const body: { error: ApiError } = { error: { code, message } };
  return new Response(JSON.stringify(body), {
    status: STATUS_BY_CODE[code] ?? 500,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

// RFC 5987 `filename*=UTF-8''` 토큰 인코딩(비ASCII·예약문자 percent-encode).
function encodeRFC5987(value: string): string {
  return encodeURIComponent(value).replace(
    /['()*]/g,
    (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase(),
  );
}

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);

  const videoId = searchParams.get('videoId') ?? '';
  if (!isValidVideoId(videoId)) {
    return errorResponse('INVALID_VIDEO_ID', '유효하지 않은 영상 ID입니다.');
  }

  const format = parseFormat(searchParams.get('format'));
  if (!format) {
    return errorResponse('INVALID_FORMAT', 'format은 mp3 또는 mp4여야 합니다.');
  }

  const title = searchParams.get('title');

  let tmpPath: string | undefined;
  try {
    // 클라가 탭을 닫으면 request.signal로 변환 프로세스가 중단된다.
    tmpPath = await convertToFile({ videoId, format, signal: request.signal });

    const { size } = await stat(tmpPath);
    const filename = sanitizeFilename(title, videoId, format);

    // 스트리밍이 끝나거나 끊기면 temp를 정리(성공 경로의 try/finally 역할).
    const cleanupPath = tmpPath;
    const fileStream = createReadStream(cleanupPath);
    const cleanup = () => {
      void rm(cleanupPath, { force: true }).catch(() => {});
    };
    fileStream.once('close', cleanup);
    fileStream.once('error', cleanup);

    const body = Readable.toWeb(fileStream) as ReadableStream<Uint8Array>;
    return new Response(body, {
      status: 200,
      headers: {
        'content-type': CONTENT_TYPE_BY_FORMAT[format],
        'content-disposition': `attachment; filename*=UTF-8''${encodeRFC5987(filename)}`,
        'content-length': String(size),
      },
    });
  } catch (err) {
    // 스트리밍 시작 전 실패: temp가 생겼다면 정리하고 통일 에러로 응답.
    if (tmpPath) void rm(tmpPath, { force: true }).catch(() => {});
    if (err instanceof ConvertError) {
      return errorResponse(err.code, err.message);
    }
    // 예기치 못한 에러: 원문/스택은 서버 로그로만, 클라엔 일반 메시지.
    console.error('[convert] unexpected error', err);
    return errorResponse('CONVERSION_FAILED', '변환 처리 중 오류가 발생했습니다.');
  }
}
