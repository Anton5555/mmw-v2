'use server';

import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { submitRating } from '@/lib/api/imdb-lta';
import { submitRatingSchema } from '@/lib/validations/imdb-lta';

export async function submitRatingAction(movieId: number, score: number) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error('No autorizado');
  }

  const validated = submitRatingSchema.parse({ movieId, score });
  const result = await submitRating(
    session.user.id,
    validated.movieId,
    validated.score
  );

  revalidatePath('/imdb-lta');
  revalidatePath('/imdb-lta/rate');
  revalidatePath('/imdb-lta/ranking');
  return result;
}
