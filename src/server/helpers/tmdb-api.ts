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

export const getMovieById = async (imdbId: string) => {
  try {
    console.log(process.env);
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

    return { ...result.movie_results[0], imdbId };
  } catch (error) {
    console.error(`Error fetching data for IMDb ID ${imdbId}:`, error);
    return null;
  }
};
