'use server';

import { auth } from '@/lib/auth';
import { UpdateBoardPostReorderFormValues } from '@/lib/validations/board';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { prisma } from '@/lib/db';
import { BOARD_ENABLED } from '@/lib/config/features';

export async function reorderBoardPostsAction(
  input: UpdateBoardPostReorderFormValues
) {
  if (!BOARD_ENABLED) {
    throw new Error('Tablero deshabilitado');
  }

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error('No autorizado');
  }

  // Update all posts in a transaction
  await prisma.$transaction(
    input.map(({ id, order }) =>
      prisma.boardPost.update({
        where: { id },
        data: { order },
      })
    )
  );

  revalidatePath('/board');

  return { success: true };
}
