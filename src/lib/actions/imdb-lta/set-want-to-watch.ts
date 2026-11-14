'use server';

import { after } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { setWantToWatch } from '@/lib/api/imdb-lta';
import { notifyWantToWatch } from '@/lib/api/imdb-lta-notifications';
import { setWantToWatchSchema } from '@/lib/validations/imdb-lta';

export async function setWantToWatchAction(movieId: number, pinned: boolean) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error('No autorizado');
  }

  const validated = setWantToWatchSchema.parse({ movieId, pinned });
  const result = await setWantToWatch(
    session.user.id,
    validated.movieId,
    validated.pinned
  );

  if (validated.pinned) {
    const userId = session.user.id;
    const movieId = validated.movieId;
    // Return the promise so waitUntil keeps the invocation alive until Telegram
    // finishes. A voided fire-and-forget inside after() freezes mid-request on
    // serverless and can flush on the next action (one-step-behind notifications).
    after(() =>
      notifyWantToWatch(userId, movieId).catch((error) => {
        console.error('Failed to notify Quiero ver on Telegram:', error);
      })
    );
  }

  revalidatePath('/imdb-lta');
  revalidatePath('/imdb-lta/lote');
  revalidatePath('/imdb-lta/rate');
  return result;
}
