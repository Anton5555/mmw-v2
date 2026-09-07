'use server';

import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { submitNominations } from '@/lib/api/imdb-lta';

export async function submitNominationsAction() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error('No autorizado');
  }

  const result = await submitNominations(session.user.id);

  revalidatePath('/imdb-lta');
  return result;
}
