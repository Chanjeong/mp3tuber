// GET /api/search — 키워드로 YouTube 영상 검색(docs/API.md).
// 키는 서비스(서버 env)에서만 쓰이고, 라우트는 입력 검증 + 통일 에러 매핑만 담당한다.

import { searchVideos, SearchServiceError } from '@/services/youtube';
import { parseMaxResults } from '@/lib/validation';
import type { ApiError } from '@/types';

// child_process/fs를 쓰는 변환 라우트와 정책을 맞추고, fetch 기반 호출을 Node 런타임에서 처리.
export const runtime = 'nodejs';

// 에러 코드 → HTTP 상태(docs/API.md 카탈로그).
const STATUS_BY_CODE: Record<string, number> = {
  MISSING_QUERY: 400,
  INVALID_MAX_RESULTS: 400,
  QUOTA_EXCEEDED: 503,
  UPSTREAM_ERROR: 502,
  CONFIG_ERROR: 500,
};

function errorResponse(code: string, message: string): Response {
  const body: { error: ApiError } = { error: { code, message } };
  return new Response(JSON.stringify(body), {
    status: STATUS_BY_CODE[code] ?? 500,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);

  const q = (searchParams.get('q') ?? '').trim();
  if (!q) return errorResponse('MISSING_QUERY', '검색어를 입력하세요.');

  const maxResults = parseMaxResults(searchParams.get('maxResults'));
  if (maxResults === null) {
    return errorResponse('INVALID_MAX_RESULTS', 'maxResults는 1–50 사이의 정수여야 합니다.');
  }

  try {
    const items = await searchVideos(q, maxResults);
    return new Response(JSON.stringify({ items }), {
      status: 200,
      headers: { 'content-type': 'application/json; charset=utf-8' },
    });
  } catch (err) {
    if (err instanceof SearchServiceError) {
      // message는 서비스에서 이미 안전하게 다듬어진 사용자용 문구다.
      return errorResponse(err.code, err.message);
    }
    // 예기치 못한 에러: 원문/스택은 서버 로그로만, 클라엔 일반 메시지.
    console.error('[search] unexpected error', err);
    return errorResponse('UPSTREAM_ERROR', '검색 처리 중 오류가 발생했습니다.');
  }
}
