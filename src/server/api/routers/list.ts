import { z } from "zod";

import {
  createTRPCRouter,
  publicProcedure,
  privateProcedure,
} from "~/server/api/trpc";

export interface TMDBMovieResponse {
  movie_results: MovieResult[];
}

export interface MovieResult {
  id: number;
  title: string;
  release_date: string;
  original_language: string;
  original_title: string;
  poster_path: string;
  imdbId: string;
}

const movieValidator = (movie: TMDBMovieResponse) => {
  return Boolean(movie?.movie_results?.[0]);
};
const getMovieById = async (imdbId: string) => {
  try {
    const response = await fetch(
      `https://api.themoviedb.org/3/find/${imdbId}?api_key=${process.env.TMDB_API_KEY}&external_source=imdb_id`,
    );
    if (!response.ok) {
      throw new Error("Failed to fetch data");
    }
    const result = (await response.json()) as TMDBMovieResponse;

    if (!movieValidator(result)) {
      throw new Error("Invalid movie data received from TMDB API");
    }

    const movieData = result.movie_results[0];
    if (!movieData) {
      throw new Error("No movie data found");
    }

    return {
      id: movieData.id,
      title: movieData.title,
      release_date: movieData.release_date,
      original_language: movieData.original_language,
      original_title: movieData.original_title,
      poster_path: movieData.poster_path,
      imdbId: imdbId,
    };
  } catch (error) {
    console.error(`Error fetching data for IMDb ID ${imdbId}:`, error);
    return null;
  }
};

export const listRouter = createTRPCRouter({
  getAll: publicProcedure.query(({ ctx }) => {
    return ctx.db.list.findMany({
      orderBy: { createdAt: "desc" },
    });
  }),

  getById: privateProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const list = await ctx.db.list.findUnique({
        where: { id: input.id },
        include: {
          movies: {
            include: {
              movie: true,
            },
          },
        },
      });

      const movies = list?.movies.map((movieList) => movieList.movie);

      return { ...list, movies };
    }),

  create: privateProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string(),
        letterboxdUrl: z.string(),
        imgUrl: z.string(),
        createdBy: z.string(),
        tags: z.string(),
        imdbIds: z.array(z.string()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const newList = await ctx.db.list.create({
        data: {
          name: input.name,
          description: input.description,
          letterboxdUrl: input.letterboxdUrl,
          imgUrl: input.imgUrl,
          createdBy: input.createdBy,
          tags: input.tags,
        },
      });

      // Fetch data for each movie from TMDB API
      const moviesData = await Promise.all(
        input.imdbIds.map(async (imdbId) => await getMovieById(imdbId)),
      );

      const moviesList = moviesData.map((movieData) => {
        return {
          title: movieData!.title,
          originalTitle: movieData!.original_title,
          originalLanguage: movieData!.original_language,
          releaseDate: new Date(movieData!.release_date ?? new Date()),
          letterboxdUrl: `https://letterboxd.com/tmdb/${movieData!.id}`,
          imdbId: movieData!.imdbId,
          posterUrl: movieData!.poster_path,
        };
      });

      const createdMovies = await ctx.db.$transaction(
        moviesList.map((movie) =>
          ctx.db.movie.upsert({
            where: { imdbId: movie.imdbId },
            create: movie,
            update: {},
          }),
        ),
      );

      const movieList = createdMovies.map((movie) => {
        return {
          movieId: movie.id,
          listId: newList.id,
        };
      });

      await ctx.db.movieList.createMany({
        data: movieList,
      });

      return newList;
    }),

  checkMovies: publicProcedure.query(({ ctx }) => {
    // Need to check if a movie is in more than one list
    return ctx.db.movieList.groupBy({
      by: ["movieId"],
      having: {
        movieId: {
          _count: {
            gt: 1,
          },
        },
      },
    });
  }),
});
