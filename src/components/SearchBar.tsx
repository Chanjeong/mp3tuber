'use client';

import { useState, type FormEvent } from 'react';
import { Spinner } from './Spinner';

type SearchBarProps = {
  /** trim된 비어있지 않은 검색어로만 호출된다. */
  onSearch: (query: string) => void;
  /** 진행 중이면 제출을 막아 중복 호출을 방지한다. */
  loading?: boolean;
};

export function SearchBar({ onSearch, loading = false }: SearchBarProps) {
  const [value, setValue] = useState('');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (loading) return; // 중복 제출 방지
    const q = value.trim();
    if (!q) return; // 빈 입력 차단
    onSearch(q);
  }

  return (
    <form role="search" onSubmit={handleSubmit} className="flex gap-inline">
      <input
        type="search"
        aria-label="검색어"
        placeholder="YouTube 검색…"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="h-9 flex-1 rounded-input border border-border bg-surface-raised px-3 text-text placeholder:text-text-muted focus:border-border-strong focus:outline-none"
      />
      <button
        type="submit"
        disabled={loading}
        className="inline-flex h-9 items-center gap-inline rounded-button bg-accent px-4 text-accent-fg hover:bg-accent-hover disabled:opacity-50"
      >
        {loading && <Spinner label="검색 중" />}
        검색
      </button>
    </form>
  );
}
