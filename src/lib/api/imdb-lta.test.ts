import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({
  imdbLtaConfig: { upsert: vi.fn(), update: vi.fn() },
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
    upsert: vi.fn(),
    groupBy: vi.fn(),
  },
  imdbLtaSkip: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    upsert: vi.fn(),
    update: vi.fn(),
    deleteMany: vi.fn(),
  },
  imdbLtaBatchMovie: {
    findMany: vi.fn(),
  },
  imdbLtaBatch: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
  },
  movie: { findUnique: vi.fn(), findMany: vi.fn() },
  $transaction: vi.fn(),
}));

/** Mark movieIds as released (appeared in a closed batch). Does not touch nomination.groupBy. */
const releaseMovies = (...movieIds: number[]) => {
  db.imdbLtaBatchMovie.findMany.mockResolvedValue(
    movieIds.map((movieId) => ({
      movieId,
      batch: { status: 'CLOSED' },
    }))
  );
};

const openBatchMovies = (...movieIds: number[]) => {
  db.imdbLtaBatchMovie.findMany.mockResolvedValue(
    movieIds.map((movieId) => ({
      movieId,
      batch: { status: 'OPEN' },
    }))
  );
};

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
  listAdminLotes,
  listAdminRatingSnapshot,
  listOfficialRanking,
  listOpenBatchDeck,
  listRateableCandidates,
  lookupMovie,
  removeNomination,
  submitNominations,
  setWantToWatch,
  submitRating,
} from './imdb-lta';

const setPhase = (phase: string) =>
  db.imdbLtaConfig.upsert.mockResolvedValue({ id: 1, phase });

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
  db.imdbLtaSkip.findMany.mockResolvedValue([]);
  db.imdbLtaBatchMovie.findMany.mockResolvedValue([]);
  db.imdbLtaNomination.groupBy.mockResolvedValue([]);
  db.$transaction.mockImplementation(async (ops: unknown) => {
    if (Array.isArray(ops)) return Promise.all(ops);
    if (typeof ops === 'function') return ops(db);
    return ops;
  });
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
    vi.setSystemTime(new Date('2026-11-07T00:00:00-03:00'));
    await expect(assertNominationPhaseOpen()).rejects.toThrow(/plazo de nominaciones terminó/);
  });

  it('upserts the singleton config, defaulting to NOMINATION_OPEN and never overwriting an existing row', async () => {
    db.imdbLtaConfig.upsert.mockResolvedValue({ id: 1, phase: 'NOMINATION_OPEN' });
    await assertNominationPhaseOpen();
    expect(db.imdbLtaConfig.upsert).toHaveBeenCalledWith({
      where: { id: 1 },
      create: { id: 1, phase: 'NOMINATION_OPEN' },
      update: {},
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

  it('disallows locked (never-batched) movies', async () => {
    db.imdbLtaNomination.count.mockResolvedValue(2);
    db.imdbLtaNomination.groupBy.mockResolvedValue([{ movieId: 7 }]);
    db.imdbLtaBatchMovie.findMany.mockResolvedValue([]);
    const result = await canUserRateMovie('u1', 7);
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/todavía no salió en un lote/);
  });

  it('allows re-rating a released movie (editable scores)', async () => {
    db.imdbLtaNomination.count.mockResolvedValue(3);
    releaseMovies(7);
    db.imdbLtaNomination.findUnique.mockResolvedValue(null);
    await expect(canUserRateMovie('u1', 7)).resolves.toEqual({ allowed: true });
  });

  it('allows the sole nominator to rate their own pick', async () => {
    db.imdbLtaNomination.count.mockResolvedValue(1);
    releaseMovies(7);
    await expect(canUserRateMovie('u1', 7)).resolves.toEqual({ allowed: true });
  });

  it('allows a nominator when other people also nominated the movie', async () => {
    db.imdbLtaNomination.count.mockResolvedValue(2);
    releaseMovies(7);
    await expect(canUserRateMovie('u1', 7)).resolves.toEqual({ allowed: true });
  });

  it('allows a non-nominator on an open-batch movie', async () => {
    db.imdbLtaNomination.count.mockResolvedValue(1);
    openBatchMovies(7);
    db.imdbLtaNomination.findUnique.mockResolvedValue(null);
    await expect(canUserRateMovie('u2', 7)).resolves.toEqual({ allowed: true });
  });
});

describe('submitRating', () => {
  const eligible = () => {
    db.imdbLtaNomination.count.mockResolvedValue(2);
    releaseMovies(7);
    db.imdbLtaNomination.findUnique.mockResolvedValue(null);
  };

  it('is blocked outside the RATING_OPEN phase', async () => {
    setPhase('NOMINATION_OPEN');
    await expect(submitRating('u1', 7, 8)).rejects.toThrow(/puntajes están cerrados/);
    expect(db.imdbLtaRating.upsert).not.toHaveBeenCalled();
  });

  it('surfaces the eligibility reason', async () => {
    setPhase('RATING_OPEN');
    db.imdbLtaNomination.count.mockResolvedValue(0);
    await expect(submitRating('u1', 7, 8)).rejects.toThrow(/no es candidata/);
  });

  it('upserts the rating and clears any skip', async () => {
    setPhase('RATING_OPEN');
    eligible();
    db.imdbLtaRating.upsert.mockResolvedValue({ id: 3, score: 8 });
    db.imdbLtaSkip.deleteMany.mockResolvedValue({ count: 1 });
    await expect(submitRating('u1', 7, 8)).resolves.toEqual({
      id: 3,
      movieId: 7,
      score: 8,
    });
    expect(db.imdbLtaRating.upsert).toHaveBeenCalled();
    expect(db.imdbLtaSkip.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'u1', movieId: 7 },
    });
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
    releaseMovies(1, 2);
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
    releaseMovies(1, 2, 3, 4);
    const { movies: ranked } = await listOfficialRanking();
    expect(ranked.map((m) => [m.rank, m.title])).toEqual([
      [1, 'Best'],
      [2, 'Popular'],
      [3, 'Alpha'],
      [4, 'Zeta'],
    ]);
  });

  it('excludes locked and open-batch movies from the ranking', async () => {
    setPhase('RATING_OPEN');
    stubData([
      { id: 1, title: 'Locked', noms: 2, count: 10, avg: 9 },
      { id: 2, title: 'Open', noms: 2, count: 10, avg: 9 },
      { id: 3, title: 'Released', noms: 2, count: 5, avg: 7 },
    ]);
    db.imdbLtaBatchMovie.findMany.mockResolvedValue([
      { movieId: 2, batch: { status: 'OPEN' } },
      { movieId: 3, batch: { status: 'CLOSED' } },
    ]);
    const { movies: ranked } = await listOfficialRanking();
    expect(ranked.map((m) => m.title)).toEqual(['Released']);
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
    mine: {
      nominated?: number[];
      rated?: Array<{ movieId: number; score: number }>;
      skipped?: Array<number | { movieId: number; pinnedAt?: Date | null }>;
    } = {}
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
    if (mine.skipped) {
      db.imdbLtaSkip.findMany.mockResolvedValue(
        mine.skipped.map((entry) =>
          typeof entry === 'number'
            ? { movieId: entry, pinnedAt: null }
            : { movieId: entry.movieId, pinnedAt: entry.pinnedAt ?? null }
        )
      );
    }
  };

  it('"pending" lists unscored released movies, least-rated first', async () => {
    stub(
      [
        { id: 1, title: 'Rated by me', noms: 2, ratings: 1 },
        { id: 2, title: 'My solo pick', noms: 1, ratings: 0 },
        { id: 3, title: 'Popular', noms: 2, ratings: 6 },
        { id: 4, title: 'Fresh', noms: 3, ratings: 0 },
        { id: 5, title: 'Almost', noms: 2, ratings: 4 },
      ],
      { nominated: [2], rated: [{ movieId: 1, score: 8 }] }
    );
    releaseMovies(1, 2, 3, 4, 5);
    const result = await listRateableCandidates('u1', { filter: 'pending' });
    expect(result.movies.map((m) => m.title)).toEqual([
      'Fresh',
      'My solo pick',
      'Almost',
      'Popular',
    ]);
    expect(result.pagination).toEqual({ page: 1, limit: 30, total: 4, totalPages: 1 });
    expect(result.counts).toEqual({
      pending: 4,
      mine_done: 1,
      not_seen: 0,
      want_to_watch: 0,
    });
  });

  it('"pending" + onlyShort keeps movies under the ranking threshold', async () => {
    stub([
      { id: 1, title: 'A', noms: 2, ratings: 0 },
      { id: 2, title: 'B', noms: 2, ratings: 4 },
      { id: 3, title: 'C', noms: 2, ratings: 5 },
      { id: 4, title: 'D', noms: 2, ratings: 8 },
    ]);
    releaseMovies(1, 2, 3, 4);
    const result = await listRateableCandidates('u1', {
      filter: 'pending',
      onlyShort: true,
    });
    expect(result.movies.map((m) => m.title)).toEqual(['A', 'B']);
    expect(result.counts.pending).toBe(4);
  });

  it('"mine_done" lists only movies I scored, open batch first then A–Z', async () => {
    stub(
      [
        { id: 1, title: 'B', noms: 2, ratings: 1 },
        { id: 2, title: 'A', noms: 2, ratings: 1 },
        { id: 3, title: 'C', noms: 2, ratings: 1 },
        { id: 4, title: 'Zebra Open', noms: 2, ratings: 1 },
      ],
      {
        rated: [
          { movieId: 1, score: 5 },
          { movieId: 2, score: 9 },
          { movieId: 4, score: 7 },
        ],
      }
    );
    db.imdbLtaBatchMovie.findMany.mockResolvedValue([
      { movieId: 1, batch: { status: 'CLOSED' } },
      { movieId: 2, batch: { status: 'CLOSED' } },
      { movieId: 3, batch: { status: 'CLOSED' } },
      { movieId: 4, batch: { status: 'OPEN' } },
    ]);
    const result = await listRateableCandidates('u1', { filter: 'mine_done' });
    expect(result.movies.map((m) => m.title)).toEqual([
      'Zebra Open',
      'A',
      'B',
    ]);
  });

  it('excludes locked and open-batch movies from pending', async () => {
    stub([
      { id: 1, title: 'Locked', noms: 2, ratings: 0 },
      { id: 2, title: 'Open', noms: 2, ratings: 0 },
      { id: 3, title: 'Released', noms: 2, ratings: 0 },
    ]);
    db.imdbLtaBatchMovie.findMany.mockResolvedValue([
      { movieId: 2, batch: { status: 'OPEN' } },
      { movieId: 3, batch: { status: 'CLOSED' } },
    ]);
    const result = await listRateableCandidates('u1', {
      filter: 'pending',
    });
    expect(result.movies.map((m) => m.title)).toEqual(['Released']);
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
    releaseMovies(1, 2, 3, 4, 5);
    const result = await listRateableCandidates('u1', { page: 2, limit: 2 });
    expect(result.movies.map((m) => m.title)).toEqual(['Movie 3', 'Movie 4']);
    expect(result.pagination).toEqual({ page: 2, limit: 2, total: 5, totalPages: 3 });
  });

  it('"not_seen" lists unpinned skips I can still score, open batch first', async () => {
    stub(
      [
        { id: 1, title: 'Released skip', noms: 2, ratings: 1 },
        { id: 2, title: 'Open skip', noms: 2, ratings: 0 },
        { id: 3, title: 'Already scored', noms: 2, ratings: 2 },
        { id: 4, title: 'Solo skip', noms: 1, ratings: 0 },
        { id: 5, title: 'Not skipped', noms: 2, ratings: 0 },
        { id: 6, title: 'Pinned skip', noms: 2, ratings: 0 },
      ],
      {
        nominated: [4],
        rated: [{ movieId: 3, score: 8 }],
        skipped: [
          1,
          2,
          3,
          4,
          { movieId: 6, pinnedAt: new Date('2026-11-10T12:00:00Z') },
        ],
      }
    );
    db.imdbLtaBatchMovie.findMany.mockResolvedValue([
      { movieId: 1, batch: { status: 'CLOSED' } },
      { movieId: 2, batch: { status: 'OPEN' } },
      { movieId: 3, batch: { status: 'CLOSED' } },
      { movieId: 4, batch: { status: 'CLOSED' } },
      { movieId: 5, batch: { status: 'CLOSED' } },
      { movieId: 6, batch: { status: 'CLOSED' } },
    ]);

    const result = await listRateableCandidates('u1', { filter: 'not_seen' });
    expect(result.movies.map((m) => m.title)).toEqual([
      'Open skip',
      'Released skip',
      'Solo skip',
    ]);
    expect(result.counts).toEqual({
      pending: 1,
      mine_done: 1,
      not_seen: 3,
      want_to_watch: 1,
    });

    const pending = await listRateableCandidates('u1', {
      filter: 'pending',
    });
    expect(pending.movies.map((m) => m.title)).toEqual(['Not skipped']);
    expect(pending.movies.map((m) => m.title)).not.toContain('Released skip');
    expect(pending.movies.map((m) => m.title)).not.toContain('Open skip');
  });

  it('"want_to_watch" lists only pinned no-vistas, newest pin first', async () => {
    stub(
      [
        { id: 1, title: 'Plain skip', noms: 2, ratings: 0 },
        { id: 2, title: 'Older pin', noms: 2, ratings: 0 },
        { id: 3, title: 'Newer pin', noms: 2, ratings: 0 },
        { id: 4, title: 'Scored pin', noms: 2, ratings: 1 },
      ],
      {
        rated: [{ movieId: 4, score: 6 }],
        skipped: [
          1,
          { movieId: 2, pinnedAt: new Date('2026-11-01T12:00:00Z') },
          { movieId: 3, pinnedAt: new Date('2026-11-10T12:00:00Z') },
          { movieId: 4, pinnedAt: new Date('2026-11-11T12:00:00Z') },
        ],
      }
    );
    releaseMovies(1, 2, 3, 4);

    const result = await listRateableCandidates('u1', {
      filter: 'want_to_watch',
    });
    expect(result.movies.map((m) => m.title)).toEqual(['Newer pin', 'Older pin']);
    expect(result.movies.every((m) => m.userWantToWatch)).toBe(true);
  });
});

describe('setWantToWatch', () => {
  it('stamps pinnedAt on an existing no-vista', async () => {
    setPhase('RATING_OPEN');
    db.imdbLtaSkip.findUnique.mockResolvedValue({ id: 4, pinnedAt: null });
    db.imdbLtaSkip.update.mockResolvedValue({ id: 4 });

    await expect(setWantToWatch('u1', 7, true)).resolves.toEqual({
      movieId: 7,
      wantToWatch: true,
    });
    expect(db.imdbLtaSkip.update).toHaveBeenCalledWith({
      where: { userId_movieId: { userId: 'u1', movieId: 7 } },
      data: { pinnedAt: new Date('2026-10-01T12:00:00-03:00') },
    });
  });

  it('clears the pin without deleting the no-vista', async () => {
    setPhase('RATING_OPEN');
    db.imdbLtaSkip.findUnique.mockResolvedValue({
      id: 4,
      pinnedAt: new Date('2026-11-01T12:00:00Z'),
    });
    db.imdbLtaSkip.update.mockResolvedValue({ id: 4 });

    await expect(setWantToWatch('u1', 7, false)).resolves.toEqual({
      movieId: 7,
      wantToWatch: false,
    });
    expect(db.imdbLtaSkip.update).toHaveBeenCalledWith({
      where: { userId_movieId: { userId: 'u1', movieId: 7 } },
      data: { pinnedAt: null },
    });
    expect(db.imdbLtaSkip.deleteMany).not.toHaveBeenCalled();
  });

  it('refuses when the movie is not marked no vista', async () => {
    setPhase('RATING_OPEN');
    db.imdbLtaSkip.findUnique.mockResolvedValue(null);

    await expect(setWantToWatch('u1', 7, true)).rejects.toThrow(/no vista/i);
    expect(db.imdbLtaSkip.update).not.toHaveBeenCalled();
  });

  it('is blocked outside the RATING_OPEN phase', async () => {
    setPhase('RATING_CLOSED');
    await expect(setWantToWatch('u1', 7, true)).rejects.toThrow(
      /puntajes están cerrados/
    );
    expect(db.imdbLtaSkip.update).not.toHaveBeenCalled();
  });
});

describe('listOpenBatchDeck', () => {
  it('counts open-batch skips separately from scored movies', async () => {
    db.movie.findMany.mockResolvedValue([
      card(1, 'Scored'),
      card(2, 'Skipped'),
      card(3, 'Pending'),
    ]);
    db.imdbLtaNomination.groupBy.mockResolvedValue([
      { movieId: 1, _count: { _all: 2 } },
      { movieId: 2, _count: { _all: 2 } },
      { movieId: 3, _count: { _all: 2 } },
    ]);
    db.imdbLtaRating.groupBy.mockResolvedValue([]);
    db.imdbLtaNomination.findMany.mockResolvedValue([]);
    db.imdbLtaRating.findMany.mockResolvedValue([{ movieId: 1, score: 7 }]);
    db.imdbLtaSkip.findMany.mockResolvedValue([{ movieId: 2 }]);
    openBatchMovies(1, 2, 3);
    db.imdbLtaBatch.findFirst.mockResolvedValue({
      id: 9,
      number: 3,
      openedAt: new Date('2026-11-01T12:00:00Z'),
      movies: [
        { position: 0, movie: card(1, 'Scored') },
        { position: 1, movie: card(2, 'Skipped') },
        { position: 2, movie: card(3, 'Pending') },
      ],
    });

    const deck = await listOpenBatchDeck('u1');
    expect(deck?.deck.map((m) => m.title)).toEqual(['Pending']);
    expect(deck?.doneCount).toBe(2);
    expect(deck?.skippedCount).toBe(1);
  });
});

describe('listAdminRatingSnapshot', () => {
  const movie = (id: number, title: string) => ({
    id,
    title,
    originalTitle: title,
    posterUrl: `/p/${id}.jpg`,
    imdbId: `tt${String(id).padStart(7, '0')}`,
  });

  it('groups averages, keeps unrated nominees, and sorts movies and votes', async () => {
    db.imdbLtaNomination.findMany.mockResolvedValue([
      { movieId: 1, movie: movie(1, 'Best') },
      { movieId: 2, movie: movie(2, 'Tie Low') },
      { movieId: 3, movie: movie(3, 'Zeta') },
      { movieId: 4, movie: movie(4, 'Aaa') },
      { movieId: 5, movie: movie(5, 'Popular') },
    ]);
    db.imdbLtaRating.findMany.mockResolvedValue([
      {
        userId: 'ana',
        movieId: 1,
        score: 9,
        createdAt: new Date('2026-11-02T15:00:00Z'),
        user: { name: 'Ana' },
        movie: movie(1, 'Best'),
      },
      {
        userId: 'ana',
        movieId: 5,
        score: 8,
        createdAt: new Date('2026-11-02T16:00:00Z'),
        user: { name: 'Ana' },
        movie: movie(5, 'Popular'),
      },
      {
        userId: 'bea',
        movieId: 5,
        score: 6,
        createdAt: new Date('2026-11-03T15:00:00Z'),
        user: { name: 'Bea' },
        movie: movie(5, 'Popular'),
      },
      {
        userId: 'ana',
        movieId: 2,
        score: 7,
        createdAt: new Date('2026-11-04T15:00:00Z'),
        user: { name: 'Ana' },
        movie: movie(2, 'Tie Low'),
      },
      {
        userId: 'ana',
        movieId: 3,
        score: 7,
        createdAt: new Date('2026-11-04T16:00:00Z'),
        user: { name: 'Ana' },
        movie: movie(3, 'Zeta'),
      },
      {
        userId: 'ciro',
        movieId: 6,
        score: 5,
        createdAt: new Date('2026-11-05T15:00:00Z'),
        user: { name: 'Ciro' },
        movie: movie(6, 'Only Rated'),
      },
      {
        userId: 'bea',
        movieId: 6,
        score: 5,
        createdAt: new Date('2026-11-05T16:00:00Z'),
        user: { name: 'Bea' },
        movie: movie(6, 'Only Rated'),
      },
    ]);

    const snapshot = await listAdminRatingSnapshot();

    expect(snapshot.movieCount).toBe(6);
    expect(snapshot.totalRatings).toBe(7);
    expect(snapshot.voterCount).toBe(3);
    expect(snapshot.movies.map((m) => [m.title, m.ratingCount, m.averageScore])).toEqual([
      ['Best', 1, 9],
      ['Popular', 2, 7],
      ['Tie Low', 1, 7],
      ['Zeta', 1, 7],
      ['Only Rated', 2, 5],
      ['Aaa', 0, null],
    ]);
    expect(snapshot.movies.find((m) => m.title === 'Popular')?.votes.map((v) => v.name)).toEqual([
      'Ana',
      'Bea',
    ]);
    expect(snapshot.movies.find((m) => m.title === 'Only Rated')?.votes.map((v) => v.name)).toEqual([
      'Bea',
      'Ciro',
    ]);
    expect(snapshot.people.map((p) => [p.name, p.ratingCount, p.averageScore])).toEqual([
      ['Ana', 4, 7.75],
      ['Bea', 2, 5.5],
      ['Ciro', 1, 5],
    ]);
    expect(snapshot.people.find((p) => p.name === 'Ana')?.ratings.map((r) => r.title)).toEqual([
      'Best',
      'Popular',
      'Tie Low',
      'Zeta',
    ]);
  });
});

describe('listAdminLotes', () => {
  const movie = (id: number, title: string) => ({
    id,
    title,
    originalTitle: title,
    posterUrl: `/p/${id}.jpg`,
    imdbId: `tt${String(id).padStart(7, '0')}`,
  });

  it('puts the open lote first and attaches nominators, skips, and picks', async () => {
    db.imdbLtaBatch.findMany.mockResolvedValue([
      {
        id: 1,
        number: 1,
        status: 'CLOSED',
        openedAt: new Date('2026-11-01T15:00:00Z'),
        closedAt: new Date('2026-11-08T15:00:00Z'),
        movies: [{ position: 1, movie: movie(3, 'Older') }],
      },
      {
        id: 2,
        number: 2,
        status: 'OPEN',
        openedAt: new Date('2026-11-10T15:00:00Z'),
        closedAt: null,
        movies: [
          { position: 1, movie: movie(1, 'Best') },
          { position: 2, movie: movie(2, 'Quiet') },
        ],
      },
    ]);
    db.imdbLtaNomination.findMany.mockResolvedValue([
      {
        userId: 'bea',
        movieId: 1,
        user: { name: 'Bea' },
        movie: { title: 'Best' },
      },
      {
        userId: 'ana',
        movieId: 1,
        user: { name: 'Ana' },
        movie: { title: 'Best' },
      },
      {
        userId: 'ana',
        movieId: 3,
        user: { name: 'Ana' },
        movie: { title: 'Older' },
      },
    ]);
    db.imdbLtaSkip.findMany.mockResolvedValue([
      {
        userId: 'ciro',
        movieId: 2,
        user: { name: 'Ciro' },
      },
    ]);

    const snapshot = await listAdminLotes();

    expect(snapshot.lotes.map((lote) => [lote.number, lote.status])).toEqual([
      [2, 'OPEN'],
      [1, 'CLOSED'],
    ]);
    expect(snapshot.lotes[0]?.movies[0]?.nominators.map((person) => person.name)).toEqual([
      'Ana',
      'Bea',
    ]);
    expect(snapshot.lotes[0]?.movies[1]?.skips.map((person) => person.name)).toEqual([
      'Ciro',
    ]);
    expect(snapshot.lotes[0]?.movies[1]?.nominators).toEqual([]);
    expect(snapshot.picks.map((pick) => [pick.name, pick.nominations.map((n) => n.title)])).toEqual([
      ['Ana', ['Best', 'Older']],
      ['Bea', ['Best']],
    ]);
  });
});
