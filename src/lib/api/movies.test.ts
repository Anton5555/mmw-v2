import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const tx = {
    genre: { createMany: vi.fn(), findMany: vi.fn() },
    director: { createMany: vi.fn(), findMany: vi.fn() },
    country: { createMany: vi.fn(), findMany: vi.fn() },
    movie: { create: vi.fn() },
    movieGenre: { createMany: vi.fn() },
    movieDirector: { createMany: vi.fn() },
    movieCountry: { createMany: vi.fn() },
  };
  return {
    tx,
    prisma: {
      movie: { findUnique: vi.fn(), findMany: vi.fn() },
      genre: { findMany: vi.fn() },
      director: { findMany: vi.fn() },
      country: { findMany: vi.fn() },
      $transaction: vi.fn(),
    },
    getMovieById: vi.fn(),
    getMovieDetailsFull: vi.fn(),
  };
});

vi.mock('@/lib/db', () => ({ prisma: mocks.prisma }));
vi.mock('@/lib/tmdb', () => ({
  getMovieById: mocks.getMovieById,
  getMovieDetailsFull: mocks.getMovieDetailsFull,
}));

import {
  findMovieByImdbId,
  findOrCreateMovieByImdbId,
  getAllCountries,
  getAllDirectors,
  getAllGenres,
  searchInternalMoviesByName,
} from './movies';

const tmdbMovie = {
  id: 949,
  title: 'Heat',
  original_title: 'Heat (orig)',
  original_language: 'en',
  release_date: '1995-12-15',
  poster_path: 'https://image.tmdb.org/t/p/original/heat.jpg',
  imdbId: 'tt0113277',
};

const card = { id: 1, title: 'Heat', imdbId: 'tt0113277', tmdbId: 949 };
const uniqueViolation = () => Object.assign(new Error('unique'), { code: 'P2002' });

beforeEach(() => {
  mocks.prisma.$transaction.mockImplementation(async (cb: (tx: typeof mocks.tx) => unknown) => cb(mocks.tx));
  mocks.tx.movie.create.mockResolvedValue(card);
  mocks.getMovieById.mockResolvedValue(tmdbMovie);
  mocks.getMovieDetailsFull.mockResolvedValue({ genres: [], directors: [], countries: [], tmdbId: 949 });
});

describe('findOrCreateMovieByImdbId', () => {
  it('returns an existing movie without calling TMDB', async () => {
    mocks.prisma.movie.findUnique.mockResolvedValue(card);
    await expect(findOrCreateMovieByImdbId('tt0113277')).resolves.toBe(card);
    expect(mocks.getMovieById).not.toHaveBeenCalled();
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
  });

  it('throws when TMDB does not know the IMDb id', async () => {
    mocks.prisma.movie.findUnique.mockResolvedValue(null);
    mocks.getMovieById.mockResolvedValue(null);
    await expect(findOrCreateMovieByImdbId('tt0000000')).rejects.toThrow(
      'No se encontró la película con ID de IMDb tt0000000 en TMDB'
    );
  });

  describe('creating a new movie', () => {
    beforeEach(() => {
      mocks.prisma.movie.findUnique.mockResolvedValue(null);
    });

    it('maps TMDB fields onto the new row', async () => {
      await findOrCreateMovieByImdbId('tt0113277');

      expect(mocks.tx.movie.create.mock.calls[0][0].data).toEqual({
        title: 'Heat',
        originalTitle: 'Heat (orig)',
        originalLanguage: 'en',
        releaseDate: new Date('1995-12-15'),
        letterboxdUrl: 'https://letterboxd.com/tmdb/949',
        imdbId: 'tt0113277',
        posterUrl: 'https://image.tmdb.org/t/p/original/heat.jpg',
        tmdbId: 949,
      });
    });

    it('tolerates a missing poster and release date', async () => {
      mocks.getMovieById.mockResolvedValue({ ...tmdbMovie, poster_path: '', release_date: '' });
      await findOrCreateMovieByImdbId('tt0113277');
      const { posterUrl, releaseDate } = mocks.tx.movie.create.mock.calls[0][0].data;
      expect(posterUrl).toBe('');
      expect(releaseDate).toBeInstanceOf(Date);
      expect(Number.isNaN(releaseDate.getTime())).toBe(false);
    });

    it('creates only the movie when TMDB has no extra details', async () => {
      mocks.getMovieDetailsFull.mockResolvedValue(null);

      await expect(findOrCreateMovieByImdbId('tt0113277')).resolves.toBe(card);

      expect(mocks.tx.genre.createMany).not.toHaveBeenCalled();
      expect(mocks.tx.movieGenre.createMany).not.toHaveBeenCalled();
      expect(mocks.tx.movieDirector.createMany).not.toHaveBeenCalled();
      expect(mocks.tx.movieCountry.createMany).not.toHaveBeenCalled();
    });

    it('upserts genres/directors/countries and links them to the movie', async () => {
      mocks.getMovieDetailsFull.mockResolvedValue({
        tmdbId: 949,
        genres: [{ id: 80, name: 'Crime' }],
        directors: [{ id: 1, name: 'Michael Mann' }],
        countries: [
          { code: ' us ', name: 'United States' },
          { code: '  ', name: 'Nowhere' },
        ],
      });
      mocks.tx.genre.findMany.mockResolvedValue([{ id: 5, name: 'Crime' }]);
      mocks.tx.director.findMany.mockResolvedValue([{ id: 6, name: 'Michael Mann' }]);
      mocks.tx.country.findMany.mockResolvedValue([{ id: 7, code: 'US' }]);

      await findOrCreateMovieByImdbId('tt0113277');

      expect(mocks.tx.genre.createMany).toHaveBeenCalledWith({
        data: [{ name: 'Crime', tmdbId: 80 }],
        skipDuplicates: true,
      });
      expect(mocks.tx.director.createMany).toHaveBeenCalledWith({
        data: [{ name: 'Michael Mann', tmdbId: 1 }],
        skipDuplicates: true,
      });
      // Codes are trimmed/uppercased and blank ones are dropped.
      expect(mocks.tx.country.createMany).toHaveBeenCalledWith({
        data: [{ code: 'US', name: 'United States' }],
        skipDuplicates: true,
      });
      expect(mocks.tx.country.findMany).toHaveBeenCalledWith({
        where: { code: { in: ['US'] } },
        select: { id: true, code: true },
      });

      expect(mocks.tx.movieGenre.createMany).toHaveBeenCalledWith({
        data: [{ movieId: 1, genreId: 5 }],
        skipDuplicates: true,
      });
      expect(mocks.tx.movieDirector.createMany).toHaveBeenCalledWith({
        data: [{ movieId: 1, directorId: 6 }],
        skipDuplicates: true,
      });
      expect(mocks.tx.movieCountry.createMany).toHaveBeenCalledWith({
        data: [{ movieId: 1, countryId: 7 }],
        skipDuplicates: true,
      });
    });
  });

  describe('concurrent creation (unique violation)', () => {
    beforeEach(() => {
      mocks.prisma.$transaction.mockRejectedValue(uniqueViolation());
    });

    it('returns the row created by the concurrent request', async () => {
      mocks.prisma.movie.findUnique
        .mockResolvedValueOnce(null) // initial existence check
        .mockResolvedValueOnce(card); // re-read by imdbId

      await expect(findOrCreateMovieByImdbId('tt0113277')).resolves.toBe(card);
    });

    it('falls back to the tmdbId when another imdbId already owns that TMDB movie', async () => {
      mocks.prisma.movie.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null) // nothing by imdbId
        .mockResolvedValueOnce(card); // found by tmdbId

      await expect(findOrCreateMovieByImdbId('tt0113277')).resolves.toBe(card);
      expect(mocks.prisma.movie.findUnique).toHaveBeenLastCalledWith(
        expect.objectContaining({ where: { tmdbId: 949 } })
      );
    });

    it('rethrows when the conflicting row cannot be found', async () => {
      mocks.prisma.movie.findUnique.mockResolvedValue(null);
      await expect(findOrCreateMovieByImdbId('tt0113277')).rejects.toMatchObject({ code: 'P2002' });
    });
  });

  it('rethrows other database errors without re-reading', async () => {
    mocks.prisma.movie.findUnique.mockResolvedValue(null);
    mocks.prisma.$transaction.mockRejectedValue(new Error('db down'));
    await expect(findOrCreateMovieByImdbId('tt0113277')).rejects.toThrow('db down');
    expect(mocks.prisma.movie.findUnique).toHaveBeenCalledTimes(1);
  });
});

describe('searchInternalMoviesByName', () => {
  it('matches title or original title case-insensitively, sorted by title, default limit 20', async () => {
    mocks.prisma.movie.findMany.mockResolvedValue([card]);

    await expect(searchInternalMoviesByName('heat')).resolves.toEqual([card]);

    const call = mocks.prisma.movie.findMany.mock.calls[0][0];
    expect(call.where).toEqual({
      OR: [
        { title: { contains: 'heat', mode: 'insensitive' } },
        { originalTitle: { contains: 'heat', mode: 'insensitive' } },
      ],
    });
    expect(call.orderBy).toEqual({ title: 'asc' });
    expect(call.take).toBe(20);
  });

  it('honours a custom limit', async () => {
    mocks.prisma.movie.findMany.mockResolvedValue([]);
    await searchInternalMoviesByName('heat', 8);
    expect(mocks.prisma.movie.findMany.mock.calls[0][0].take).toBe(8);
  });
});

describe('lookups', () => {
  it('findMovieByImdbId uses the exact IMDb id', async () => {
    mocks.prisma.movie.findUnique.mockResolvedValue(card);
    await expect(findMovieByImdbId('tt0113277')).resolves.toBe(card);
    expect(mocks.prisma.movie.findUnique.mock.calls[0][0].where).toEqual({ imdbId: 'tt0113277' });
  });

  it.each([
    ['genres', getAllGenres, mocks.prisma.genre],
    ['directors', getAllDirectors, mocks.prisma.director],
    ['countries', getAllCountries, mocks.prisma.country],
  ])('%s are listed alphabetically for the filter dropdowns', async (_label, fn, model) => {
    model.findMany.mockResolvedValue([{ id: 1 }]);
    await expect(fn()).resolves.toEqual([{ id: 1 }]);
    expect(model.findMany.mock.calls[0][0].orderBy).toEqual({ name: 'asc' });
  });
});
