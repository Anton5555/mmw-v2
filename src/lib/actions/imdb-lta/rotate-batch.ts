'use server';

import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import {
  announcePendingBatches,
  announceQueueEmpty,
  getOpenBatch,
  rotateBatch,
} from '@/lib/api/imdb-lta-batches';

async function requireAdmin() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error('No autorizado');
  }

  if (session.user.role !== 'admin') {
    throw new Error('Solo admins pueden rotar el lote');
  }

  return session;
}

function revalidateLta() {
  revalidatePath('/imdb-lta');
  revalidatePath('/imdb-lta/lote');
  revalidatePath('/imdb-lta/rate');
  revalidatePath('/imdb-lta/ranking');
}

/**
 * Rotate to the next batch and post to Telegram.
 * If the current open batch was never announced (e.g. Telegram failed last time),
 * only retries the announce — does not open another batch.
 */
export async function rotateBatchNowAction() {
  await requireAdmin();

  const open = await getOpenBatch();
  if (open && open.batch.announcedAt === null) {
    const announce = await announcePendingBatches();
    if (announce.errors.length > 0) {
      throw new Error(
        `Telegram falló de nuevo: ${announce.errors.join('; ')}`
      );
    }
    revalidateLta();
    return {
      rotation: {
        rotated: false,
        reason: 'Reintentó el anuncio del lote abierto',
        openedBatchNumber: open.batch.number,
      },
      announce,
    };
  }

  const rotation = await rotateBatch();
  const announce = await announcePendingBatches();

  if (rotation.queueEmpty && rotation.closedBatchId) {
    await announceQueueEmpty();
  }

  if (announce.errors.length > 0) {
    throw new Error(
      `Lote rotado pero Telegram falló: ${announce.errors.join('; ')}. Volvé a tocar el botón para reintentar el anuncio sin abrir otro lote.`
    );
  }

  revalidateLta();
  return { rotation, announce };
}
