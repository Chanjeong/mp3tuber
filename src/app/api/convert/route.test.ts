import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Readable } from 'node:stream';
import { ConvertError } from '@/lib/convert';

// lib/convert·fs를 모킹해 실제 변환/디스크 없이 라우트의 검증·헤더·정리만 검증한다.
// ConvertError(라우트가 code를 읽음)는 실제 구현을 유지한다.
vi.mock('@/lib/convert', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/convert')>();
  return { ...actual, convertToFile: vi.fn() };
});
// Node builtin은 default export 인터롭이 필요 — named/default가 같은 스파이를 가리키게 한다.
vi.mock('node:fs/promises', () => {
  const stat = vi.fn();
  const rm = vi.fn();
  return { stat, rm, default: { stat, rm } };
});
vi.mock('node:fs', () => {
  const createReadStream = vi.fn();
  return { createReadStream, default: { createReadStream } };
});

import { convertToFile } from '@/lib/convert';
import { stat, rm } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import * as route from './route';

const mockedConvert = vi.mocked(convertToFile);
const mockedStat = vi.mocked(stat);
const mockedRm = vi.mocked(rm);
const mockedCreateReadStream = vi.mocked(createReadStream);

const TMP = '/tmp/jfKfPfyJRdk-abc123.mp3';
const VID = 'jfKfPfyJRdk';

function GET(url: string, init?: RequestInit) {
  return route.GET(new Request(url, init));
}

// createReadStream가 돌려줄 실제 Readable(닫힐 때 정리 트리거를 검증할 수 있게).
function fakeFileStream(bytes = 'audio-bytes') {
  return Readable.from([Buffer.from(bytes)]) as unknown as ReturnType<typeof createReadStream>;
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('GET /api/convert', () => {
  beforeEach(() => {
    mockedConvert.mockReset();
    mockedStat.mockReset();
    mockedRm.mockReset();
    mockedCreateReadStream.mockReset();
    mockedRm.mockResolvedValue(undefined);
    mockedStat.mockResolvedValue({ size: 12345 } as Awaited<ReturnType<typeof stat>>);
    mockedCreateReadStream.mockReturnValue(fakeFileStream());
  });

  it('returns 400 INVALID_VIDEO_ID for a malformed id', async () => {
    const res = await GET('http://localhost/api/convert?videoId=bad&format=mp3');
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe('INVALID_VIDEO_ID');
    expect(mockedConvert).not.toHaveBeenCalled();
  });

  it('returns 400 INVALID_FORMAT for an unsupported format', async () => {
    const res = await GET(`http://localhost/api/convert?videoId=${VID}&format=wav`);
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe('INVALID_FORMAT');
    expect(mockedConvert).not.toHaveBeenCalled();
  });

  it('streams the file with audio/mpeg + attachment headers on mp3 success', async () => {
    mockedConvert.mockResolvedValue(TMP);

    const res = await GET(
      `http://localhost/api/convert?videoId=${VID}&format=mp3&title=lofi%20radio`,
    );

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('audio/mpeg');
    expect(res.headers.get('content-length')).toBe('12345');
    const cd = res.headers.get('content-disposition') ?? '';
    expect(cd).toMatch(/^attachment; filename\*=UTF-8''/);
    expect(cd).toContain('lofi'); // sanitize된 제목이 인코딩되어 포함

    // 본문이 실제 변환 파일 바이트로 스트리밍된다.
    const body = Buffer.from(await res.arrayBuffer()).toString();
    expect(body).toBe('audio-bytes');

    // videoId 검증 통과값 + 요청 signal이 변환기로 전달된다.
    expect(mockedConvert).toHaveBeenCalledWith(
      expect.objectContaining({ videoId: VID, format: 'mp3', signal: expect.anything() }),
    );
  });

  it('uses video/mp4 content-type for mp4', async () => {
    mockedConvert.mockResolvedValue('/tmp/jfKfPfyJRdk-abc.mp4');

    const res = await GET(`http://localhost/api/convert?videoId=${VID}&format=mp4`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('video/mp4');
    await res.arrayBuffer();
  });

  it('deletes the temp file after the stream is consumed', async () => {
    mockedConvert.mockResolvedValue(TMP);

    const res = await GET(`http://localhost/api/convert?videoId=${VID}&format=mp3`);
    await res.arrayBuffer(); // 스트림 소진 → close → 정리
    await tick();

    expect(mockedRm).toHaveBeenCalledWith(TMP, expect.objectContaining({ force: true }));
  });

  it('returns 404 VIDEO_UNAVAILABLE when the video cannot be accessed', async () => {
    mockedConvert.mockRejectedValue(new ConvertError('VIDEO_UNAVAILABLE', 'unavailable'));

    const res = await GET(`http://localhost/api/convert?videoId=${VID}&format=mp3`);
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe('VIDEO_UNAVAILABLE');
  });

  it('returns 500 CONVERTER_UNAVAILABLE when the binary is missing', async () => {
    mockedConvert.mockRejectedValue(new ConvertError('CONVERTER_UNAVAILABLE', 'no binary'));

    const res = await GET(`http://localhost/api/convert?videoId=${VID}&format=mp3`);
    expect(res.status).toBe(500);
    expect((await res.json()).error.code).toBe('CONVERTER_UNAVAILABLE');
  });

  it('returns 500 CONVERSION_FAILED on conversion/timeout failure', async () => {
    mockedConvert.mockRejectedValue(new ConvertError('CONVERSION_FAILED', 'boom'));

    const res = await GET(`http://localhost/api/convert?videoId=${VID}&format=mp3`);
    expect(res.status).toBe(500);
    expect((await res.json()).error.code).toBe('CONVERSION_FAILED');
  });

  it('cleans up the temp file and maps unexpected post-convert errors to CONVERSION_FAILED', async () => {
    mockedConvert.mockResolvedValue(TMP);
    mockedStat.mockRejectedValue(new Error('stat failed')); // 변환은 됐지만 후속 처리 실패

    const res = await GET(`http://localhost/api/convert?videoId=${VID}&format=mp3`);
    expect(res.status).toBe(500);
    expect((await res.json()).error.code).toBe('CONVERSION_FAILED');
    // 스트리밍 못 했어도 temp는 정리된다.
    expect(mockedRm).toHaveBeenCalledWith(TMP, expect.objectContaining({ force: true }));
  });

  it('exposes only GET (other methods → framework 405)', () => {
    expect(typeof route.GET).toBe('function');
    expect((route as Record<string, unknown>).POST).toBeUndefined();
    expect((route as Record<string, unknown>).PUT).toBeUndefined();
    expect((route as Record<string, unknown>).DELETE).toBeUndefined();
  });
});
