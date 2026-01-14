import { Suspense } from 'react';
import { getMamParticipants, getUserMamParticipant } from '@/lib/api/mam';
import { loadMamMoviesSearchParams } from '@/lib/searchParams';
import { MamMovieFilters } from '@/components/mam-movie-filters';
import { MamMovieGrid } from '@/components/mam-movie-grid';
import { MamMovieGridWrapper } from '@/components/mam-movie-grid-wrapper';
import { MamSkeletonGrid } from '@/components/mam-skeleton-grid';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { Button } from '@/components/ui/button';

interface MamPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function MamPage({ searchParams }: MamPageProps) {
  // Load and validate search parameters using nuqs
  const params = await loadMamMoviesSearchParams(searchParams);

  // Get current user session
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  // Fetch static data (participants list and user info) - these don't depend on search params
  const [participantsList, userParticipant] = await Promise.all([
    getMamParticipants(),
    session?.user?.id ? getUserMamParticipant(session.user.id) : null,
  ]);

  const hasUserPicks = userParticipant && userParticipant._count.picks > 0;

  // Create a stable key for Suspense based on search params
  const suspenseKey = JSON.stringify({
    title: params.title,
    imdb: params.imdb,
    participants: params.participants,
    page: params.page,
    limit: params.limit,
  });

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="container mx-auto px-4 pb-8 pt-8">
        {/* Header */}
        <div className="relative mb-12 pt-8 text-center md:text-left">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h1 className="text-4xl md:text-6xl font-black tracking-tighter bg-gradient-to-b from-foreground to-muted-foreground bg-clip-text text-transparent">
                Míralas Antes de Morir
              </h1>
              <p className="mt-3 text-lg text-muted-foreground max-w-2xl leading-relaxed">
                La selección definitiva del séptimo arte. Una colección curada
                por la comunidad para ser vista, al menos, una vez en la vida.
              </p>
            </div>
            {hasUserPicks && (
              <Button
                asChild
                size="lg"
                className="rounded-full px-8 shadow-xl hover:scale-105 transition-transform"
              >
                <Link href="/mam/my-list">Mi Lista Personal</Link>
              </Button>
            )}
          </div>
        </div>

        {/* Filters */}
        <MamMovieFilters participants={participantsList} />

        {/* Movie Grid with client-side loading state and Suspense */}
        <MamMovieGridWrapper initialParams={params}>
          <Suspense key={suspenseKey} fallback={<MamSkeletonGrid />}>
            <MamMovieGrid searchParams={params} />
          </Suspense>
        </MamMovieGridWrapper>
      </div>
    </div>
  );
}
