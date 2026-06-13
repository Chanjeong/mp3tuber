type ErrorBannerProps = {
  message: string;
  /** 있으면 "다시 시도" 버튼을 렌더한다. */
  onRetry?: () => void;
};

/** 검색 등 페이지 레벨 에러 표시(카드 인라인 에러는 VideoCard가 담당). */
export function ErrorBanner({ message, onRetry }: ErrorBannerProps) {
  return (
    <div
      role="alert"
      className="flex items-center gap-inline rounded-card border border-border bg-surface p-card text-body text-error"
    >
      <span>{message}</span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="ml-auto rounded-button text-text-muted underline hover:text-text-secondary"
        >
          다시 시도
        </button>
      )}
    </div>
  );
}
