import { beforeEach, describe, expect, it, vi } from 'vitest';

const tmdb = vi.hoisted(() => ({
  getMovieById: vi.fn(),
  getMovieDetailsFull: vi.fn(),
}));
vi.mock('@/lib/tmdb', () => tmdb);

import { prisma, resetDatabase } from '../../../tests/integration/db';
import { createMovie } from '../../../tests/integration/factories';
import {
  findMovieByImdbId,
  findOrCreateMovieByImdbId,
  getAllCountries,
  getAllGenres,
  searchInternalMoviesByName,
} from './movies';

const tmdbMovie = (tmdbId: number, imdbId: string, title = `TMDB ${tmdbId}`) => ({
  id: tmdbId,
  title,
  original_title: `${title} (orig)`,
  original_language: 'en',
  release_date: '1995-12-15',
  poster_path: `https://image.tmdb.org/t/p/original/${tmdbId}.jpg`,
  imdbId,
});

const details = (overrides: Partial<{ genres: unknown[]; directors: unknown[]; countries: unknown[] }> = {}) => ({
  tmdbId: 0,
  genres: [{ id: 80, name: 'Crime' }],
  directors: [{ id: 1, name: 'Michael Mann' }],
  countries: [{ code: ' us ', name: 'United States of America' }],
  ...overrides,
});

beforeEach(async () => {
  await resetDatabase();
  tmdb.getMovieById.mockImplementation(async (imdbId: string) =>
    imdbId === 'tt0113277' ? tmdbMovie(949, imdbId, 'Heat') : null
  );
  tmdb.getMovieDetailsFull.mockResolvedValue(details());
});

describe('findOrCreateMovieByImdbId', () => {
  it('imports a movie from TMDB together with its genres, directors and countries', async () => {
    const movie = await findOrCreateMovieByImdbId('tt0113277');

    expect(movie).toMatchObject({ title: 'Heat', imdbId: 'tt0113277', tmdbId: 949 });

    const stored = await prisma.movie.findUniqueOrThrow({
      where: { imdbId: 'tt0113277' },
      include: {
        genres: { include: { genre: true } },
        directors: { include: { director: true } },
        countries: { include: { country: true } },
      },
    });
    expect(stored.letterboxdUrl).toBe('https://letterboxd.com/tmdb/949');
    expect(stored.releaseDate).toEqual(new Date('1995-12-15'));
    expect(stored.genres.map((g) => g.genre.name)).toEqual(['Crime']);
    expect(stored.directors.map((d) => d.director.name)).toEqual(['Michael Mann']);
    // Country codes are normalised before being stored.
    expect(stored.countries.map((c) => c.country.code)).toEqual(['US']);
  });

  it('returns the stored movie without calling TMDB the second time', async () => {
    const first = await findOrCreateMovieByImdbId('tt0113277');
    tmdb.getMovieById.mockClear();

    const second = await findOrCreateMovieByImdbId('tt0113277');

    expect(second.id).toBe(first.id);
    expect(tmdb.getMovieById).not.toHaveBeenCalled();
    expect(await prisma.movie.count()).toBe(1);
  });

  it('still imports the movie when TMDB has no extra details', async () => {
    tmdb.getMovieDetailsFull.mockResolvedValue(null);

    await findOrCreateMovieByImdbId('tt0113277');

    expect(await prisma.movie.count()).toBe(1);
    expect(await prisma.movieGenre.count()).toBe(0);
  });

  it('fails without writing anything when TMDB does not know the id', async () => {
    await expect(findOrCreateMovieByImdbId('tt9999999')).rejects.toThrow(/en TMDB/);
    expect(await prisma.movie.count()).toBe(0);
  });

  it('shares genres between movies instead of duplicating them', async () => {
    tmdb.getMovieById.mockImplementation(async (imdbId: string) =>
      imdbId === 'tt0000001' ? tmdbMovie(1, imdbId) : tmdbMovie(2, imdbId)
    );

    await findOrCreateMovieByImdbId('tt0000001');
    await findOrCreateMovieByImdbId('tt0000002');

    expect(await prisma.movie.count()).toBe(2);
    expect(await prisma.genre.count()).toBe(1);
    expect(await prisma.movieGenre.count()).toBe(2);
    expect(await prisma.country.count()).toBe(1);
  });

  it('survives two simultaneous imports of the same movie (one row, both callers get it)', async () => {
    const [a, b] = await Promise.all([
      findOrCreateMovieByImdbId('tt0113277'),
      findOrCreateMovieByImdbId('tt0113277'),
    ]);

    expect(a.id).toBe(b.id);
    expect(await prisma.movie.count()).toBe(1);
    expect(await prisma.movieGenre.count()).toBe(1);
  });

  it('returns the existing movie when TMDB maps a new IMDb id onto a TMDB id we already stored', async () => {
    const existing = await createMovie({ imdbId: 'tt0000777', tmdbId: 949, title: 'Heat (stored)' });

    const movie = await findOrCreateMovieByImdbId('tt0113277');

    expect(movie.id).toBe(existing.id);
    expect(await prisma.movie.count()).toBe(1);
  });
});

describe('searching and lookups', () => {
  it('searches title and original title case-insensitively, sorted by title', async () => {
    await createMovie({ title: 'Heat', originalTitle: 'Heat' });
    await createMovie({ title: 'La Haine', originalTitle: 'HEAT of the moment' });
    await createMovie({ title: 'Ronin', originalTitle: 'Ronin' });
    await createMovie({ title: 'Heatwave', originalTitle: 'Heatwave' });

    const results = await searchInternalMoviesByName('heat');

    expect(results.map((m) => m.title)).toEqual(['Heat', 'Heatwave', 'La Haine']);
  });

  it('applies the result limit', async () => {
    for (let i = 0; i < 5; i++) await createMovie({ title: `Heat ${i}` });
    await expect(searchInternalMoviesByName('heat', 3)).resolves.toHaveLength(3);
  });

  it('finds movies by exact IMDb id only', async () => {
    const movie = await createMovie({ imdbId: 'tt0113277' });
    await expect(findMovieByImdbId('tt0113277')).resolves.toMatchObject({ id: movie.id });
    await expect(findMovieByImdbId('tt011327')).resolves.toBeNull();
  });

  it('lists filter options alphabetically', async () => {
    await prisma.genre.createMany({ data: [{ name: 'Drama', tmdbId: 18 }, { name: 'Crime', tmdbId: 80 }] });
    await prisma.country.createMany({
      data: [
        { code: 'US', name: 'United States' },
        { code: 'AR', name: 'Argentina' },
      ],
    });

    expect((await getAllGenres()).map((g) => g.name)).toEqual(['Crime', 'Drama']);
    expect((await getAllCountries()).map((c) => c.name)).toEqual(['Argentina', 'United States']);
  });
});
