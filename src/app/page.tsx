'use client';

import { useRef, useState } from 'react';
import type { VideoResult, ConvertFormat, ApiError } from '@/types';
import { SearchBar } from '@/components/SearchBar';
import { ResultsGrid } from '@/components/ResultsGrid';
import { EmptyState } from '@/components/EmptyState';
import { ErrorBanner } from '@/components/ErrorBanner';
import { Skeleton } from '@/components/Skeleton';
import type { ConvertStatus } from '@/components/VideoCard';

type SearchState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; items: VideoResult[] }
  | { status: 'empty' }
  | { status: 'error'; message: string };

const DEFAULT_MAX_RESULTS = 12;

/** 에러 응답 본문에서 사용자 노출용 message만 안전하게 꺼낸다. */
async function readApiError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: ApiError };
    return body.error?.message ?? '요청을 처리하지 못했습니다.';
  } catch {
    return '요청을 처리하지 못했습니다.';
  }
}

/** blob을 objectURL로 만들어 a[download] 클릭으로 내려받고 URL을 해제한다. */
function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function Home() {
  const [search, setSearch] = useState<SearchState>({ status: 'idle' });
  const [convertStatuses, setConvertStatuses] = useState<Record<string, ConvertStatus>>({});
  const lastQueryRef = useRef('');
  const searchAbortRef = useRef<AbortController | null>(null);

  async function runSearch(query: string) {
    lastQueryRef.current = query;
    // 이전 검색이 진행 중이면 취소(최신 쿼리만 반영).
    searchAbortRef.current?.abort();
    const controller = new AbortController();
    searchAbortRef.current = controller;

    setSearch({ status: 'loading' });
    try {
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(query)}&maxResults=${DEFAULT_MAX_RESULTS}`,
        { signal: controller.signal }
      );
      if (!res.ok) {
        setSearch({ status: 'error', message: await readApiError(res) });
        return;
      }
      const body = (await res.json()) as { items: VideoResult[] };
      setSearch(
        body.items.length ? { status: 'success', items: body.items } : { status: 'empty' }
      );
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return; // 의도된 취소
      setSearch({ status: 'error', message: '검색 중 오류가 발생했습니다.' });
    }
  }

  async function handleConvert(videoId: string, format: ConvertFormat, title: string) {
    setConvertStatuses((s) => ({ ...s, [videoId]: 'loading' }));
    try {
      const res = await fetch(
        `/api/convert?videoId=${encodeURIComponent(videoId)}&format=${format}&title=${encodeURIComponent(title)}`
      );
      if (!res.ok) {
        setConvertStatuses((s) => ({ ...s, [videoId]: 'error' }));
        return;
      }
      const blob = await res.blob();
      triggerDownload(blob, `${title || videoId}.${format}`);
      setConvertStatuses((s) => ({ ...s, [videoId]: 'idle' }));
    } catch {
      setConvertStatuses((s) => ({ ...s, [videoId]: 'error' }));
    }
  }

  return (
    <main className="flex flex-col gap-section fade-in">
      <header className="flex flex-col gap-inline">
        <h1 className="text-display">mp3tuber</h1>
        <p className="text-body text-text-muted">
          YouTube를 검색해 mp3/mp4로 변환하는 로컬·개인용 도구
        </p>
      </header>

      <SearchBar onSearch={runSearch} loading={search.status === 'loading'} />

      {search.status === 'loading' && <SearchSkeletons />}
      {search.status === 'empty' && <EmptyState />}
      {search.status === 'error' && (
        <ErrorBanner message={search.message} onRetry={() => runSearch(lastQueryRef.current)} />
      )}
      {search.status === 'success' && (
        <ResultsGrid videos={search.items} statuses={convertStatuses} onConvert={handleConvert} />
      )}
    </main>
  );
}

/** 검색 로딩 중 자리표시 그리드(정적 Skeleton — 펄스 금지). */
function SearchSkeletons() {
  return (
    <div className="grid grid-cols-1 gap-card sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col gap-inline rounded-card border border-border bg-surface p-card"
        >
          <Skeleton className="aspect-video w-full" />
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ))}
    </div>
  );
}
