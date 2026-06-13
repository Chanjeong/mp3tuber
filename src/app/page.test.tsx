import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Home from './page';
import type { VideoResult } from '@/types';

type User = ReturnType<typeof userEvent.setup>;

const ITEMS: VideoResult[] = [
  {
    videoId: 'jfKfPfyJRdk',
    title: 'lofi',
    channelTitle: 'Lofi Girl',
    thumbnailUrl: 'http://x/1.jpg',
    publishedAt: '2022-07-12T12:00:00Z',
  },
];

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
    ...init,
  });
}

async function doSearch(user: User, query = 'lofi') {
  await user.type(screen.getByRole('searchbox'), query);
  await user.click(screen.getByRole('button', { name: /검색/ }));
}

describe('Home page', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('searches and renders result cards', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ items: ITEMS }));
    vi.stubGlobal('fetch', fetchMock);
    render(<Home />);

    await doSearch(user);

    expect(await screen.findByText('lofi')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/search?q=lofi&maxResults=12'),
      expect.anything()
    );
  });

  it('shows the empty state when there are no results', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ items: [] })));
    render(<Home />);

    await doSearch(user, 'zzz');

    expect(await screen.findByText(/검색 결과가 없습니다/)).toBeInTheDocument();
  });

  it('shows an error banner with a working retry on search failure', async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        jsonResponse({ error: { code: 'UPSTREAM_ERROR', message: '상위 오류' } }, { status: 502 })
      );
    vi.stubGlobal('fetch', fetchMock);
    render(<Home />);

    await doSearch(user);
    expect(await screen.findByRole('alert')).toHaveTextContent('상위 오류');

    fetchMock.mockResolvedValueOnce(jsonResponse({ items: ITEMS }));
    await user.click(screen.getByRole('button', { name: /다시 시도/ }));
    expect(await screen.findByText('lofi')).toBeInTheDocument();
  });

  it('converts a card: fetches convert, downloads the blob, revokes the url', async () => {
    const user = userEvent.setup();
    const blob = new Blob(['audio'], { type: 'audio/mpeg' });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ items: ITEMS }))
      .mockResolvedValueOnce(
        new Response(blob, { status: 200, headers: { 'content-type': 'audio/mpeg' } })
      );
    vi.stubGlobal('fetch', fetchMock);

    const createObjectURL = vi.fn(() => 'blob:mock');
    const revokeObjectURL = vi.fn();
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = revokeObjectURL;
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    render(<Home />);
    await doSearch(user);
    await screen.findByText('lofi');

    await user.click(screen.getByRole('button', { name: '변환' }));

    await waitFor(() => expect(createObjectURL).toHaveBeenCalled());
    expect(clickSpy).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock');
    expect(fetchMock).toHaveBeenLastCalledWith(
      expect.stringContaining('/api/convert?videoId=jfKfPfyJRdk&format=mp3&title=lofi')
    );
  });

  it('shows an inline card error when convert fails', async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ items: ITEMS }))
      .mockResolvedValueOnce(
        jsonResponse({ error: { code: 'CONVERSION_FAILED', message: '실패' } }, { status: 500 })
      );
    vi.stubGlobal('fetch', fetchMock);
    render(<Home />);

    await doSearch(user);
    await screen.findByText('lofi');

    await user.click(screen.getByRole('button', { name: '변환' }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });
});
