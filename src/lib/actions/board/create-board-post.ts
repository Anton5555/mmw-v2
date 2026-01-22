'use server';

import { auth } from '@/lib/auth';
import { CreateBoardPostFormValues } from '@/lib/validations/board';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { prisma } from '@/lib/db';

export async function createBoardPostAction(input: CreateBoardPostFormValues) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error('No autorizado');
  }

  // Find the maximum order value and add 1 for the new post
  const maxOrderPost = await prisma.boardPost.findFirst({
    orderBy: { order: 'desc' },
    select: { order: true },
  });

  const newOrder = maxOrderPost ? maxOrderPost.order + 1 : 0;

  const post = await prisma.boardPost.create({
    data: {
      title: input.title,
      description: input.description,
      order: newOrder,
      createdBy: session.user.id,
    },
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
