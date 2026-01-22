import { prisma } from '@/lib/db';
import type { List } from '@prisma/client';
import { z } from 'zod';
import { getMovieById } from '@/lib/tmdb';
import { CreateListFormValues } from '@/lib/validations/lists';
import type { MamMovieWithPicks } from '@/lib/validations/mam';

export async function getLists(): Promise<List[]> {
  return await prisma.list.findMany({
    orderBy: {
      createdAt: 'desc',
    },
  });
}

export const listIdSchema = z.object({
  id: z.number().int().positive(),
});

export const listMoviesSchema = z.object({
  listId: z.number().int().positive(),
  take: z.number().int().positive().default(20),
  skip: z.number().int().nonnegative().default(0),
});

export type ListIdInput = z.infer<typeof listIdSchema>;
export type ListMoviesInput = z.infer<typeof listMoviesSchema>;

export async function getListById({ id }: ListIdInput) {
  return await prisma.list.findUnique({
    where: { id },
  });
}

export async function getListMovies({
  listId,
  take = 20,
  skip = 0,
}: ListMoviesInput) {
  const [movies, count] = await Promise.all([
    prisma.movieList.findMany({
      where: { listId },
      include: { movie: true },
      take,
      skip,
    }),
    prisma.movieList.count({
      where: { listId },
    }),
  ]);

  return {
    movies: movies.map((movieList) => movieList.movie),
    totalMovies: count,
    hasMore: skip + take < count,
  };
}

export async function createList({ data }: { data: CreateListFormValues }) {
  const movieIds = data.movies.split(',').map((id) => id.trim());

  if (movieIds.length === 0) {
    throw new Error('No se proporcionaron IDs de IMDB');
  }

  // Find existing movies first to avoid fetching their data unnecessarily
  const existingMovies = await prisma.movie.findMany({
    where: {
      imdbId: {
        in: movieIds,
      },
    },
  });

  const existingMovieIds = new Set(existingMovies.map((m) => m.imdbId));
  const newMovieIds = movieIds.filter((id) => !existingMovieIds.has(id));

  // Fetch data for new movies
  const newMoviesData = await Promise.all(
    newMovieIds.map(async (imdbId) => {
      const movieData = await getMovieById(imdbId);
      if (!movieData) {
        throw new Error(
          `No se pudo obtener la información de la película ${imdbId}`
        );
      }
      return movieData;
    })
  );

  // Now do all database operations in a transaction
  return await prisma.$transaction(async (tx) => {
    // Create the list first to get a valid ID
    const list = await tx.list.create({
      data: {
        name: data.name,
        description: data.description,
        letterboxdUrl: data.letterboxdUrl,
        imgUrl: data.imgUrl,
        tags: data.tags,
        createdBy: data.createdBy,
      },
    });

    // Create new movies if any
    if (newMoviesData.length > 0) {
      await tx.movie.createMany({
        data: newMoviesData.map((movieData) => ({
          title: movieData.title,
          originalTitle: movieData.original_title,
          originalLanguage: movieData.original_language,
          releaseDate: new Date(movieData.release_date ?? new Date()),
          letterboxdUrl: `https://letterboxd.com/tmdb/${movieData.id}`,
          imdbId: movieData.imdbId,
          posterUrl: movieData.poster_path || '',
        })),
        skipDuplicates: true,
      });
    }

    // Get all movies (both existing and newly created)
    const allMovies = await tx.movie.findMany({
      where: {
        imdbId: {
          in: movieIds,
        },
      },
    });

    // Create movie-list relations
    if (allMovies.length > 0) {
      await tx.movieList.createMany({
        data: allMovies.map((movie) => ({
          movieId: movie.id,
          listId: list.id,
        })),
      });
    }

    return list;
  });
}

/**
 * Get lists that contain a specific movie
 */
export async function getListsContainingMovie(movieId: number) {
  const movieLists = await prisma.movieList.findMany({
    where: { movieId },
    include: {
      list: true,
    },
  });

  return movieLists.map((ml) => ml.list);
}

/**
 * Get a movie by ID with optional MAM picks
 * Returns movie data in format compatible with MamMovieDetail component
 */
export async function getListMovieById(
  movieId: number
): Promise<MamMovieWithPicks | null> {
  const movie = await prisma.movie.findUnique({
    where: { id: movieId },
    include: {
      mamPicks: {
        include: {
          participant: {
            include: {
              user: {
                select: {
                  image: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: [{ score: 'desc' }, { createdAt: 'asc' }],
      },
    },
  });

  if (!movie) {
    return null;
  }

  return {
    ...movie,
    picks: movie.mamPicks,
    averageScore: movie.mamAverageScore,
    totalPicks: movie.mamTotalPicks,
    totalPoints: movie.mamTotalPoints,
    rank: movie.mamRank ?? undefined,
  } as MamMovieWithPicks;
}
