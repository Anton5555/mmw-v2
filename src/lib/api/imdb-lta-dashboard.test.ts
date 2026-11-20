import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db', () => ({ prisma: {} }));

import {
  summarizeDashboard,
  type DashboardMeta,
} from '@/lib/api/imdb-lta-dashboard';
import type { CandidateMovieStats } from '@/lib/api/imdb-lta';

const NOW = new Date('2026-11-20T12:00:00Z'); // Friday

function movie(
  id: number,
  overrides: Partial<CandidateMovieStats> = {}
): CandidateMovieStats {
  return {
    id,
    title: `Movie ${id}`,
    originalTitle: `Movie ${id}`,
    originalLanguage: 'en',
    releaseDate: new Date('1995-06-01T00:00:00Z'),
    posterUrl: '',
    imdbId: `tt${id}`,
    tmdbId: id,
    nominationCount: 1,
    ratingCount: 0,
    averageScore: null,
    userNominated: false,
    userScore: null,
    batchState: 'released',
    userSkipped: false,
    wantToWatchAt: null,
    userWantToWatch: false,
    ...overrides,
  } as CandidateMovieStats;
}

function meta(overrides: Partial<DashboardMeta> = {}): DashboardMeta {
  return {
    batchMovies: [],
    genres: [],
    countries: [],
    myRatingDates: [],
    ...overrides,
  };
}

describe('summarizeDashboard', () => {
  it('excludes locked movies and includes open-lote movies', () => {
    const stats = summarizeDashboard(
      [
        movie(1, { userScore: 8 }),
        movie(2, { batchState: 'open', userScore: 6 }),
        movie(3, { batchState: 'locked', userScore: 2 }),
      ],
      meta(),
      NOW
    );
    expect(stats.inScopeCount).toBe(2);
    expect(stats.scoredCount).toBe(2);
    expect(stats.scoreHistogram[2]).toBe(0);
    expect(stats.myAverage).toBe(7);
  });

  it('counts a re-queued movie in every lote it appeared in', () => {
    const stats = summarizeDashboard(
      [movie(1, { userScore: 7 }), movie(2), movie(3, { batchState: 'open', userScore: 5 })],
      meta({
        batchMovies: [
          { movieId: 1, batch: { number: 1, status: 'CLOSED' } },
          { movieId: 2, batch: { number: 1, status: 'CLOSED' } },
          { movieId: 2, batch: { number: 2, status: 'CLOSED' } },
          { movieId: 3, batch: { number: 3, status: 'OPEN' } },
        ],
      }),
      NOW
    );
    expect(stats.lotes).toEqual([
      { number: 1, isOpen: false, movieCount: 2, watchedCount: 1, complete: false },
      { number: 2, isOpen: false, movieCount: 1, watchedCount: 0, complete: false },
      { number: 3, isOpen: true, movieCount: 1, watchedCount: 1, complete: true },
    ]);
    expect(stats.completedLotes).toBe(1);
  });

  it('builds the own-score histogram, average and most used score', () => {
    const stats = summarizeDashboard(
      [
        movie(1, { userScore: 8 }),
        movie(2, { userScore: 8 }),
        movie(3, { userScore: 5 }),
        movie(4, { userSkipped: true }),
      ],
      meta(),
      NOW
    );
    expect(stats.scoreHistogram).toEqual([0, 0, 0, 0, 0, 1, 0, 0, 2, 0, 0]);
    expect(stats.myAverage).toBe(7);
    expect(stats.mostUsedScore).toBe(8);
    expect(stats.notSeenCount).toBe(1);
  });

  it('hides the bucket average below three own scores', () => {
    const stats = summarizeDashboard(
      [
        movie(1, { userScore: 8, releaseDate: new Date('1972-01-01') }),
        movie(2, { userScore: 6, releaseDate: new Date('1975-01-01') }),
        movie(3, { userScore: 9, releaseDate: new Date('2001-01-01') }),
        movie(4, { userScore: 7, releaseDate: new Date('2003-01-01') }),
        movie(5, { userScore: 5, releaseDate: new Date('2008-01-01') }),
      ],
      meta(),
      NOW
    );
    expect(stats.byDecade).toEqual([
      { label: '1970s', releasedCount: 2, watchedCount: 2, myAverage: null },
      { label: '2000s', releasedCount: 3, watchedCount: 3, myAverage: 7 },
    ]);
  });

  it('sorts genres by count, never by score, and folds the tail into Otros', () => {
    const movies = Array.from({ length: 12 }, (_, i) =>
      movie(i + 1, { userScore: i % 2 === 0 ? 10 : 1 })
    );
    const genres = [
      // "Drama" has the most movies but the lowest scores.
      ...[2, 4, 6].map((movieId) => ({ movieId, name: 'Drama' })),
      ...[1, 3].map((movieId) => ({ movieId, name: 'Comedia' })),
      ...[5, 7, 8, 9, 10, 11, 12, 1, 2].map((movieId, i) => ({
        movieId,
        name: `G${i}`,
      })),
    ];
    const stats = summarizeDashboard(movies, meta({ genres }), NOW);
    expect(stats.byGenre[0].label).toBe('Drama');
    expect(stats.byGenre[1].label).toBe('Comedia');
    expect(stats.byGenre).toHaveLength(9);
    expect(stats.byGenre.at(-1)).toMatchObject({ label: 'Otros', myAverage: null });
    expect(stats.missingGenre).toBe(0);
  });

  it('labels countries in Spanish and counts movies without data', () => {
    const stats = summarizeDashboard(
      [movie(1), movie(2)],
      meta({ countries: [{ movieId: 1, code: 'US', name: 'United States of America' }] }),
      NOW
    );
    expect(stats.byCountry[0].label).toBe('Estados Unidos');
    expect(stats.missingCountry).toBe(1);
  });

  it('buckets own ratings into the last 12 weeks', () => {
    const stats = summarizeDashboard(
      [movie(1)],
      meta({
        myRatingDates: [
          new Date('2026-11-17T10:00:00Z'), // this week (Mon 16)
          new Date('2026-11-20T08:00:00Z'), // this week
          new Date('2026-11-15T23:00:00Z'), // last week (Sunday)
          new Date('2026-01-01T00:00:00Z'), // too old
        ],
      }),
      NOW
    );
    expect(stats.weekly).toHaveLength(12);
    expect(stats.thisWeekCount).toBe(2);
    expect(stats.weekly[10].count).toBe(1);
    expect(stats.weekly.reduce((s, w) => s + w.count, 0)).toBe(3);
  });

  it('ignores group data entirely (anti-bias guard)', () => {
    const base = [movie(1, { userScore: 7 }), movie(2, { userScore: 4 })];
    const withGroup = base.map((m, i) => ({
      ...m,
      averageScore: i === 0 ? 9.9 : 1.1,
      ratingCount: 50 + i,
      nominationCount: 9,
    }));
    const m = meta({
      genres: [
        { movieId: 1, name: 'Drama' },
        { movieId: 2, name: 'Drama' },
      ],
    });
    expect(summarizeDashboard(withGroup, m, NOW)).toEqual(
      summarizeDashboard(base, m, NOW)
    );
  });
});
