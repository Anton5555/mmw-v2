import { prisma } from '@/lib/db';
import { getMovieById, getMovieDetailsFull } from '@/lib/tmdb';

/**
 * Get all unique genres for filter dropdowns
 */
export async function getAllGenres() {
  'use cache';
  return await prisma.genre.findMany({
    orderBy: {
      name: 'asc',
    },
    select: {
      id: true,
      name: true,
    },
  });
}

/**
 * Get all unique directors for filter dropdowns
 */
export async function getAllDirectors() {
  'use cache';
  return await prisma.director.findMany({
    orderBy: {
      name: 'asc',
    },
    select: {
      id: true,
      name: true,
    },
  });
}

/**
 * Get all countries for filter dropdowns
 */
export async function getAllCountries() {
  'use cache';
  return await prisma.country.findMany({
    orderBy: {
      name: 'asc',
    },
    select: {
      id: true,
      code: true,
      name: true,
    },
  });
}

const movieCardSelect = {
  id: true,
  title: true,
  originalTitle: true,
  originalLanguage: true,
  releaseDate: true,
  posterUrl: true,
  imdbId: true,
  tmdbId: true,
} as const;

export type MovieCardData = {
  id: number;
  title: string;
  originalTitle: string;
  originalLanguage: string;
  releaseDate: Date;
  posterUrl: string;
  imdbId: string;
  tmdbId: number | null;
};

/**
 * Find a movie by IMDb ID in the internal DB, or fetch from TMDB and persist it.
 * Handles race conditions (P2002) by re-reading the existing row.
 */
export async function findOrCreateMovieByImdbId(
  imdbId: string
): Promise<MovieCardData> {
  const existing = await prisma.movie.findUnique({
    where: { imdbId },
    select: movieCardSelect,
  });

  if (existing) {
    return existing;
  }

  const movieData = await getMovieById(imdbId);
  if (!movieData) {
    throw new Error(
      `No se encontró la película con ID de IMDb ${imdbId} en TMDB`
    );
  }

  const details = await getMovieDetailsFull(movieData.id);

  try {
    return await prisma.$transaction(async (tx) => {
      const genres = details?.genres ?? [];
      const directors = details?.directors ?? [];
      const countries = details?.countries ?? [];

      if (genres.length > 0) {
        await tx.genre.createMany({
          data: genres.map((g) => ({ name: g.name, tmdbId: g.id })),
          skipDuplicates: true,
        });
      }

      if (directors.length > 0) {
        await tx.director.createMany({
          data: directors.map((d) => ({ name: d.name, tmdbId: d.id })),
          skipDuplicates: true,
        });
      }

      if (countries.length > 0) {
        await tx.country.createMany({
          data: countries
            .map((c) => ({
              code: c.code.trim().toUpperCase(),
              name: c.name,
            }))
            .filter((c) => c.code),
          skipDuplicates: true,
        });
      }

      const movie = await tx.movie.create({
        data: {
          title: movieData.title,
          originalTitle: movieData.original_title,
          originalLanguage: movieData.original_language,
          releaseDate: new Date(movieData.release_date || Date.now()),
          letterboxdUrl: `https://letterboxd.com/tmdb/${movieData.id}`,
          imdbId: movieData.imdbId,
          posterUrl: movieData.poster_path || '',
          tmdbId: movieData.id,
        },
        select: movieCardSelect,
      });

      if (genres.length > 0) {
        const genreRows = await tx.genre.findMany({
          where: { name: { in: genres.map((g) => g.name) } },
          select: { id: true, name: true },
        });
        await tx.movieGenre.createMany({
          data: genreRows.map((g) => ({ movieId: movie.id, genreId: g.id })),
          skipDuplicates: true,
        });
      }

      if (directors.length > 0) {
        const directorRows = await tx.director.findMany({
          where: { name: { in: directors.map((d) => d.name) } },
          select: { id: true, name: true },
        });
        await tx.movieDirector.createMany({
          data: directorRows.map((d) => ({
            movieId: movie.id,
            directorId: d.id,
          })),
          skipDuplicates: true,
        });
      }

      if (countries.length > 0) {
        const codes = countries
          .map((c) => c.code.trim().toUpperCase())
          .filter(Boolean);
        const countryRows = await tx.country.findMany({
          where: { code: { in: codes } },
          select: { id: true, code: true },
        });
        await tx.movieCountry.createMany({
          data: countryRows.map((c) => ({
            movieId: movie.id,
            countryId: c.id,
          })),
          skipDuplicates: true,
        });
      }

      return movie;
    });
  } catch (error: unknown) {
    // Concurrent insert of the same movie — re-read and return
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'P2002'
    ) {
      const raced = await prisma.movie.findUnique({
        where: { imdbId },
        select: movieCardSelect,
      });
      if (raced) {
        return raced;
      }

      // Unique conflict on tmdbId with a different imdbId — try by tmdbId
      if (movieData.id) {
        const byTmdb = await prisma.movie.findUnique({
          where: { tmdbId: movieData.id },
          select: movieCardSelect,
        });
        if (byTmdb) {
          return byTmdb;
        }
      }
    }
    throw error;
  }
}

/**
 * Search internal movie database by title / originalTitle (case-insensitive contains).
 */
export async function searchInternalMoviesByName(
  query: string,
  limit = 20
): Promise<MovieCardData[]> {
  return prisma.movie.findMany({
    where: {
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { originalTitle: { contains: query, mode: 'insensitive' } },
      ],
    },
    select: movieCardSelect,
    orderBy: { title: 'asc' },
    take: limit,
  });
}

/**
 * Find a movie in the internal DB by exact IMDb ID.
 */
export async function findMovieByImdbId(
  imdbId: string
): Promise<MovieCardData | null> {
  return prisma.movie.findUnique({
    where: { imdbId },
    select: movieCardSelect,
  });
}
