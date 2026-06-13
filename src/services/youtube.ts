// YouTube Data API v3 `search.list` 호출 + 응답 매핑. HTTP 경계(서버 전용).
// 키는 서버 env(`YOUTUBE_API_KEY`)에서만 읽고 응답/에러에 노출하지 않는다(docs/CLAUDE.md).

import type { VideoResult } from '@/types';

const SEARCH_ENDPOINT = 'https://www.googleapis.com/youtube/v3/search';

/** 서비스 경계에서 던지는 에러. `code`는 라우트가 통일 HTTP 상태로 매핑한다(docs/API.md). */
export class SearchServiceError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'SearchServiceError';
  }
}

/**
 * 키워드로 영상을 검색해 `VideoResult[]`로 매핑한다.
 * - 키 미설정 → `CONFIG_ERROR` (외부 호출조차 하지 않음)
 * - 403 → `QUOTA_EXCEEDED`
 * - 5xx·네트워크 실패 → `UPSTREAM_ERROR`
 */
export async function searchVideos(q: string, maxResults: number): Promise<VideoResult[]> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) {
    console.error('[search] YOUTUBE_API_KEY is not configured');
    throw new SearchServiceError('CONFIG_ERROR', '서버 설정 오류로 검색을 사용할 수 없습니다.');
  }

  const params = new URLSearchParams({
    key,
    part: 'snippet',
    type: 'video',
    q,
    maxResults: String(maxResults),
    regionCode: 'KR',
    relevanceLanguage: 'ko',
  });

  let res: Response;
  try {
    res = await fetch(`${SEARCH_ENDPOINT}?${params.toString()}`);
  } catch (err) {
    console.error('[search] network error', err);
    throw new SearchServiceError('UPSTREAM_ERROR', 'YouTube에 연결하지 못했습니다.');
  }

  if (!res.ok) {
    if (res.status === 403) {
      // 키는 로그에도 남기지 않는다. 상태 코드만 기록.
      console.error('[search] upstream 403 (quota/forbidden)');
      throw new SearchServiceError('QUOTA_EXCEEDED', 'YouTube API 일일 쿼터를 초과했습니다.');
    }
    console.error('[search] upstream error status', res.status);
    throw new SearchServiceError('UPSTREAM_ERROR', 'YouTube API 오류가 발생했습니다.');
  }

  const data: unknown = await res.json();
  const rawItems = Array.isArray((data as { items?: unknown }).items)
    ? (data as { items: unknown[] }).items
    : [];

  return rawItems.map(mapItem).filter((v): v is VideoResult => v !== null);
}

type Thumbnails = Record<string, { url?: string } | undefined>;

type RawSearchItem = {
  id?: { videoId?: string };
  snippet?: {
    title?: string;
    channelTitle?: string;
    publishedAt?: string;
    thumbnails?: Thumbnails;
  };
};

/** search.list 항목 1건 → VideoResult. 필수 필드(videoId/snippet) 누락 시 null. */
function mapItem(raw: unknown): VideoResult | null {
  const item = raw as RawSearchItem;
  const videoId = item?.id?.videoId;
  const snippet = item?.snippet;
  if (!videoId || !snippet) return null;

  return {
    videoId,
    title: decodeEntities(snippet.title ?? ''),
    channelTitle: snippet.channelTitle ?? '',
    thumbnailUrl: pickThumbnail(snippet.thumbnails),
    publishedAt: snippet.publishedAt ?? '',
  };
}

/** 썸네일 우선순위: medium → high → default(없으면 빈 문자열). */
function pickThumbnail(thumbs: Thumbnails | undefined): string {
  return thumbs?.medium?.url ?? thumbs?.high?.url ?? thumbs?.default?.url ?? '';
}

/** search.list가 HTML 엔티티로 인코딩해 주는 title을 디코딩한다. `&amp;`는 더블 디코딩 방지를 위해 마지막에. */
function decodeEntities(s: string): string {
  return s
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}
