import { env } from '@/env';

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

export async function getMovieById(imdbId: string) {
  try {
    const response = await fetch(
      `https://api.themoviedb.org/3/find/${imdbId}?api_key=${env.TMDB_API_KEY}&external_source=imdb_id`
    );

    if (!response.ok) {
      throw new Error('Error al buscar la película en TMDB');
    }

    const result = (await response.json()) as TMDBMovieResponse;

    if (!movieValidator(result)) {
      throw new Error('Datos de película inválidos recibidos de TMDB API');
    }

    const movieData = result.movie_results[0];
    if (!movieData) {
      throw new Error(`No se encontró la película con ID ${imdbId}`);
    }

    return {
      id: movieData.id,
      title: movieData.title,
      release_date: movieData.release_date,
      original_language: movieData.original_language,
      original_title: movieData.original_title,
      poster_path: movieData.poster_path
        ? `https://image.tmdb.org/t/p/original${movieData.poster_path}`
        : '',
      imdbId,
    };
  } catch (error) {
    console.error(`Error fetching data for IMDb ID ${imdbId}:`, error);
    return null;
  }
}
