import { describe, expect, it } from 'vitest';
import {
  IMDB_ID_REGEX,
  getImdbLtaNominationDeadlineTone,
  isImdbLtaNominationDeadlinePassed,
  lookupMovieQuerySchema,
  searchNominationsQuerySchema,
  submitRatingSchema,
} from './imdb-lta';

// Argentina is UTC-3 year-round, so 03:00Z is local midnight.
const art = (isoDate: string, time = '12:00:00') => new Date(`${isoDate}T${time}-03:00`);

describe('nomination deadline (Argentina time)', () => {
  it('is not passed during the last writable day, even late at night', () => {
    expect(isImdbLtaNominationDeadlinePassed(art('2026-10-21', '23:59:59'))).toBe(false);
  });

  it('is passed from local midnight of the next day', () => {
    expect(isImdbLtaNominationDeadlinePassed(art('2026-10-22', '00:00:00'))).toBe(true);
  });

  it('uses Argentina calendar date, not UTC (02:00Z on the 22nd is still the 21st in ART)', () => {
    expect(isImdbLtaNominationDeadlinePassed(new Date('2026-10-22T02:00:00Z'))).toBe(false);
  });

  it.each([
    ['2026-10-06', 'default'],
    ['2026-10-07', 'warning'],
    ['2026-10-13', 'warning'],
    ['2026-10-14', 'urgent'],
    ['2026-10-21', 'urgent'],
    ['2026-10-22', 'passed'],
  ])('tone on %s is %s', (day, tone) => {
    expect(getImdbLtaNominationDeadlineTone(art(day))).toBe(tone);
  });
});

describe('IMDB_ID_REGEX', () => {
  it.each(['tt1234567', 'tt12345678'])('accepts %s', (id) => {
    expect(IMDB_ID_REGEX.test(id)).toBe(true);
  });

  it.each(['tt123456', 'tt123456789', '1234567', 'nm1234567', ' tt1234567', 'tt1234567 '])(
    'rejects %p',
    (id) => {
      expect(IMDB_ID_REGEX.test(id)).toBe(false);
    }
  );
});

describe('query schemas', () => {
  it('lookupMovieQuerySchema trims and requires a non-empty query', () => {
    expect(lookupMovieQuerySchema.parse({ query: '  Heat  ' })).toEqual({ query: 'Heat' });
    expect(lookupMovieQuerySchema.safeParse({ query: '   ' }).success).toBe(false);
    expect(lookupMovieQuerySchema.safeParse({ query: 'x'.repeat(201) }).success).toBe(false);
  });

  it('searchNominationsQuerySchema requires at least 2 characters', () => {
    expect(searchNominationsQuerySchema.safeParse({ query: 'a' }).success).toBe(false);
    expect(searchNominationsQuerySchema.safeParse({ query: 'ab' }).success).toBe(true);
  });
});

describe('submitRatingSchema', () => {
  it.each([0, 5, 10])('accepts score %d', (score) => {
    expect(submitRatingSchema.safeParse({ movieId: 1, score }).success).toBe(true);
  });

  it.each([-1, 11, 5.5])('rejects score %d', (score) => {
    expect(submitRatingSchema.safeParse({ movieId: 1, score }).success).toBe(false);
  });

  it.each([0, -1, 1.5])('rejects movieId %d', (movieId) => {
    expect(submitRatingSchema.safeParse({ movieId, score: 5 }).success).toBe(false);
  });
});
