'use server';

import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import {
  getListMovieDetailData,
  getMamMovieDetailData,
  getYearTopMovieDetailData,
} from '@/lib/api/movie-detail';

export type MovieSheetKind = 'list' | 'mam' | 'year-top';

export async function getMovieSheetDataAction(
  movieId: number,
  kind: MovieSheetKind,
  listId?: string
) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    throw new Error('No autorizado');
  }

  const data =
    kind === 'list'
      ? await getListMovieDetailData(movieId, listId)
      : kind === 'year-top'
        ? await getYearTopMovieDetailData(movieId)
        : await getMamMovieDetailData(movieId);

  if (!data) return null;

  const { movie, otherLists, yearTopSummary, director, genre } = data;
  return { movie, rank: movie.rank, otherLists, yearTopSummary, director, genre };
}

export type MovieSheetData = NonNullable<
  Awaited<ReturnType<typeof getMovieSheetDataAction>>
>;
