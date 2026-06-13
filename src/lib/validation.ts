// 입력 검증 — 커맨드 인젝션·잘못된 요청의 1차 방어선.
// 라우트 핸들러는 여기 결과를 받아 통일 에러 코드로 매핑한다(docs/API.md).

import type { ConvertFormat } from '@/types';

const VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/;
const DEFAULT_MAX_RESULTS = 12;
const MIN_MAX_RESULTS = 1;
const MAX_MAX_RESULTS = 50;

/** YouTube 영상 ID가 정확히 11자의 허용 문자(`A-Za-z0-9_-`)인지. */
export function isValidVideoId(id: string | null | undefined): boolean {
  if (typeof id !== 'string') return false;
  return VIDEO_ID_RE.test(id);
}

/**
 * 출력 포맷을 정규화한다. 대소문자/공백은 허용해 소문자로 맞추고,
 * `mp3`/`mp4`가 아니면 `null`(라우트에서 `INVALID_FORMAT`).
 */
export function parseFormat(input: string | null | undefined): ConvertFormat | null {
  if (typeof input !== 'string') return null;
  const normalized = input.trim().toLowerCase();
  return normalized === 'mp3' || normalized === 'mp4' ? normalized : null;
}

/**
 * `maxResults`를 파싱한다. 미지정/빈값은 기본 12,
 * 정수 1–50은 그 값, 그 외(0·51·소수·비숫자)는 `null`(라우트에서 `INVALID_MAX_RESULTS`).
 */
export function parseMaxResults(input: string | null | undefined): number | null {
  if (input == null) return DEFAULT_MAX_RESULTS;
  const trimmed = input.trim();
  if (trimmed === '') return DEFAULT_MAX_RESULTS;
  if (!/^\d+$/.test(trimmed)) return null; // 정수만(부호·소수점·문자 거부)
  const value = Number(trimmed);
  if (value < MIN_MAX_RESULTS || value > MAX_MAX_RESULTS) return null;
  return value;
}
