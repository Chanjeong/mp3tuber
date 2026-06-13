import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SearchServiceError } from '@/services/youtube';

// 서비스를 모킹해 네트워크 없이 라우트의 검증·에러 매핑만 검증한다.
// SearchServiceError(라우트가 code를 읽음)는 실제 구현을 유지한다.
vi.mock('@/services/youtube', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/youtube')>();
  return { ...actual, searchVideos: vi.fn() };
});

import { searchVideos } from '@/services/youtube';
import * as route from './route';

const mockedSearch = vi.mocked(searchVideos);

function GET(url: string) {
  return route.GET(new Request(url));
}

const SAMPLE = [
  {
    videoId: 'jfKfPfyJRdk',
    title: 'lofi',
    channelTitle: 'Lofi Girl',
    thumbnailUrl: 'https://i.ytimg.com/vi/jfKfPfyJRdk/mqdefault.jpg',
    publishedAt: '2022-07-12T12:00:00Z',
  },
];

describe('GET /api/search', () => {
  beforeEach(() => {
    mockedSearch.mockReset();
  });

  it('returns 200 with items on success', async () => {
    mockedSearch.mockResolvedValue(SAMPLE);

    const res = await GET('http://localhost/api/search?q=lofi&maxResults=12');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ items: SAMPLE });
    expect(mockedSearch).toHaveBeenCalledWith('lofi', 12);
  });

  it('returns 200 with empty items for no results', async () => {
    mockedSearch.mockResolvedValue([]);

    const res = await GET('http://localhost/api/search?q=zzz');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ items: [] });
    expect(mockedSearch).toHaveBeenCalledWith('zzz', 12); // 기본 maxResults
  });

  it('returns 400 MISSING_QUERY for blank q', async () => {
    const res = await GET('http://localhost/api/search?q=%20%20');
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe('MISSING_QUERY');
    expect(mockedSearch).not.toHaveBeenCalled();
  });

  it('returns 400 INVALID_MAX_RESULTS for out-of-range maxResults', async () => {
    const res = await GET('http://localhost/api/search?q=lofi&maxResults=99');
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe('INVALID_MAX_RESULTS');
    expect(mockedSearch).not.toHaveBeenCalled();
  });

  it('returns 500 CONFIG_ERROR when the service reports missing key', async () => {
    mockedSearch.mockRejectedValue(new SearchServiceError('CONFIG_ERROR', 'config'));

    const res = await GET('http://localhost/api/search?q=lofi');
    expect(res.status).toBe(500);
    expect((await res.json()).error.code).toBe('CONFIG_ERROR');
  });

  it('returns 503 QUOTA_EXCEEDED', async () => {
    mockedSearch.mockRejectedValue(new SearchServiceError('QUOTA_EXCEEDED', 'quota'));

    const res = await GET('http://localhost/api/search?q=lofi');
    expect(res.status).toBe(503);
    expect((await res.json()).error.code).toBe('QUOTA_EXCEEDED');
  });

  it('returns 502 UPSTREAM_ERROR', async () => {
    mockedSearch.mockRejectedValue(new SearchServiceError('UPSTREAM_ERROR', 'upstream'));

    const res = await GET('http://localhost/api/search?q=lofi');
    expect(res.status).toBe(502);
    expect((await res.json()).error.code).toBe('UPSTREAM_ERROR');
  });

  it('maps unexpected (non-service) errors to 502 UPSTREAM_ERROR', async () => {
    mockedSearch.mockRejectedValue(new Error('boom'));

    const res = await GET('http://localhost/api/search?q=lofi');
    expect(res.status).toBe(502);
    expect((await res.json()).error.code).toBe('UPSTREAM_ERROR');
  });

  it('does not leak the API key in any response body', async () => {
    process.env.YOUTUBE_API_KEY = 'super-secret-key';
    mockedSearch.mockResolvedValue(SAMPLE);

    const res = await GET('http://localhost/api/search?q=lofi');
    const text = JSON.stringify(await res.json());
    expect(text).not.toContain('super-secret-key');
    delete process.env.YOUTUBE_API_KEY;
  });

  it('exposes only GET (other methods → framework 405)', () => {
    expect(typeof route.GET).toBe('function');
    expect((route as Record<string, unknown>).POST).toBeUndefined();
    expect((route as Record<string, unknown>).PUT).toBeUndefined();
    expect((route as Record<string, unknown>).DELETE).toBeUndefined();
  });
});
