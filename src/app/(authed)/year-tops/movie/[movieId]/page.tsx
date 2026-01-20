import { getMamMovieById } from '@/lib/api/mam';
import { getYearTopStatsForMovie } from '@/lib/api/year-top';
import { getListsContainingMovie } from '@/lib/api/lists';
import { MovieDetail } from '@/components/movie';
import { notFound } from 'next/navigation';
import { getMovieById, getMovieDetails } from '@/lib/tmdb';

interface YearTopMoviePageProps {
  params: Promise<{ movieId: string }>;
}

export default async function YearTopMoviePage({
  params,
}: YearTopMoviePageProps) {
  const movieId = parseInt((await params).movieId);

  if (isNaN(movieId)) {
    notFound();
  }

  // Fetch MAM movie data (for the main detail view)
  const movie = await getMamMovieById(movieId);

  if (!movie) {
    notFound();
  }

  // Fetch year-top stats for this movie
  const yearTopSummary = await getYearTopStatsForMovie(movieId);

  // Fetch lists containing this movie
  const otherLists = await getListsContainingMovie(movieId);

  // Fetch director and genre from TMDB
  let director: string | undefined;
  let genre: string | undefined;

  if (movie.imdbId) {
    // First get TMDB ID from IMDB ID
    const tmdbMovie = await getMovieById(movie.imdbId);
    if (tmdbMovie?.id) {
      // Then get full movie details including director and genre
      const details = await getMovieDetails(tmdbMovie.id);
      director = details?.director;
      genre = details?.genre;
    }
  }

  return (
    <MovieDetail
      movie={movie}
      rank={movie.rank}
      director={director}
      genre={genre}
      otherLists={otherLists}
      yearTopSummary={yearTopSummary}
    />
  );
}
