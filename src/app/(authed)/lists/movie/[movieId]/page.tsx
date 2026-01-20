import {
  getListMovieById,
  getListsContainingMovie,
} from '@/lib/api/lists';
import { getYearTopStatsForMovie } from '@/lib/api/year-top';
import { MamMovieDetail } from '@/components/mam-movie-detail';
import { ListMovieBreadcrumbUpdater } from '@/components/list-movie-breadcrumb-updater';
import { notFound } from 'next/navigation';
import { getMovieById, getMovieDetails } from '@/lib/tmdb';

interface ListMoviePageProps {
  params: Promise<{ movieId: string }>;
  searchParams: Promise<{ listId?: string }>;
}

export default async function ListMoviePage({
  params,
  searchParams,
}: ListMoviePageProps) {
  const movieId = parseInt((await params).movieId);
  const { listId: listIdParam } = await searchParams;

  if (isNaN(movieId)) {
    notFound();
  }

  const movie = await getListMovieById(movieId);

  if (!movie) {
    notFound();
  }

  // Get lists containing this movie
  const lists = await getListsContainingMovie(movieId);

  // Fetch year-top stats for this movie
  const yearTopSummary = await getYearTopStatsForMovie(movieId);

  // Use listId from query param if provided, otherwise use the first list
  const selectedListId = listIdParam
    ? parseInt(listIdParam)
    : lists.length > 0
      ? lists[0].id
      : null;

  const selectedList = selectedListId
    ? lists.find((l) => l.id === selectedListId) || lists[0]
    : null;

  // Get other lists (excluding the current one)
  const otherLists = selectedListId
    ? lists.filter((l) => l.id !== selectedListId)
    : lists;

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
    <>
      <ListMovieBreadcrumbUpdater
        movieTitle={
          movie.originalLanguage === 'es' ? movie.originalTitle : movie.title
        }
        listName={selectedList?.name}
        listId={selectedList?.id}
      />
      <MamMovieDetail
        movie={movie}
        rank={movie.rank}
        director={director}
        genre={genre}
        otherLists={otherLists}
        yearTopSummary={yearTopSummary}
      />
    </>
  );
}
