import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { VideoCard } from './VideoCard';
import type { VideoResult } from '@/types';

const VIDEO: VideoResult = {
  videoId: 'jfKfPfyJRdk',
  title: 'lofi hip hop radio 📚 beats to relax/study to',
  channelTitle: 'Lofi Girl',
  thumbnailUrl: 'https://i.ytimg.com/vi/jfKfPfyJRdk/mqdefault.jpg',
  publishedAt: '2022-07-12T12:00:00Z',
};

function renderCard(props: Partial<ComponentProps<typeof VideoCard>> = {}) {
  const onConvert = vi.fn();
  render(<VideoCard video={VIDEO} convertStatus="idle" onConvert={onConvert} {...props} />);
  return { onConvert };
}

describe('VideoCard', () => {
  it('renders thumbnail, title and channel', () => {
    renderCard();
    expect(screen.getByText(VIDEO.title)).toBeInTheDocument();
    expect(screen.getByText(VIDEO.channelTitle)).toBeInTheDocument();
    const img = screen.getByTestId('thumb');
    expect(img.tagName).toBe('IMG');
    expect(img).toHaveAttribute('src', VIDEO.thumbnailUrl);
  });

  it('defaults to mp3 and toggles to mp4', async () => {
    const user = userEvent.setup();
    renderCard();

    const mp3 = screen.getByRole('button', { name: 'mp3' });
    const mp4 = screen.getByRole('button', { name: 'mp4' });
    expect(mp3).toHaveAttribute('aria-pressed', 'true');
    expect(mp4).toHaveAttribute('aria-pressed', 'false');

    await user.click(mp4);
    expect(mp4).toHaveAttribute('aria-pressed', 'true');
    expect(mp3).toHaveAttribute('aria-pressed', 'false');
  });

  it('calls onConvert with the selected format on convert click', async () => {
    const user = userEvent.setup();
    const { onConvert } = renderCard();

    await user.click(screen.getByRole('button', { name: 'mp4' }));
    await user.click(screen.getByRole('button', { name: '변환' }));

    expect(onConvert).toHaveBeenCalledTimes(1);
    expect(onConvert).toHaveBeenCalledWith(VIDEO.videoId, 'mp4', VIDEO.title);
  });

  it('disables the convert button and shows a spinner while loading', () => {
    renderCard({ convertStatus: 'loading' });
    expect(screen.getByRole('button', { name: /변환/ })).toBeDisabled();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('shows an inline error with a retry that re-invokes onConvert', async () => {
    const user = userEvent.setup();
    const { onConvert } = renderCard({ convertStatus: 'error' });

    expect(screen.getByRole('alert')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /다시 시도/ }));
    expect(onConvert).toHaveBeenCalledWith(VIDEO.videoId, 'mp3', VIDEO.title);
  });

  it('falls back to a placeholder when the thumbnail fails to load', () => {
    renderCard();
    fireEvent.error(screen.getByTestId('thumb'));
    expect(screen.queryByTestId('thumb')).not.toBeInTheDocument();
    expect(screen.getByTestId('thumb-placeholder')).toBeInTheDocument();
  });

  it('truncates a long title', () => {
    renderCard();
    expect(screen.getByText(VIDEO.title).className).toMatch(/line-clamp|truncate/);
  });
});
