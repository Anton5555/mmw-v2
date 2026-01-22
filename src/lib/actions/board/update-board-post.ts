'use server';

import { auth } from '@/lib/auth';
import { UpdateBoardPostFormValues } from '@/lib/validations/board';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { prisma } from '@/lib/db';

export async function updateBoardPostAction(input: UpdateBoardPostFormValues) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error('No autorizado');
  }

  // Check if post exists and user owns it
  const existingPost = await prisma.boardPost.findUnique({
    where: { id: input.id },
    select: { createdBy: true },
  });

  if (!existingPost) {
    throw new Error('Post no encontrado');
  }

  if (existingPost.createdBy !== session.user.id) {
    throw new Error('No autorizado');
  }

  const updateData: {
    title?: string;
    description?: string;
  } = {};

  if (input.title !== undefined) {
    updateData.title = input.title;
  }
  if (input.description !== undefined) {
    updateData.description = input.description;
  }

  const post = await prisma.boardPost.update({
    where: { id: input.id },
    data: updateData,
    include: {
      createdByUser: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
  });

  revalidatePath('/board');

  return { success: true, post };
}
