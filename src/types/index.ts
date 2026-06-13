// 자체 API 계약의 단일 타입 소스. docs/API.md '데이터 모델'과 1:1 일치시킨다.

/** YouTube 검색 결과 한 건(`GET /api/search` 응답 items 요소). */
export type VideoResult = {
  videoId: string; // 11자 YouTube 영상 ID
  title: string; // HTML 엔티티 디코딩된 제목
  channelTitle: string; // 채널명
  thumbnailUrl: string; // 썸네일 URL(우선순위 선택)
  publishedAt: string; // ISO 8601 게시일시
  duration?: string; // MVP 미사용 — search.list 미제공. 향후 확장용 optional
};

/** `GET /api/convert`의 출력 포맷. */
export type ConvertFormat = 'mp3' | 'mp4';

/** 통일 에러 모델. 모든 에러 응답은 `{ error: ApiError }`로 래핑된다. */
export type ApiError = { code: string; message: string };
