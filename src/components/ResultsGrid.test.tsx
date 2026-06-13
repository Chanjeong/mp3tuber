import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ResultsGrid } from './ResultsGrid';
import type { VideoResult } from '@/types';

const VIDEOS: VideoResult[] = [
  {
    videoId: 'aaaaaaaaaaa',
    title: 'First',
    channelTitle: 'C1',
    thumbnailUrl: 'http://x/1.jpg',
    publishedAt: '2022-01-01T00:00:00Z',
  },
  {
    videoId: 'bbbbbbbbbbb',
    title: 'Second',
    channelTitle: 'C2',
    thumbnailUrl: 'http://x/2.jpg',
    publishedAt: '2022-01-02T00:00:00Z',
  },
];

describe('ResultsGrid', () => {
  it('renders one card per video', () => {
    render(<ResultsGrid videos={VIDEOS} statuses={{}} onConvert={vi.fn()} />);
    expect(screen.getByText('First')).toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: '변환' })).toHaveLength(2);
  });

  it('passes per-video convert status to the matching card', () => {
    render(
      <ResultsGrid videos={VIDEOS} statuses={{ bbbbbbbbbbb: 'error' }} onConvert={vi.fn()} />
    );
    expect(screen.getAllByRole('alert')).toHaveLength(1);
  });
});
