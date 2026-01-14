import { Suspense } from 'react';
import {
  getMamParticipants,
  getUserMamParticipant,
} from '@/lib/api/mam';
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
    <div className="container mx-auto px-4 pb-8 pt-4">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2">Míralas Antes de Morir</h1>
            <p className="text-muted-foreground md:flex hidden">
              A continuación, encontrarás las películas que que hay que ver
              antes de morir.
            </p>
          </div>
          {hasUserPicks && (
            <div className="shrink-0">
              <Button asChild variant="outline">
                <Link href="/mam/my-list">Mi Lista</Link>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="mb-8 md:p-4 md:bg-card md:rounded-lg md:border">
        <MamMovieFilters participants={participantsList} />
      </div>

      {/* Movie Grid with client-side loading state and Suspense */}
      <MamMovieGridWrapper initialParams={params}>
        <Suspense key={suspenseKey} fallback={<MamSkeletonGrid />}>
          <MamMovieGrid searchParams={params} />
        </Suspense>
      </MamMovieGridWrapper>
    </div>
  );
}
