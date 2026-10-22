import { describe, it, expect } from 'vitest';
import { normalizeFacebookDate } from '../src/utils/dateNormalizer.js';

describe('normalizeFacebookDate', () => {
  const referenceTime = new Date('2026-10-22T14:00:00Z');

  it('normalizes relative minutes ago', () => {
    const result = normalizeFacebookDate('45 minutes ago', referenceTime);
    expect(result).toMatch(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2} (AM|PM)$/);
    const resultShorthand = normalizeFacebookDate('30m', referenceTime);
    expect(resultShorthand).toMatch(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2} (AM|PM)$/);
  });

  it('normalizes relative hours ago', () => {
    const result = normalizeFacebookDate('3 hours ago', referenceTime);
    expect(result).toMatch(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2} (AM|PM)$/);
    const resultShorthand = normalizeFacebookDate('2h', referenceTime);
    expect(resultShorthand).toMatch(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2} (AM|PM)$/);
  });

  it('normalizes days ago and yesterday', () => {
    const resYesterday = normalizeFacebookDate('Yesterday', referenceTime);
    expect(resYesterday).toMatch(/^\d{2}\/\d{2}\/\d{4}/);

    const resDays = normalizeFacebookDate('2 days ago', referenceTime);
    expect(resDays).toMatch(/^\d{2}\/\d{2}\/\d{4}/);
  });

  it('normalizes "just now" and Tagalog equivalents', () => {
    const resNow = normalizeFacebookDate('just now', referenceTime);
    expect(resNow).toMatch(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2} (AM|PM)$/);

    const resTl = normalizeFacebookDate('ngayon lang', referenceTime);
    expect(resTl).toMatch(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2} (AM|PM)$/);
  });

  it('normalizes month date string formats', () => {
    const res = normalizeFacebookDate('October 20 at 3:15 PM', referenceTime);
    expect(res).toMatch(/^10\/20\/2026/);
  });

  it('falls back cleanly for empty, unknown, or unparseable input', () => {
    expect(normalizeFacebookDate('')).toBe('Unknown');
    expect(normalizeFacebookDate(null)).toBe('Unknown');
    expect(normalizeFacebookDate('Unknown')).toBe('Unknown');
    expect(normalizeFacebookDate('Some unusual string')).toBe('Some unusual string');
  });
});
