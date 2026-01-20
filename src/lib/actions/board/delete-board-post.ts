'use server';

import { auth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { prisma } from '@/lib/db';

export async function deleteBoardPostAction(postId: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error('No autorizado');
  }

  // Check if post exists and user owns it
  const existingPost = await prisma.boardPost.findUnique({
    where: { id: postId },
    select: { createdBy: true },
  });

  if (!existingPost) {
    throw new Error('Post no encontrado');
  }

  if (existingPost.createdBy !== session.user.id) {
    throw new Error('No autorizado');
  }

  await prisma.boardPost.delete({
    where: { id: postId },
  });

  revalidatePath('/board');

  return { success: true };
}
