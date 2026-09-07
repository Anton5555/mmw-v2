'use server';

import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { lookupMovie } from '@/lib/api/imdb-lta';
import { lookupMovieQuerySchema } from '@/lib/validations/imdb-lta';

export async function lookupMovieAction(rawQuery: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error('No autorizado');
  }

  const { query } = lookupMovieQuerySchema.parse({ query: rawQuery });
  return lookupMovie(query);
}
