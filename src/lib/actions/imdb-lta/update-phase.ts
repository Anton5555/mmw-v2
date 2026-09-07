'use server';

import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { updateImdbLtaPhase } from '@/lib/api/imdb-lta';
import { updateImdbLtaPhaseSchema } from '@/lib/validations/imdb-lta';
import type { ImdbLtaPhaseValue } from '@/lib/validations/imdb-lta';

/**
 * Admin-only phase flip. UI: ImdbLtaAdminPhaseSwitcher on /imdb-lta.
 */
export async function updateImdbLtaPhaseAction(phase: ImdbLtaPhaseValue) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user || session.user.role !== 'admin') {
    throw new Error('No autorizado');
  }

  const validated = updateImdbLtaPhaseSchema.parse({ phase });
  const result = await updateImdbLtaPhase(validated.phase);

  revalidatePath('/imdb-lta');
  revalidatePath('/imdb-lta/rate');
  revalidatePath('/imdb-lta/ranking');
  return result;
}
