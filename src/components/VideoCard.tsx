'use client';

import { useState } from 'react';
import type { VideoResult, ConvertFormat } from '@/types';
import { Spinner } from './Spinner';

/** 카드별 변환 진행 상태(부모가 소유, 카드는 표시·콜백만). */
export type ConvertStatus = 'idle' | 'loading' | 'error';

type VideoCardProps = {
  video: VideoResult;
  convertStatus: ConvertStatus;
  /** 선택한 포맷으로 변환을 요청한다(다운로드 흐름은 부모가 담당). */
  onConvert: (videoId: string, format: ConvertFormat, title: string) => void;
};

const FORMATS: readonly ConvertFormat[] = ['mp3', 'mp4'];

export function VideoCard({ video, convertStatus, onConvert }: VideoCardProps) {
  const [format, setFormat] = useState<ConvertFormat>('mp3');
  const [thumbFailed, setThumbFailed] = useState(false);

  const loading = convertStatus === 'loading';

  function handleConvert() {
    onConvert(video.videoId, format, video.title);
  }

  return (
    <article className="flex flex-col gap-inline rounded-card border border-border bg-surface p-card shadow-elevation-1">
      <div className="aspect-video overflow-hidden rounded-md bg-surface-raised">
        {thumbFailed ? (
          <div
            data-testid="thumb-placeholder"
            className="flex size-full items-center justify-center text-text-disabled"
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="size-8">
              <path
                d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
                stroke="currentColor"
                strokeWidth={1.5}
              />
              <path
                d="m3 16 5-5 4 4 3-3 6 6"
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element -- onError fallback 필요, next/image 미사용 */
          <img
            data-testid="thumb"
            src={video.thumbnailUrl}
            alt=""
            onError={() => setThumbFailed(true)}
            className="size-full object-cover"
          />
        )}
      </div>

      <h3 className="text-heading text-text line-clamp-2" title={video.title}>
        {video.title}
      </h3>
      <p className="text-body-sm text-text-muted">{video.channelTitle}</p>

      <div className="flex items-center gap-inline">
        <div role="group" aria-label="변환 포맷" className="flex gap-1">
          {FORMATS.map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={format === f}
              disabled={loading}
              onClick={() => setFormat(f)}
              className={`h-9 rounded-button px-3 text-caption disabled:opacity-50 ${
                format === f
                  ? 'bg-accent text-accent-fg'
                  : 'border border-border text-text-muted hover:text-text-secondary'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={handleConvert}
          disabled={loading}
          className="ml-auto inline-flex h-9 items-center gap-inline rounded-button bg-accent px-4 text-accent-fg hover:bg-accent-hover disabled:opacity-50"
        >
          {loading && <Spinner label="변환 중" />}
          변환
        </button>
      </div>

      {convertStatus === 'error' && (
        <div role="alert" className="flex items-center gap-inline text-body-sm text-error">
          <span>변환에 실패했습니다.</span>
          <button
            type="button"
            onClick={handleConvert}
            className="rounded-button text-text-muted underline hover:text-text-secondary"
          >
            다시 시도
          </button>
        </div>
      )}
    </article>
  );
}
