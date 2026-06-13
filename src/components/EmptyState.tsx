type EmptyStateProps = {
  message?: string;
};

/** 검색 결과가 비었을 때의 안내. */
export function EmptyState({ message = '검색 결과가 없습니다.' }: EmptyStateProps) {
  return (
    <div className="rounded-card border border-border bg-surface p-card text-body text-text-muted">
      {message}
    </div>
  );
}
