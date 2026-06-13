type SpinnerProps = {
  /** 스크린리더용 라벨(시각적으로는 회전 아이콘) */
  label?: string;
  /** 크기·여백 등 추가 유틸 — semantic 토큰/스케일만(raw 값 금지) */
  className?: string;
};

/**
 * 로딩 인디케이터. 회전은 장식이 아니라 functional feedback이므로 `spin` 모션 유틸을
 * 쓴다(prefers-reduced-motion 시 정지). 색은 currentColor로 텍스트 토큰을 상속.
 */
export function Spinner({ label = '로딩 중', className = '' }: SpinnerProps) {
  return (
    <span role="status" aria-label={label} className={`inline-flex size-4 ${className}`}>
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="size-full spin">
        <circle
          cx="12"
          cy="12"
          r="9"
          stroke="currentColor"
          strokeWidth={1.5}
          className="opacity-25"
        />
        <path
          d="M21 12a9 9 0 0 0-9-9"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}
