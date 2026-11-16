'use server';

import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { remindOpenBatch } from '@/lib/api/imdb-lta-batches';

async function requireAdmin() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error('No autorizado');
  }

  if (session.user.role !== 'admin') {
    throw new Error('Solo admins pueden mandar el recordatorio');
  }
}

export async function remindOpenBatchAction() {
  await requireAdmin();
  return remindOpenBatch();
}
