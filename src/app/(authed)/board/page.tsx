import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { BoardPageClient } from './_components/board-page-client';
import { redirect } from 'next/navigation';

export default async function BoardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect('/sign-in');
  }

  // Fetch initial posts
  const posts = await prisma.boardPost.findMany({
    orderBy: { order: 'asc' },
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

  return (
    <BoardPageClient
      initialPosts={posts}
      currentUserId={session.user.id}
    />
  );
}
