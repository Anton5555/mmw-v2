'use server';

import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { setWantToWatch } from '@/lib/api/imdb-lta';
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

  revalidatePath('/imdb-lta');
  revalidatePath('/imdb-lta/lote');
  revalidatePath('/imdb-lta/rate');
  return result;
}
