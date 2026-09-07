'use server';

import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import {
  findMovieByImdbId,
  searchInternalMoviesByName,
  type MovieCardData,
} from '@/lib/api/movies';
import {
  IMDB_ID_REGEX,
  searchNominationsQuerySchema,
} from '@/lib/validations/imdb-lta';

/**
 * DB-only suggestions for the nomination typeahead.
 * Never hits TMDB — importing by IMDb ID stays on Enter via lookupMovieAction.
 */
export async function searchNominationsAction(
  rawQuery: string
): Promise<MovieCardData[]> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error('No autorizado');
  }

  const { query } = searchNominationsQuerySchema.parse({ query: rawQuery });

  if (IMDB_ID_REGEX.test(query)) {
    const movie = await findMovieByImdbId(query);
    return movie ? [movie] : [];
  }

  return searchInternalMoviesByName(query, 8);
}
