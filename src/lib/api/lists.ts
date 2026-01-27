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
  // Accept both array and string for country filter (country codes)
  country: z.preprocess(
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
  country,
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

  // Parse country filter (country codes)
  const countryCodes = Array.isArray(country)
    ? country.filter(Boolean)
    : country
    ? country
        .split(',')
        .map((c) => c.trim().toUpperCase())
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
    ...(countryCodes.length > 0 && {
      countries: {
        some: {
          country: {
            code: {
              in: countryCodes,
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

  // Now do all database operations in a transaction with increased timeout
  // Increase timeout to 60 seconds to handle large batches of movies in production
  // Process in batches to avoid hitting database limits
  const BATCH_SIZE = 50; // Process movies in batches of 50
  
  return await prisma.$transaction(
    async (tx) => {
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
        // First, collect all unique genres, directors and countries from all movies
        const allGenres = new Map<string, { name: string; tmdbId: number }>();
        const allDirectors = new Map<string, { name: string; tmdbId?: number }>();
        const allCountries = new Map<string, { code: string; name: string }>();
        const movieGenreMap = new Map<number, string[]>(); // movie index -> genre names
        const movieDirectorMap = new Map<number, string[]>(); // movie index -> director names
        const movieCountryMap = new Map<number, string[]>(); // movie index -> country codes

        newMoviesData.forEach((movieData, index) => {
          if (movieData.details) {
            movieData.details.genres.forEach((genre) => {
              allGenres.set(genre.name, { name: genre.name, tmdbId: genre.id });
              if (!movieGenreMap.has(index)) {
                movieGenreMap.set(index, []);
              }
              movieGenreMap.get(index)!.push(genre.name);
            });

            movieData.details.directors.forEach((director) => {
              allDirectors.set(director.name, {
                name: director.name,
                tmdbId: director.id,
              });
              if (!movieDirectorMap.has(index)) {
                movieDirectorMap.set(index, []);
              }
              movieDirectorMap.get(index)!.push(director.name);
            });

            movieData.details.countries?.forEach((country) => {
              const code = country.code.trim().toUpperCase();
              if (!code) return;
              allCountries.set(code, {
                code,
                name: country.name,
              });
              if (!movieCountryMap.has(index)) {
                movieCountryMap.set(index, []);
              }
              movieCountryMap.get(index)!.push(code);
            });
          }
        });

        // Batch fetch existing genres, directors and countries
        const existingGenres = await tx.genre.findMany({
          where: {
            name: {
              in: Array.from(allGenres.keys()),
            },
          },
        });
        const existingDirectors = await tx.director.findMany({
          where: {
            name: {
              in: Array.from(allDirectors.keys()),
            },
          },
        });
        const existingCountries = await tx.country.findMany({
          where: {
            code: {
              in: Array.from(allCountries.keys()),
            },
          },
        });

        const existingGenreMap = new Map(
          existingGenres.map((g) => [g.name, g])
        );
        const existingDirectorMap = new Map(
          existingDirectors.map((d) => [d.name, d])
        );
        const existingCountryMap = new Map(
          existingCountries.map((c) => [c.code, c])
        );

        // Create missing genres, directors, countries and update those missing tmdbId
        const genresToCreate = Array.from(allGenres.values()).filter(
          (g) => !existingGenreMap.has(g.name)
        );
        const directorsToCreate = Array.from(allDirectors.values()).filter(
          (d) => !existingDirectorMap.has(d.name)
        );
        const countriesToCreate = Array.from(allCountries.values()).filter(
          (c) => !existingCountryMap.has(c.code)
        );

        if (genresToCreate.length > 0) {
          await tx.genre.createMany({
            data: genresToCreate.map((g) => ({
              name: g.name,
              tmdbId: g.tmdbId,
            })),
            skipDuplicates: true,
          });
        }

        if (directorsToCreate.length > 0) {
          await tx.director.createMany({
            data: directorsToCreate.map((d) => ({
              name: d.name,
              tmdbId: d.tmdbId,
            })),
            skipDuplicates: true,
          });
        }

        if (countriesToCreate.length > 0) {
          await tx.country.createMany({
            data: countriesToCreate.map((c) => ({
              code: c.code,
              name: c.name,
            })),
            skipDuplicates: true,
          });
        }

        // Update genres and directors missing tmdbId
        const genresToUpdate = existingGenres.filter(
          (g) => !g.tmdbId && allGenres.get(g.name)?.tmdbId
        );
        const directorsToUpdate = existingDirectors.filter(
          (d) => !d.tmdbId && allDirectors.get(d.name)?.tmdbId
        );

        await Promise.all([
          ...genresToUpdate.map((g) =>
            tx.genre.update({
              where: { id: g.id },
              data: { tmdbId: allGenres.get(g.name)!.tmdbId },
            })
          ),
          ...directorsToUpdate.map((d) =>
            tx.director.update({
              where: { id: d.id },
              data: { tmdbId: allDirectors.get(d.name)!.tmdbId },
            })
          ),
        ]);

        // Refresh genre, director and country maps after creates/updates
        const allGenresAfter = await tx.genre.findMany({
          where: {
            name: {
              in: Array.from(allGenres.keys()),
            },
          },
        });
        const allDirectorsAfter = await tx.director.findMany({
          where: {
            name: {
              in: Array.from(allDirectors.keys()),
            },
          },
        });
        const allCountriesAfter = await tx.country.findMany({
          where: {
            code: {
              in: Array.from(allCountries.keys()),
            },
          },
        });

        const genreMap = new Map(allGenresAfter.map((g) => [g.name, g]));
        const directorMap = new Map(allDirectorsAfter.map((d) => [d.name, d]));
        const countryMap = new Map(allCountriesAfter.map((c) => [c.code, c]));

        // Create all movies in batches to avoid overwhelming the database
        createdMovies = [];
        for (let i = 0; i < newMoviesData.length; i += BATCH_SIZE) {
          const batch = newMoviesData.slice(i, i + BATCH_SIZE);
          const batchResults = await Promise.all(
            batch.map((movieData) =>
              tx.movie.create({
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
              })
            )
          );
          createdMovies.push(...batchResults);
        }

        // Batch create movie-genre, movie-director and movie-country relations
        const movieGenreRelations: Array<{ movieId: number; genreId: number }> =
          [];
        const movieDirectorRelations: Array<{
          movieId: number;
          directorId: number;
        }> = [];
        const movieCountryRelations: Array<{
          movieId: number;
          countryId: number;
        }> = [];

        createdMovies.forEach((movie, index) => {
          const genreNames = movieGenreMap.get(index) || [];
          const directorNames = movieDirectorMap.get(index) || [];
          const countryCodes = movieCountryMap.get(index) || [];

          genreNames.forEach((genreName) => {
            const genre = genreMap.get(genreName);
            if (genre) {
              movieGenreRelations.push({
                movieId: movie.id,
                genreId: genre.id,
              });
            }
          });

          directorNames.forEach((directorName) => {
            const director = directorMap.get(directorName);
            if (director) {
              movieDirectorRelations.push({
                movieId: movie.id,
                directorId: director.id,
              });
            }
          });

          countryCodes.forEach((code) => {
            const country = countryMap.get(code);
            if (country) {
              movieCountryRelations.push({
                movieId: movie.id,
                countryId: country.id,
              });
            }
          });
        });

        // Use createMany with skipDuplicates to avoid conflicts
        // Process in batches to avoid hitting PostgreSQL's parameter limit (65535)
        const RELATION_BATCH_SIZE = 1000;
        
        if (movieGenreRelations.length > 0) {
          for (let i = 0; i < movieGenreRelations.length; i += RELATION_BATCH_SIZE) {
            const batch = movieGenreRelations.slice(i, i + RELATION_BATCH_SIZE);
            await tx.movieGenre.createMany({
              data: batch,
              skipDuplicates: true,
            });
          }
        }

        if (movieDirectorRelations.length > 0) {
          for (let i = 0; i < movieDirectorRelations.length; i += RELATION_BATCH_SIZE) {
            const batch = movieDirectorRelations.slice(i, i + RELATION_BATCH_SIZE);
            await tx.movieDirector.createMany({
              data: batch,
              skipDuplicates: true,
            });
          }
        }

        if (movieCountryRelations.length > 0) {
          for (let i = 0; i < movieCountryRelations.length; i += RELATION_BATCH_SIZE) {
            const batch = movieCountryRelations.slice(i, i + RELATION_BATCH_SIZE);
            await tx.movieCountry.createMany({
              data: batch,
              skipDuplicates: true,
            });
          }
        }
      }

      // Get all movies (both existing and newly created)
      const allMovies = [...existingMovies, ...createdMovies];

      // Create movie-list relations in batches
      if (allMovies.length > 0) {
        const RELATION_BATCH_SIZE = 1000;
        const movieListRelations = allMovies.map((movie) => ({
          movieId: movie.id,
          listId: list.id,
        }));
        
        for (let i = 0; i < movieListRelations.length; i += RELATION_BATCH_SIZE) {
          const batch = movieListRelations.slice(i, i + RELATION_BATCH_SIZE);
          await tx.movieList.createMany({
            data: batch,
            skipDuplicates: true,
          });
        }
      }

      return list;
    },
    {
      timeout: 60000, // 60 seconds timeout for large lists
      maxWait: 20000, // 20 seconds max wait
    }
  );
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
      countries: {
        include: {
          country: true,
        },
      },
    },
  });

  if (!movie) {
    return null;
  }

  const countryNames = movie.countries
    .map((mc) => mc.country.name)
    .filter(Boolean)
    .sort();

  const countryCodes = movie.countries
    .map((mc) => mc.country.code)
    .filter(Boolean)
    .map((code) => code.toUpperCase())
    .sort();

  return {
    ...movie,
    picks: movie.mamPicks,
    countries: countryNames,
    countryCodes,
    averageScore: movie.mamAverageScore,
    totalPicks: movie.mamTotalPicks,
    totalPoints: movie.mamTotalPoints,
    rank: movie.mamRank ?? undefined,
  } as MamMovieWithPicks;
}
