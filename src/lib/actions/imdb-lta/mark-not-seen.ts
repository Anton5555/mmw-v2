'use server';

import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { markNotSeen } from '@/lib/api/imdb-lta';
import { markNotSeenSchema } from '@/lib/validations/imdb-lta';

export async function markNotSeenAction(movieId: number) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error('No autorizado');
  }

  const validated = markNotSeenSchema.parse({ movieId });
  const result = await markNotSeen(session.user.id, validated.movieId);

  revalidatePath('/imdb-lta');
  revalidatePath('/imdb-lta/lote');
  revalidatePath('/imdb-lta/rate');
  return result;
}
