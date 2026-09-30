import { getListMovieById, getListsContainingMovie } from '@/lib/api/lists';
import { getMamMovieById } from '@/lib/api/mam';
import { getYearTopStatsForMovie } from '@/lib/api/year-top';
import { getMovieById, getMovieDetails } from '@/lib/tmdb';

async function getDirectorAndGenre(imdbId: string | null | undefined) {
  if (!imdbId) return { director: undefined, genre: undefined };

  const tmdbMovie = await getMovieById(imdbId);
  if (!tmdbMovie?.id) return { director: undefined, genre: undefined };

  const details = await getMovieDetails(tmdbMovie.id);
  return { director: details?.director, genre: details?.genre };
}

async function withExtras<T extends { imdbId?: string | null }>(
  movie: T,
  movieId: number
) {
  const [yearTopSummary, lists, tmdb] = await Promise.all([
    getYearTopStatsForMovie(movieId),
    getListsContainingMovie(movieId),
    getDirectorAndGenre(movie.imdbId),
  ]);

  return { movie, yearTopSummary, lists, ...tmdb };
}

/** Movie detail data for `/lists/movie/[movieId]?listId=`. */
export async function getListMovieDetailData(
  movieId: number,
  listIdParam?: string
) {
  const movie = await getListMovieById(movieId);
  if (!movie) return null;

  const data = await withExtras(movie, movieId);
  const { lists } = data;

  const selectedListId = listIdParam
    ? parseInt(listIdParam)
    : lists.length > 0
      ? lists[0].id
      : null;

  const selectedList = selectedListId
    ? lists.find((l) => l.id === selectedListId) || lists[0]
    : null;

  const otherLists = selectedListId
    ? lists.filter((l) => l.id !== selectedListId)
    : lists;

  return { ...data, selectedList, otherLists };
}

/** Movie detail data for `/mam/movie/[movieId]` (requires at least one pick). */
export async function getMamMovieDetailData(movieId: number) {
  const movie = await getMamMovieById(movieId);
  if (!movie || !movie.picks || movie.picks.length === 0) return null;

  const data = await withExtras(movie, movieId);
  return { ...data, otherLists: data.lists };
}

/** Movie detail data for `/year-tops/movie/[movieId]`. */
export async function getYearTopMovieDetailData(movieId: number) {
  const movie = await getMamMovieById(movieId);
  if (!movie) return null;

  const data = await withExtras(movie, movieId);
  return { ...data, otherLists: data.lists };
}
