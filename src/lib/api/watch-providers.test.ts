import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getCurrentSession: vi.fn(),
  getMovieWatchProviders: vi.fn(),
  user: { findMany: vi.fn(), findUnique: vi.fn() },
  movie: { findMany: vi.fn(), update: vi.fn() },
  movieWatchProviders: {
    deleteMany: vi.fn(),
    upsert: vi.fn(),
    findUnique: vi.fn(),
  },
  $transaction: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  prisma: {
    user: mocks.user,
    movie: mocks.movie,
    movieWatchProviders: mocks.movieWatchProviders,
    $transaction: mocks.$transaction,
  },
}));
vi.mock('@/lib/get-session', () => ({ getCurrentSession: mocks.getCurrentSession }));
vi.mock('@/lib/tmdb', () => ({ getMovieWatchProviders: mocks.getMovieWatchProviders }));

import {
  getTrackedWatchCountries,
  getWatchProvidersForCurrentUser,
  syncWatchProvidersBatch,
  toStoredProviders,
} from './watch-providers';

const netflix = { provider_id: 8, provider_name: 'Netflix', logo_path: '/n.jpg', display_priority: 2 };
const mubi = { provider_id: 11, provider_name: 'MUBI', logo_path: '/m.jpg', display_priority: 1 };
const apple = { provider_id: 2, provider_name: 'Apple TV', logo_path: null, display_priority: 5 };

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  mocks.user.findMany.mockResolvedValue([]);
  mocks.movie.findMany.mockResolvedValue([]);
  mocks.$transaction.mockResolvedValue([]);
  mocks.movieWatchProviders.deleteMany.mockImplementation((args) => ({ op: 'deleteMany', args }));
  mocks.movieWatchProviders.upsert.mockImplementation((args) => ({ op: 'upsert', args }));
  mocks.movie.update.mockImplementation((args) => ({ op: 'movieUpdate', args }));
});

describe('toStoredProviders', () => {
  it('sorts by TMDB display priority, keeps only id, name and logo, and drops buy', () => {
    expect(
      toStoredProviders({ flatrate: [netflix, mubi], rent: [apple], buy: [apple] })
    ).toEqual({
      flatrate: [
        { id: 11, name: 'MUBI', logoPath: '/m.jpg' },
        { id: 8, name: 'Netflix', logoPath: '/n.jpg' },
      ],
      free: [],
      ads: [],
      rent: [{ id: 2, name: 'Apple TV', logoPath: null }],
    });
  });
});

describe('getTrackedWatchCountries', () => {
  it('always includes AR and normalizes member countries, ignoring junk', async () => {
    mocks.user.findMany.mockResolvedValue([
      { watchCountry: 'es' },
      { watchCountry: ' US ' },
      { watchCountry: 'Argentina' },
    ]);
    expect(await getTrackedWatchCountries()).toEqual(['AR', 'ES', 'US']);
  });
});

describe('syncWatchProvidersBatch', () => {
  it('asks for the stalest movies first, never-synced before the rest', async () => {
    await syncWatchProvidersBatch(25);
    expect(mocks.movie.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tmdbId: { not: null } },
        take: 25,
        orderBy: [
          { watchProvidersSyncedAt: { sort: 'asc', nulls: 'first' } },
          { id: 'asc' },
        ],
      })
    );
  });

  it('stores tracked countries only, drops stale countries and stamps the movie', async () => {
    mocks.user.findMany.mockResolvedValue([{ watchCountry: 'ES' }]);
    mocks.movie.findMany.mockResolvedValue([{ id: 1, tmdbId: 949 }]);
    mocks.getMovieWatchProviders.mockResolvedValue({
      AR: { link: 'https://tmdb/ar', flatrate: [netflix] },
      ES: { link: 'https://tmdb/es' }, // no providers: not stored
      FR: { flatrate: [mubi] }, // not tracked
    });

    const result = await syncWatchProvidersBatch();

    expect(result).toEqual({ countries: ['AR', 'ES'], processed: 1, updated: 1, failed: 0 });
    const ops = mocks.$transaction.mock.calls[0][0];
    expect(ops.map((op: { op: string }) => op.op)).toEqual(['deleteMany', 'upsert', 'movieUpdate']);
    expect(ops[0].args.where).toEqual({ movieId: 1, country: { notIn: ['AR'] } });
    expect(ops[1].args.create).toMatchObject({ movieId: 1, country: 'AR', link: 'https://tmdb/ar' });
    expect(JSON.parse(ops[1].args.create.providers).flatrate).toEqual([
      { id: 8, name: 'Netflix', logoPath: '/n.jpg' },
    ]);
    expect(ops[2].args).toMatchObject({ where: { id: 1 }, data: { watchProvidersSyncedAt: expect.any(Date) } });
  });

  it('leaves a movie unstamped when TMDB fails, so the next call retries it', async () => {
    mocks.movie.findMany.mockResolvedValue([
      { id: 1, tmdbId: 10 },
      { id: 2, tmdbId: 20 },
    ]);
    mocks.getMovieWatchProviders.mockImplementation(async (id: number) =>
      id === 10 ? null : {}
    );

    const result = await syncWatchProvidersBatch();

    expect(result).toMatchObject({ processed: 2, updated: 1, failed: 1 });
    expect(mocks.$transaction).toHaveBeenCalledOnce();
    expect(mocks.movie.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 2 } }));
  });

  it('counts a failed database write as a failure without stopping the batch', async () => {
    mocks.movie.findMany.mockResolvedValue([
      { id: 1, tmdbId: 10 },
      { id: 2, tmdbId: 20 },
    ]);
    mocks.getMovieWatchProviders.mockResolvedValue({});
    mocks.$transaction.mockRejectedValueOnce(new Error('db down')).mockResolvedValue([]);

    expect(await syncWatchProvidersBatch()).toMatchObject({ updated: 1, failed: 1 });
  });
});

describe('getWatchProvidersForCurrentUser', () => {
  const stored = JSON.stringify({ flatrate: [{ id: 8, name: 'Netflix', logoPath: '/n.jpg' }] });

  beforeEach(() => {
    mocks.getCurrentSession.mockResolvedValue({ user: { id: 'u1' } });
  });

  it('returns nothing without a session', async () => {
    mocks.getCurrentSession.mockResolvedValue(null);
    expect(await getWatchProvidersForCurrentUser(1)).toBeNull();
    expect(mocks.movieWatchProviders.findUnique).not.toHaveBeenCalled();
  });

  it("uses the member's country", async () => {
    mocks.user.findUnique.mockResolvedValue({ watchCountry: 'es' });
    mocks.movieWatchProviders.findUnique.mockResolvedValue({ link: 'L', providers: stored });

    const view = await getWatchProvidersForCurrentUser(1);

    expect(mocks.movieWatchProviders.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { movieId_country: { movieId: 1, country: 'ES' } } })
    );
    expect(view).toEqual({
      country: 'ES',
      link: 'L',
      providers: {
        flatrate: [{ id: 8, name: 'Netflix', logoPath: '/n.jpg' }],
        free: [],
        ads: [],
        rent: [],
      },
    });
  });

  it('falls back to AR when the member has no country', async () => {
    mocks.user.findUnique.mockResolvedValue({ watchCountry: null });
    mocks.movieWatchProviders.findUnique.mockResolvedValue(null);

    expect(await getWatchProvidersForCurrentUser(1)).toBeNull();
    expect(mocks.movieWatchProviders.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { movieId_country: { movieId: 1, country: 'AR' } } })
    );
  });

  it('hides a row that only had buy options (stored before buy was dropped)', async () => {
    mocks.user.findUnique.mockResolvedValue({ watchCountry: 'AR' });
    mocks.movieWatchProviders.findUnique.mockResolvedValue({
      link: null,
      providers: JSON.stringify({ buy: [{ id: 2, name: 'Apple TV', logoPath: null }] }),
    });
    expect(await getWatchProvidersForCurrentUser(1)).toBeNull();
  });

  it('ignores a corrupt row instead of throwing', async () => {
    mocks.user.findUnique.mockResolvedValue({ watchCountry: 'AR' });
    mocks.movieWatchProviders.findUnique.mockResolvedValue({ link: null, providers: '{not json' });
    expect(await getWatchProvidersForCurrentUser(1)).toBeNull();
  });
});
