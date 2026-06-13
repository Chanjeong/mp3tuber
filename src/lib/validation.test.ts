import { describe, it, expect } from 'vitest';
import { isValidVideoId, parseFormat, parseMaxResults } from './validation';

describe('isValidVideoId', () => {
  it('accepts an exactly-11-char id with allowed chars', () => {
    expect(isValidVideoId('jfKfPfyJRdk')).toBe(true);
    expect(isValidVideoId('dQw4w9WgXcQ')).toBe(true);
    expect(isValidVideoId('A_b-0123456')).toBe(true); // underscore + hyphen
  });

  it('rejects ids that are not 11 chars', () => {
    expect(isValidVideoId('jfKfPfyJRd')).toBe(false); // 10
    expect(isValidVideoId('jfKfPfyJRdkk')).toBe(false); // 12
    expect(isValidVideoId('')).toBe(false);
  });

  it('rejects ids with forbidden characters', () => {
    expect(isValidVideoId('jfKfPfyJRd ')).toBe(false); // space
    expect(isValidVideoId('jfKfPfyJR/k')).toBe(false); // slash
    expect(isValidVideoId('jfKfPfyJR.k')).toBe(false); // dot
    expect(isValidVideoId('jfKfPfyJR!k')).toBe(false); // bang
    expect(isValidVideoId('한국어동영상아이')).toBe(false); // non-ascii (11 chars but disallowed)
  });

  it('rejects non-string-ish inputs safely', () => {
    expect(isValidVideoId(null)).toBe(false);
    expect(isValidVideoId(undefined)).toBe(false);
  });
});

describe('parseFormat', () => {
  it('accepts mp3 and mp4', () => {
    expect(parseFormat('mp3')).toBe('mp3');
    expect(parseFormat('mp4')).toBe('mp4');
  });

  it('normalizes case to lowercase', () => {
    expect(parseFormat('MP3')).toBe('mp3');
    expect(parseFormat('Mp4')).toBe('mp4');
  });

  it('trims surrounding whitespace', () => {
    expect(parseFormat(' mp3 ')).toBe('mp3');
  });

  it('returns null for unsupported formats', () => {
    expect(parseFormat('wav')).toBeNull();
    expect(parseFormat('webm')).toBeNull();
    expect(parseFormat('')).toBeNull();
    expect(parseFormat(null)).toBeNull();
    expect(parseFormat(undefined)).toBeNull();
  });
});

describe('parseMaxResults', () => {
  it('defaults to 12 when missing', () => {
    expect(parseMaxResults(null)).toBe(12);
    expect(parseMaxResults(undefined)).toBe(12);
    expect(parseMaxResults('')).toBe(12);
    expect(parseMaxResults('  ')).toBe(12);
  });

  it('accepts integers within 1..50', () => {
    expect(parseMaxResults('1')).toBe(1);
    expect(parseMaxResults('12')).toBe(12);
    expect(parseMaxResults('50')).toBe(50);
  });

  it('returns null for out-of-range values', () => {
    expect(parseMaxResults('0')).toBeNull();
    expect(parseMaxResults('51')).toBeNull();
    expect(parseMaxResults('-1')).toBeNull();
  });

  it('returns null for non-integer / non-numeric values', () => {
    expect(parseMaxResults('abc')).toBeNull();
    expect(parseMaxResults('12.5')).toBeNull();
    expect(parseMaxResults('12abc')).toBeNull();
    expect(parseMaxResults('NaN')).toBeNull();
  });
});
