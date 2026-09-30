import { Suspense } from 'react';
import { prisma } from '@/lib/db';
import { BoardPageClient } from './_components/board-page-client';
import { redirect } from 'next/navigation';
import { getCurrentSession } from '@/lib/get-session';
import { LoadingSpinner } from '@/components/shared/loading-spinner';

export default function BoardPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <BoardPageContent />
    </Suspense>
  );
}

async function BoardPageContent() {
  const session = await getCurrentSession();

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
