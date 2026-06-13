// Phase 1 임시 토큰 쇼케이스 — semantic 유틸만 소비해 토큰 이식을 시각 확인한다.
// 검색→결과→변환 UI는 Phase 5(app/page.tsx)에서 이 마크업을 교체한다.
export default function Home() {
  return (
    <main className="flex flex-col gap-section fade-in">
      <header className="flex flex-col gap-inline">
        <h1 className="text-display">mp3tuber</h1>
        <p className="text-body text-text-muted">
          YouTube를 검색해 mp3/mp4로 변환하는 로컬·개인용 도구
        </p>
      </header>

      {/* 토큰 소비 샘플 카드 */}
      <section className="flex flex-col gap-inline rounded-card border border-border bg-surface p-card shadow-elevation-1 slide-up">
        <h2 className="text-heading">디자인 토큰 확인</h2>
        <p className="text-body text-text-secondary">
          이 카드는 surface / border / radius / spacing / elevation 토큰을 소비합니다.
        </p>
        <code className="text-code text-text-muted">dQw4w9WgXcQ</code>

        <div className="flex gap-inline">
          <button
            type="button"
            className="h-9 rounded-button bg-accent px-4 text-accent-fg hover:bg-accent-hover"
          >
            Primary
          </button>
          <button
            type="button"
            className="h-9 rounded-button px-4 text-text-muted hover:text-text-secondary"
          >
            Text
          </button>
        </div>

        <div className="flex gap-inline text-caption">
          <span className="text-success">success</span>
          <span className="text-error">error</span>
          <span className="text-warning">warning</span>
          <span className="text-info">info</span>
        </div>
      </section>
    </main>
  );
}
