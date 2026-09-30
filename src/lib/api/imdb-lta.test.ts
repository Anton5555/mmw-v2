import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({
  imdbLtaConfig: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  imdbLtaNominationList: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
    update: vi.fn(),
  },
  imdbLtaNomination: {
    count: vi.fn(),
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    delete: vi.fn(),
    groupBy: vi.fn(),
  },
  imdbLtaRating: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    groupBy: vi.fn(),
  },
  movie: { findUnique: vi.fn(), findMany: vi.fn() },
}));

const movies = vi.hoisted(() => ({
  findMovieByImdbId: vi.fn(),
  findOrCreateMovieByImdbId: vi.fn(),
  searchInternalMoviesByName: vi.fn(),
}));

vi.mock('@/lib/db', () => ({ prisma: db }));
vi.mock('@/lib/api/movies', () => movies);

import {
  addNomination,
  assertNominationPhaseOpen,
  canUserRateMovie,
  listOfficialRanking,
  listRateableCandidates,
  lookupMovie,
  removeNomination,
  submitNominations,
  submitRating,
} from './imdb-lta';

const setPhase = (phase: string) =>
  db.imdbLtaConfig.findUnique.mockResolvedValue({ id: 1, phase });

const uniqueViolation = () => Object.assign(new Error('unique'), { code: 'P2002' });

const card = (id: number, title: string) => ({
  id,
  title,
  originalTitle: title,
  originalLanguage: 'en',
  releaseDate: new Date('2000-01-01'),
  posterUrl: '',
  imdbId: `tt${String(id).padStart(7, '0')}`,
  tmdbId: id,
});

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-01T12:00:00-03:00'));
});

afterEach(() => {
  vi.useRealTimers();
  vi.resetAllMocks();
});

describe('assertNominationPhaseOpen', () => {
  it('passes while phase is NOMINATION_OPEN and before the deadline', async () => {
    setPhase('NOMINATION_OPEN');
    await expect(assertNominationPhaseOpen()).resolves.toBeUndefined();
  });

  it.each(['NOMINATION_CLOSED', 'RATING_OPEN', 'RATING_CLOSED'])(
    'throws when phase is %s',
    async (phase) => {
      setPhase(phase);
      await expect(assertNominationPhaseOpen()).rejects.toThrow(/nominaciones están cerradas/);
    }
  );

  it('throws after the Argentina-time deadline even if the phase is still open', async () => {
    setPhase('NOMINATION_OPEN');
    vi.setSystemTime(new Date('2026-10-22T00:00:00-03:00'));
    await expect(assertNominationPhaseOpen()).rejects.toThrow(/plazo de nominaciones terminó/);
  });

  it('creates the singleton config as NOMINATION_OPEN when missing', async () => {
    db.imdbLtaConfig.findUnique.mockResolvedValue(null);
    db.imdbLtaConfig.create.mockResolvedValue({ id: 1, phase: 'NOMINATION_OPEN' });
    await assertNominationPhaseOpen();
    expect(db.imdbLtaConfig.create).toHaveBeenCalledWith({
      data: { id: 1, phase: 'NOMINATION_OPEN' },
    });
  });
});

describe('lookupMovie', () => {
  it('returns an internal match for an IMDb id without hitting TMDB', async () => {
    movies.findMovieByImdbId.mockResolvedValue(card(1, 'Heat'));
    const result = await lookupMovie(' tt0000001 ');
    expect(result).toEqual({ status: 'found', movie: card(1, 'Heat') });
    expect(movies.findOrCreateMovieByImdbId).not.toHaveBeenCalled();
  });

  it('falls back to creating from TMDB when the IMDb id is unknown', async () => {
    movies.findMovieByImdbId.mockResolvedValue(null);
    movies.findOrCreateMovieByImdbId.mockResolvedValue(card(2, 'Ronin'));
    await expect(lookupMovie('tt0000002')).resolves.toMatchObject({ status: 'found' });
  });

  it('returns not_found when TMDB creation fails', async () => {
    movies.findMovieByImdbId.mockResolvedValue(null);
    movies.findOrCreateMovieByImdbId.mockRejectedValue(new Error('nope'));
    await expect(lookupMovie('tt0000003')).resolves.toMatchObject({ status: 'not_found' });
  });

  it('asks for an IMDb id when a name search finds nothing', async () => {
    movies.searchInternalMoviesByName.mockResolvedValue([]);
    await expect(lookupMovie('Unknown')).resolves.toMatchObject({ status: 'need_imdb_id' });
  });

  it('collapses multiple matches to the single exact title match (case-insensitive)', async () => {
    movies.searchInternalMoviesByName.mockResolvedValue([
      card(1, 'Heat'),
      card(2, 'Heat Wave'),
    ]);
    await expect(lookupMovie('heat')).resolves.toEqual({
      status: 'found',
      movie: card(1, 'Heat'),
    });
  });

  it('returns multiple when there is no unique exact match', async () => {
    const found = [card(1, 'Heat Wave'), card(2, 'Heat Rays')];
    movies.searchInternalMoviesByName.mockResolvedValue(found);
    await expect(lookupMovie('heat')).resolves.toEqual({ status: 'multiple', movies: found });
  });
});

describe('addNomination', () => {
  beforeEach(() => {
    setPhase('NOMINATION_OPEN');
    db.movie.findUnique.mockResolvedValue(card(7, 'Alien'));
    db.imdbLtaNominationList.upsert.mockResolvedValue({ id: 10 });
    db.imdbLtaNomination.count.mockResolvedValue(3);
  });

  it('creates the nomination and reports the new count', async () => {
    db.imdbLtaNomination.create.mockResolvedValue({ id: 99, createdAt: new Date() });
    const result = await addNomination('u1', 7);
    expect(result.count).toBe(4);
    expect(result.nominationId).toBe(99);
    expect(db.imdbLtaNomination.create).toHaveBeenCalledWith({
      data: { listId: 10, userId: 'u1', movieId: 7 },
    });
  });

  it('rejects unknown movies', async () => {
    db.movie.findUnique.mockResolvedValue(null);
    await expect(addNomination('u1', 7)).rejects.toThrow('Película no encontrada');
  });

  it('rejects when the 50-movie cap is reached', async () => {
    db.imdbLtaNomination.count.mockResolvedValue(50);
    await expect(addNomination('u1', 7)).rejects.toThrow(/máximo de 50/);
    expect(db.imdbLtaNomination.create).not.toHaveBeenCalled();
  });

  it('maps a unique-constraint violation to a friendly duplicate error', async () => {
    db.imdbLtaNomination.create.mockRejectedValue(uniqueViolation());
    await expect(addNomination('u1', 7)).rejects.toThrow('Esta película ya está en tu lista');
  });

  it('rethrows unexpected database errors', async () => {
    db.imdbLtaNomination.create.mockRejectedValue(new Error('db down'));
    await expect(addNomination('u1', 7)).rejects.toThrow('db down');
  });

  it('is blocked once nominations are closed', async () => {
    setPhase('NOMINATION_CLOSED');
    await expect(addNomination('u1', 7)).rejects.toThrow(/cerradas/);
  });
});

describe('removeNomination', () => {
  beforeEach(() => {
    setPhase('NOMINATION_OPEN');
    db.imdbLtaNomination.findUnique.mockResolvedValue({ id: 5 });
    db.imdbLtaNomination.delete.mockResolvedValue({});
  });

  it('throws when the movie is not in the user list', async () => {
    db.imdbLtaNomination.findUnique.mockResolvedValue(null);
    await expect(removeNomination('u1', 7)).rejects.toThrow('Esta película no está en tu lista');
  });

  it('un-submits the list when it drops below the 25-movie minimum', async () => {
    db.imdbLtaNomination.count.mockResolvedValue(24);
    db.imdbLtaNominationList.findUnique.mockResolvedValue({
      id: 10,
      submittedAt: new Date('2026-09-30'),
    });
    const result = await removeNomination('u1', 7);
    expect(result).toEqual({ count: 24, submittedAt: null });
    expect(db.imdbLtaNominationList.update).toHaveBeenCalledWith({
      where: { id: 10 },
      data: { submittedAt: null },
    });
  });

  it('keeps the submission when the list is still at or above the minimum', async () => {
    const submittedAt = new Date('2026-09-30');
    db.imdbLtaNomination.count.mockResolvedValue(25);
    db.imdbLtaNominationList.findUnique.mockResolvedValue({ id: 10, submittedAt });
    const result = await removeNomination('u1', 7);
    expect(result).toEqual({ count: 25, submittedAt });
    expect(db.imdbLtaNominationList.update).not.toHaveBeenCalled();
  });
});

describe('submitNominations', () => {
  beforeEach(() => {
    setPhase('NOMINATION_OPEN');
    db.imdbLtaNominationList.upsert.mockResolvedValue({ id: 10 });
    db.imdbLtaNominationList.update.mockImplementation(async ({ data }) => data);
  });

  it.each([0, 24])('rejects %d nominations (minimum is 25)', async (count) => {
    db.imdbLtaNomination.count.mockResolvedValue(count);
    await expect(submitNominations('u1')).rejects.toThrow(/al menos 25/);
  });

  it('rejects more than 50 nominations', async () => {
    db.imdbLtaNomination.count.mockResolvedValue(51);
    await expect(submitNominations('u1')).rejects.toThrow(/más de 50/);
  });

  it.each([25, 50])('accepts %d nominations and stamps submittedAt', async (count) => {
    db.imdbLtaNomination.count.mockResolvedValue(count);
    const result = await submitNominations('u1');
    expect(result.count).toBe(count);
    expect(result.submittedAt).toBeInstanceOf(Date);
  });
});

describe('canUserRateMovie', () => {
  it('disallows movies nobody nominated', async () => {
    db.imdbLtaNomination.count.mockResolvedValue(0);
    const result = await canUserRateMovie('u1', 7);
    expect(result).toMatchObject({ allowed: false });
    expect(result.reason).toMatch(/no es candidata/);
  });

  it('disallows re-rating', async () => {
    db.imdbLtaNomination.count.mockResolvedValue(3);
    db.imdbLtaRating.findUnique.mockResolvedValue({ id: 1 });
    await expect(canUserRateMovie('u1', 7)).resolves.toEqual({
      allowed: false,
      reason: 'Ya puntuaste esta película',
    });
  });

  it('disallows the sole nominator from rating their own unique pick', async () => {
    db.imdbLtaNomination.count.mockResolvedValue(1);
    db.imdbLtaRating.findUnique.mockResolvedValue(null);
    db.imdbLtaNomination.findUnique.mockResolvedValue({ id: 1 });
    const result = await canUserRateMovie('u1', 7);
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/Solo vos nominaste/);
  });

  it('allows a nominator once someone else also nominated the movie', async () => {
    db.imdbLtaNomination.count.mockResolvedValue(2);
    db.imdbLtaRating.findUnique.mockResolvedValue(null);
    db.imdbLtaNomination.findUnique.mockResolvedValue({ id: 1 });
    await expect(canUserRateMovie('u1', 7)).resolves.toEqual({ allowed: true });
  });

  it('allows a non-nominator', async () => {
    db.imdbLtaNomination.count.mockResolvedValue(1);
    db.imdbLtaRating.findUnique.mockResolvedValue(null);
    db.imdbLtaNomination.findUnique.mockResolvedValue(null);
    await expect(canUserRateMovie('u2', 7)).resolves.toEqual({ allowed: true });
  });
});

describe('submitRating', () => {
  const eligible = () => {
    db.imdbLtaNomination.count.mockResolvedValue(2);
    db.imdbLtaRating.findUnique.mockResolvedValue(null);
    db.imdbLtaNomination.findUnique.mockResolvedValue(null);
  };

  it('is blocked outside the RATING_OPEN phase', async () => {
    setPhase('NOMINATION_OPEN');
    await expect(submitRating('u1', 7, 8)).rejects.toThrow(/puntuaciones están cerradas/);
    expect(db.imdbLtaRating.create).not.toHaveBeenCalled();
  });

  it('surfaces the eligibility reason', async () => {
    setPhase('RATING_OPEN');
    db.imdbLtaNomination.count.mockResolvedValue(0);
    await expect(submitRating('u1', 7, 8)).rejects.toThrow(/no es candidata/);
  });

  it('stores the rating', async () => {
    setPhase('RATING_OPEN');
    eligible();
    db.imdbLtaRating.create.mockResolvedValue({ id: 3, score: 8 });
    await expect(submitRating('u1', 7, 8)).resolves.toEqual({ id: 3, movieId: 7, score: 8 });
  });

  it('maps a race-condition unique violation to a friendly error', async () => {
    setPhase('RATING_OPEN');
    eligible();
    db.imdbLtaRating.create.mockRejectedValue(uniqueViolation());
    await expect(submitRating('u1', 7, 8)).rejects.toThrow('Ya puntuaste esta película');
  });
});

describe('listOfficialRanking', () => {
  const stubData = (
    rows: Array<{ id: number; title: string; noms: number; count: number; avg: number | null }>
  ) => {
    db.movie.findMany.mockResolvedValue(rows.map((r) => card(r.id, r.title)));
    db.imdbLtaNomination.groupBy.mockResolvedValue(
      rows.map((r) => ({ movieId: r.id, _count: { _all: r.noms } }))
    );
    db.imdbLtaRating.groupBy.mockResolvedValue(
      rows
        .filter((r) => r.count > 0)
        .map((r) => ({ movieId: r.id, _count: { _all: r.count }, _avg: { score: r.avg } }))
    );
  };

  it('excludes movies with fewer than 5 ratings', async () => {
    setPhase('RATING_OPEN');
    stubData([
      { id: 1, title: 'Few', noms: 2, count: 4, avg: 10 },
      { id: 2, title: 'Enough', noms: 2, count: 5, avg: 6 },
    ]);
    const { movies: ranked } = await listOfficialRanking();
    expect(ranked.map((m) => m.title)).toEqual(['Enough']);
  });

  it('ranks by average, then rating count, then title', async () => {
    setPhase('RATING_OPEN');
    stubData([
      { id: 1, title: 'Zeta', noms: 1, count: 5, avg: 7 },
      { id: 2, title: 'Alpha', noms: 1, count: 5, avg: 7 },
      { id: 3, title: 'Popular', noms: 1, count: 9, avg: 7 },
      { id: 4, title: 'Best', noms: 1, count: 5, avg: 9 },
    ]);
    const { movies: ranked } = await listOfficialRanking();
    expect(ranked.map((m) => [m.rank, m.title])).toEqual([
      [1, 'Best'],
      [2, 'Popular'],
      [3, 'Alpha'],
      [4, 'Zeta'],
    ]);
  });

  it('flags the ranking as final only when ratings are closed', async () => {
    stubData([]);
    setPhase('RATING_OPEN');
    await expect(listOfficialRanking()).resolves.toMatchObject({ isFinal: false });
    setPhase('RATING_CLOSED');
    await expect(listOfficialRanking()).resolves.toMatchObject({ isFinal: true });
  });
});

describe('listRateableCandidates', () => {
  const stub = (
    rows: Array<{ id: number; title: string; noms: number; ratings: number }>,
    mine: { nominated?: number[]; rated?: Array<{ movieId: number; score: number }> } = {}
  ) => {
    db.movie.findMany.mockResolvedValue(rows.map((r) => card(r.id, r.title)));
    db.imdbLtaNomination.groupBy.mockResolvedValue(
      rows.map((r) => ({ movieId: r.id, _count: { _all: r.noms } }))
    );
    db.imdbLtaRating.groupBy.mockResolvedValue(
      rows.map((r) => ({ movieId: r.id, _count: { _all: r.ratings }, _avg: { score: 5 } }))
    );
    db.imdbLtaNomination.findMany.mockResolvedValue(
      (mine.nominated ?? []).map((movieId) => ({ movieId }))
    );
    db.imdbLtaRating.findMany.mockResolvedValue(mine.rated ?? []);
  };

  it('"unrated" hides movies I rated and my solo-nominated ones, least-rated first', async () => {
    stub(
      [
        { id: 1, title: 'Rated by me', noms: 2, ratings: 1 },
        { id: 2, title: 'My solo pick', noms: 1, ratings: 0 },
        { id: 3, title: 'Popular', noms: 2, ratings: 6 },
        { id: 4, title: 'Fresh', noms: 3, ratings: 0 },
      ],
      { nominated: [2], rated: [{ movieId: 1, score: 8 }] }
    );
    const result = await listRateableCandidates('u1', { filter: 'unrated' });
    expect(result.movies.map((m) => m.title)).toEqual(['Fresh', 'Popular']);
    expect(result.pagination).toEqual({ page: 1, limit: 30, total: 2, totalPages: 1 });
  });

  it.each([
    ['no_scores', ['A']],
    ['low', ['A', 'B']],
    ['close', ['C']],
    ['qualified', ['D']],
  ] as const)('filter %s', async (filter, expected) => {
    stub([
      { id: 1, title: 'A', noms: 2, ratings: 0 },
      { id: 2, title: 'B', noms: 2, ratings: 2 },
      { id: 3, title: 'C', noms: 2, ratings: 4 },
      { id: 4, title: 'D', noms: 2, ratings: 5 },
    ]);
    const result = await listRateableCandidates('u1', { filter });
    expect(result.movies.map((m) => m.title)).toEqual(expected);
  });

  it('"mine_done" lists only movies I scored, alphabetically', async () => {
    stub(
      [
        { id: 1, title: 'B', noms: 2, ratings: 1 },
        { id: 2, title: 'A', noms: 2, ratings: 1 },
        { id: 3, title: 'C', noms: 2, ratings: 1 },
      ],
      {
        rated: [
          { movieId: 1, score: 5 },
          { movieId: 2, score: 9 },
        ],
      }
    );
    const result = await listRateableCandidates('u1', { filter: 'mine_done' });
    expect(result.movies.map((m) => m.title)).toEqual(['A', 'B']);
  });

  it('paginates', async () => {
    stub(
      Array.from({ length: 5 }, (_, i) => ({
        id: i + 1,
        title: `Movie ${i + 1}`,
        noms: 2,
        ratings: 0,
      }))
    );
    const result = await listRateableCandidates('u1', { page: 2, limit: 2 });
    expect(result.movies.map((m) => m.title)).toEqual(['Movie 3', 'Movie 4']);
    expect(result.pagination).toEqual({ page: 2, limit: 2, total: 5, totalPages: 3 });
  });
});
