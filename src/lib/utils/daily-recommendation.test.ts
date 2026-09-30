import { describe, expect, it } from 'vitest';
import {
  getDailyContentType,
  getDateSeed,
  normalizeDateToUTC,
  selectFromArray,
} from './daily-recommendation';

describe('getDateSeed', () => {
  it('is deterministic for the same UTC day regardless of time', () => {
    const morning = new Date('2026-03-05T01:00:00Z');
    const evening = new Date('2026-03-05T23:59:59Z');
    expect(getDateSeed(morning)).toBe(getDateSeed(evening));
  });

  it('sums the char codes of the YYYY-MM-DD string', () => {
    const expected = [...'2026-03-05'].reduce((a, c) => a + c.charCodeAt(0), 0);
    expect(getDateSeed(new Date('2026-03-05T12:00:00Z'))).toBe(expected);
  });
});

describe('getDailyContentType', () => {
  it('rotates movie -> list -> participant by seed % 3', () => {
    expect(getDailyContentType(0)).toBe('movie');
    expect(getDailyContentType(1)).toBe('list');
    expect(getDailyContentType(2)).toBe('participant');
    expect(getDailyContentType(3)).toBe('movie');
  });
});

describe('selectFromArray', () => {
  it('selects by seed modulo length', () => {
    expect(selectFromArray(['a', 'b', 'c'], 4)).toBe('b');
    expect(selectFromArray(['a', 'b', 'c'], 3)).toBe('a');
  });

  it('throws on an empty array', () => {
    expect(() => selectFromArray([], 1)).toThrow('Cannot select from empty array');
  });
});

describe('normalizeDateToUTC', () => {
  it('resets time to UTC midnight without mutating the input', () => {
    const input = new Date('2026-03-05T15:45:30.123Z');
    const result = normalizeDateToUTC(input);
    expect(result.toISOString()).toBe('2026-03-05T00:00:00.000Z');
    expect(input.toISOString()).toBe('2026-03-05T15:45:30.123Z');
  });
});
