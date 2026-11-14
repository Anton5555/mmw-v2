'use server';

import { after } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { submitRating } from '@/lib/api/imdb-lta';
import { notifyBatchAllRatedIfDone } from '@/lib/api/imdb-lta-notifications';
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

  const userId = session.user.id;
  // Return the promise so waitUntil keeps the invocation alive until Telegram
  // finishes. A voided fire-and-forget inside after() freezes mid-request on
  // serverless and can flush on the next action (one-step-behind notifications).
  after(() =>
    notifyBatchAllRatedIfDone(userId, validated.movieId).catch((error) => {
      console.error('Failed to notify batch all-rated on Telegram:', error);
    })
  );

  revalidatePath('/imdb-lta');
  revalidatePath('/imdb-lta/lote');
  revalidatePath('/imdb-lta/rate');
  revalidatePath('/imdb-lta/ranking');
  return result;
}
