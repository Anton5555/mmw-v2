'use server';

import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { removeNomination } from '@/lib/api/imdb-lta';
import { movieIdSchema } from '@/lib/validations/imdb-lta';

export async function removeNominationAction(movieId: number) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error('No autorizado');
  }

  const validated = movieIdSchema.parse({ movieId });
  const result = await removeNomination(session.user.id, validated.movieId);

  revalidatePath('/imdb-lta');
  return result;
}
