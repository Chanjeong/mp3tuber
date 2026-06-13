import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { searchVideos, SearchServiceError } from './youtube';
import sample from '@/test/fixtures/search.sample.json';

// fetch 모킹으로 실제 네트워크 없이 HTTP 경계를 검증한다.
function mockFetchOnce(body: unknown, init?: { ok?: boolean; status?: number }) {
  const ok = init?.ok ?? true;
  const status = init?.status ?? 200;
  return vi.fn().mockResolvedValue({
    ok,
    status,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response);
}

describe('searchVideos', () => {
  beforeEach(() => {
    process.env.YOUTUBE_API_KEY = 'test-key';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    delete process.env.YOUTUBE_API_KEY;
  });

  it('maps id/title/channel/thumbnail/publishedAt and decodes HTML entities', async () => {
    vi.stubGlobal('fetch', mockFetchOnce(sample));

    const items = await searchVideos('lofi', 3);

    expect(items).toHaveLength(3);
    // 엔티티 디코딩: &amp;→& , &#39;→'
    expect(items[0]).toEqual({
      videoId: 'jfKfPfyJRdk',
      title: "lofi hip hop radio & chill 'beats'",
      channelTitle: 'Lofi Girl',
      thumbnailUrl: 'https://i.ytimg.com/vi/jfKfPfyJRdk/mqdefault.jpg', // medium 우선
      publishedAt: '2022-07-12T12:00:00Z',
    });
    // &lt;/&gt; 도 디코딩
    expect(items[2].title).toBe('Minimal <tag> title');
  });

  it('selects thumbnail by priority medium → high → default', async () => {
    vi.stubGlobal('fetch', mockFetchOnce(sample));

    const items = await searchVideos('lofi', 3);

    expect(items[0].thumbnailUrl).toContain('mqdefault.jpg'); // medium present
    expect(items[1].thumbnailUrl).toContain('hqdefault.jpg'); // no medium → high
    expect(items[2].thumbnailUrl).toContain('default.jpg'); // only default
  });

  it('calls search.list with type=video, q, maxResults and the server key', async () => {
    const fetchMock = mockFetchOnce(sample);
    vi.stubGlobal('fetch', fetchMock);

    await searchVideos('lo fi', 5);

    const calledUrl = String(fetchMock.mock.calls[0][0]);
    expect(calledUrl).toContain('type=video');
    expect(calledUrl).toContain('part=snippet');
    expect(calledUrl).toContain('maxResults=5');
    expect(calledUrl).toContain('q=lo+fi');
    expect(calledUrl).toContain('key=test-key');
  });

  it('returns [] for an empty result set', async () => {
    vi.stubGlobal('fetch', mockFetchOnce({ items: [] }));

    const items = await searchVideos('zzznoresults', 12);

    expect(items).toEqual([]);
  });

  it('throws QUOTA_EXCEEDED on 403', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetchOnce({ error: { errors: [{ reason: 'quotaExceeded' }] } }, { ok: false, status: 403 }),
    );

    await expect(searchVideos('lofi', 12)).rejects.toMatchObject({ code: 'QUOTA_EXCEEDED' });
  });

  it('throws UPSTREAM_ERROR on 5xx', async () => {
    vi.stubGlobal('fetch', mockFetchOnce({}, { ok: false, status: 500 }));

    await expect(searchVideos('lofi', 12)).rejects.toMatchObject({ code: 'UPSTREAM_ERROR' });
  });

  it('throws UPSTREAM_ERROR when the network call rejects', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNRESET')));

    await expect(searchVideos('lofi', 12)).rejects.toMatchObject({ code: 'UPSTREAM_ERROR' });
  });

  it('throws CONFIG_ERROR when the API key is not configured', async () => {
    delete process.env.YOUTUBE_API_KEY;
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(searchVideos('lofi', 12)).rejects.toBeInstanceOf(SearchServiceError);
    await expect(searchVideos('lofi', 12)).rejects.toMatchObject({ code: 'CONFIG_ERROR' });
    expect(fetchMock).not.toHaveBeenCalled(); // 키 없으면 외부 호출조차 안 함
  });
});
