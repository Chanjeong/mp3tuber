// 다운로드 파일명 sanitize — 경로 traversal·Windows 예약명 충돌·잘못된 문자를 막는다.
// 변환 라우트가 Content-Disposition(filename*=UTF-8'')에 안전하게 쓸 base를 만든다.

const MAX_BASE_LENGTH = 100;

// Windows 금지문자: / \ : * ? " < > | (공백·하이픈은 보존).
const FORBIDDEN_RE = /[/\\:*?"<>|]/g;

// 제어문자(개행·탭 등). \p{Cc} = Unicode control category.
const CONTROL_RE = /\p{Cc}/gu;

// Windows 예약 디바이스명(대소문자 무관). CON, PRN, AUX, NUL, COM1-9, LPT1-9.
const RESERVED_RE = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;

/**
 * `title`을 안전한 파일 base로 정제하고 `.<ext>`를 붙인다.
 * 금지문자·제어문자 제거 → `..` 등 연속 점 제거 → 앞뒤 점/공백 trim →
 * ~100자 truncate → 예약명/빈 결과면 `videoId`로 fallback.
 */
export function sanitizeFilename(
  title: string | null | undefined,
  videoId: string,
  ext: string,
): string {
  let base = typeof title === 'string' ? title : '';

  base = base.replace(FORBIDDEN_RE, '');
  base = base.replace(CONTROL_RE, '');
  base = base.replace(/\.{2,}/g, ''); // 연속 점 제거(traversal 차단)
  base = base.replace(/^[.\s]+|[.\s]+$/g, ''); // 앞뒤 점/공백 trim
  base = base.slice(0, MAX_BASE_LENGTH);
  base = base.replace(/[.\s]+$/g, ''); // truncate가 만든 끝 점/공백 재정리

  if (base === '' || RESERVED_RE.test(base)) {
    base = videoId;
  }

  return `${base}.${ext}`;
}
