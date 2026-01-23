import { prisma } from '@/lib/db';
import type { List } from '@prisma/client';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { getMovieById, getMovieDetailsFull } from '@/lib/tmdb';
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
  title: z.string().optional(),
  // Accept both array and string for genre filter
  genre: z.preprocess(
    (val) => {
      if (Array.isArray(val)) {
        return val.join(',');
      }
      return val;
    },
    z.string().optional()
  ),
  // Accept both array and string for director filter
  director: z.preprocess(
    (val) => {
      if (Array.isArray(val)) {
        return val.join(',');
      }
      return val;
    },
    z.string().optional()
  ),
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
  title,
  genre,
  director,
}: ListMoviesInput) {
  // Parse genre filter
  const genreNames = Array.isArray(genre)
    ? genre.filter(Boolean)
    : genre
    ? genre
        .split(',')
        .map((g) => g.trim())
        .filter(Boolean)
    : [];

  // Parse director filter
  const directorNames = Array.isArray(director)
    ? director.filter(Boolean)
    : director
    ? director
        .split(',')
        .map((d) => d.trim())
        .filter(Boolean)
    : [];

  // Build the where clause for movies in this list
  const movieWhereClause: Prisma.MovieWhereInput = {
    MovieList: {
      some: {
        listId,
      },
    },
    ...(title && {
      OR: [
        { title: { contains: title, mode: 'insensitive' } },
        { originalTitle: { contains: title, mode: 'insensitive' } },
      ],
    }),
    ...(genreNames.length > 0 && {
      genres: {
        some: {
          genre: {
            name: {
              in: genreNames,
            },
          },
        },
      },
    }),
    ...(directorNames.length > 0 && {
      directors: {
        some: {
          director: {
            name: {
              in: directorNames,
            },
          },
        },
      },
    }),
  };

  const [movies, count] = await Promise.all([
    prisma.movie.findMany({
      where: movieWhereClause,
      take,
      skip,
      orderBy: {
        title: 'asc',
      },
    }),
    prisma.movie.count({
      where: movieWhereClause,
    }),
  ]);

  return {
    movies,
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
      // Fetch full details including genres and directors
      const details = await getMovieDetailsFull(movieData.id);
      return {
        ...movieData,
        details: details || null,
      };
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
    let createdMovies: typeof existingMovies = [];
    if (newMoviesData.length > 0) {
      createdMovies = await Promise.all(
        newMoviesData.map(async (movieData) => {
          const movie = await tx.movie.create({
            data: {
              title: movieData.title,
              originalTitle: movieData.original_title,
              originalLanguage: movieData.original_language,
              releaseDate: new Date(movieData.release_date ?? new Date()),
              letterboxdUrl: `https://letterboxd.com/tmdb/${movieData.id}`,
              imdbId: movieData.imdbId,
              posterUrl: movieData.poster_path || '',
              tmdbId: movieData.id,
            },
          });

          // Process genres and directors if details are available
          if (movieData.details) {
            // Process genres
            for (const genreData of movieData.details.genres) {
              // Find or create genre
              let genre = await tx.genre.findUnique({
                where: { name: genreData.name },
              });

              if (!genre) {
                genre = await tx.genre.create({
                  data: {
                    name: genreData.name,
                    tmdbId: genreData.id,
                  },
                });
              } else if (!genre.tmdbId && genreData.id) {
                // Update genre with TMDB ID if missing
                await tx.genre.update({
                  where: { id: genre.id },
                  data: { tmdbId: genreData.id },
                });
              }

              // Link movie to genre
              await tx.movieGenre.upsert({
                where: {
                  movieId_genreId: {
                    movieId: movie.id,
                    genreId: genre.id,
                  },
                },
                create: {
                  movieId: movie.id,
                  genreId: genre.id,
                },
                update: {},
              });
            }

            // Process directors
            for (const directorData of movieData.details.directors) {
              // Find or create director
              let director = await tx.director.findUnique({
                where: { name: directorData.name },
              });

              if (!director) {
                director = await tx.director.create({
                  data: {
                    name: directorData.name,
                    tmdbId: directorData.id || undefined,
                  },
                });
              } else if (!director.tmdbId && directorData.id) {
                // Update director with TMDB ID if missing
                await tx.director.update({
                  where: { id: director.id },
                  data: { tmdbId: directorData.id },
                });
              }

              // Link movie to director
              await tx.movieDirector.upsert({
                where: {
                  movieId_directorId: {
                    movieId: movie.id,
                    directorId: director.id,
                  },
                },
                create: {
                  movieId: movie.id,
                  directorId: director.id,
                },
                update: {},
              });
            }
          }

          return movie;
        })
      );
    }

    // Get all movies (both existing and newly created)
    const allMovies = [...existingMovies, ...createdMovies];

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
