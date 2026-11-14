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
      console.error(
        `TMDB API error while fetching IMDb ID ${imdbId}: ${response.status} ${response.statusText}`
      );
      return null;
    }

    const result = (await response.json()) as TMDBMovieResponse;

    if (!movieValidator(result)) {
      console.error(
        `Invalid movie data received from TMDB for IMDb ID ${imdbId}`,
        result
      );
      return null;
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
    crew: Array<{ job: string; name: string; id?: number }>;
  };
}

export interface MovieDetails {
  director?: string;
  genre?: string;
}

export interface TMDBMovieDetailsFullResponse {
  id: number;
  genres: Array<{ id: number; name: string }>;
  production_countries?: Array<{ iso_3166_1: string; name: string }>;
  credits?: {
    crew: Array<{ job: string; name: string; id?: number }>;
  };
}

export interface MovieDetailsFull {
  genres: Array<{ id: number; name: string }>;
  directors: Array<{ id?: number; name: string }>;
  countries: Array<{ code: string; name: string }>;
  tmdbId: number;
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

export interface TMDBBackdrop {
  file_path: string;
  width: number;
  height: number;
  vote_average: number;
  vote_count: number;
  iso_639_1: string | null;
}

export interface MovieTriviaDetails {
  keywords: string[];
  year: number | null;
  countries: string[];
  music: string[];
  cinematography: string[];
  editing: string[];
  directors: string[];
}

type TMDBImagesResponse = {
  backdrops?: TMDBBackdrop[];
};

type TMDBTriviaMovieResponse = {
  release_date?: string;
  production_countries?: Array<{ iso_3166_1: string; name: string }>;
  credits?: {
    crew?: Array<{ job: string; name: string }>;
  };
  keywords?: {
    keywords?: Array<{ id: number; name: string }>;
  };
};

/**
 * Textless backdrops for a movie, highest vote_count first.
 */
export async function getMovieBackdrops(
  tmdbId: number
): Promise<TMDBBackdrop[]> {
  try {
    const response = await fetch(
      `https://api.themoviedb.org/3/movie/${tmdbId}/images?api_key=${env.TMDB_API_KEY}&include_image_language=null`
    );

    if (!response.ok) {
      console.error(
        `TMDB images API error for movie ${tmdbId}: ${response.status}`
      );
      return [];
    }

    const data = (await response.json()) as TMDBImagesResponse;
    const backdrops = data.backdrops ?? [];
    return backdrops.toSorted(
      (a, b) =>
        b.vote_count - a.vote_count || b.vote_average - a.vote_average
    );
  } catch (error) {
    console.error(`Error fetching backdrops for TMDB ID ${tmdbId}:`, error);
    return [];
  }
}

/**
 * Crew + keywords snapshot used by LTA trivia clue ladder.
 */
export async function getMovieTriviaDetails(
  tmdbId: number
): Promise<MovieTriviaDetails | null> {
  try {
    const response = await fetch(
      `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${env.TMDB_API_KEY}&append_to_response=credits,keywords&language=es-ES`
    );

    if (!response.ok) {
      console.error(
        `TMDB trivia details error for movie ${tmdbId}: ${response.status}`
      );
      return null;
    }

    const data = (await response.json()) as TMDBTriviaMovieResponse;
    const crew = data.credits?.crew ?? [];

    const namesFor = (...jobs: string[]) =>
      [
        ...new Set(
          crew
            .filter((person) => jobs.includes(person.job))
            .map((person) => person.name)
        ),
      ];

    const year = data.release_date
      ? Number(data.release_date.slice(0, 4))
      : null;

    return {
      keywords: (data.keywords?.keywords ?? []).map((k) => k.name),
      year: Number.isFinite(year) ? year : null,
      countries: (data.production_countries ?? []).map((c) => c.name),
      music: namesFor('Original Music Composer', 'Music'),
      cinematography: namesFor('Director of Photography'),
      editing: namesFor('Editor'),
      directors: namesFor('Director'),
    };
  } catch (error) {
    console.error(
      `Error fetching trivia details for TMDB ID ${tmdbId}:`,
      error
    );
    return null;
  }
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
 * Returns only first director and genre for backward compatibility
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

/**
 * Get full movie details (all genres and directors) from TMDB by TMDB movie ID
 * Returns all genres and directors for database storage
 */
export async function getMovieDetailsFull(tmdbId: number): Promise<MovieDetailsFull | null> {
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

    const data = (await response.json()) as TMDBMovieDetailsFullResponse;

    // Get all directors from credits.crew
    const directors = data.credits?.crew
      .filter((person) => person.job === 'Director')
      .map((person) => ({
        id: person.id,
        name: person.name,
      })) || [];

    // Get all genres
    const genres = data.genres || [];

    // Get all production countries
    const countries =
      data.production_countries?.map((country) => ({
        code: country.iso_3166_1,
        name: country.name,
      })) || [];

    return {
      genres,
      directors,
      countries,
      tmdbId: data.id,
    };
  } catch (error) {
    console.error(`Error fetching full movie details for TMDB ID ${tmdbId}:`, error);
    return null;
  }
}
