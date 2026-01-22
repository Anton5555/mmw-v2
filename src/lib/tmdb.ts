import { cacheLife } from 'next/cache';
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
  "use cache";
  cacheLife('hours'); // Movie data from TMDB doesn't change frequently
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

export interface TMDBMovieDetailsResponse {
  id: number;
  genres: Array<{ id: number; name: string }>;
  credits?: {
    crew: Array<{ job: string; name: string }>;
  };
}

export interface MovieDetails {
  director?: string;
  genre?: string;
}

export interface TMDBMovieSearchResult {
  id: number;
  title: string;
  release_date: string;
  original_language: string;
  original_title: string;
  poster_path: string | null;
}

export interface TMDBMovieSearchResponse {
  results: TMDBMovieSearchResult[];
  total_results: number;
  total_pages: number;
}

/**
 * Search for movies by name using TMDB API
 * @param query Movie name to search for
 * @param year Optional year to filter results
 * @returns Array of matching movies, or null if error
 */
export async function searchMovieByName(
  query: string,
  year?: number
): Promise<TMDBMovieSearchResult[] | null> {
  try {
    let url = `https://api.themoviedb.org/3/search/movie?api_key=${env.TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=es-ES`;
    if (year) {
      url += `&year=${year}`;
    }

    const response = await fetch(url);

    if (!response.ok) {
      console.error(`TMDB search API error: ${response.status}`);
      return null;
    }

    const data = (await response.json()) as TMDBMovieSearchResponse;
    return data.results || [];
  } catch (error) {
    console.error(`Error searching TMDB for "${query}":`, error);
    return null;
  }
}

/**
 * Get movie details (director and genre) from TMDB by TMDB movie ID
 */
export async function getMovieDetails(tmdbId: number): Promise<MovieDetails | null> {
  "use cache";
  cacheLife('hours'); // Movie details from TMDB don't change frequently
  try {
    const response = await fetch(
      `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${env.TMDB_API_KEY}&append_to_response=credits`
    );

    if (!response.ok) {
      console.error(`TMDB API error for movie ${tmdbId}: ${response.status}`);
      return null;
    }

    const data = (await response.json()) as TMDBMovieDetailsResponse;

    // Get director from credits.crew
    const director =
      data.credits?.crew.find((person) => person.job === 'Director')?.name ||
      undefined;

    // Get first genre name
    const genre = data.genres?.[0]?.name || undefined;

    return {
      director,
      genre,
    };
  } catch (error) {
    console.error(`Error fetching movie details for TMDB ID ${tmdbId}:`, error);
    return null;
  }
}
