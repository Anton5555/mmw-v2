import { Suspense } from 'react';
import { getMamParticipants, getUserMamParticipant } from '@/lib/api/mam';
import { getAllGenres, getAllDirectors } from '@/lib/api/movies';
import { loadMamMoviesSearchParams } from '@/lib/searchParams';
import { MamMovieFilters } from '@/components/mam-movie-filters';
import { MamMovieGrid } from '@/components/mam-movie-grid';
import { MamMovieGridWrapper } from '@/components/mam-movie-grid-wrapper';
import { MamSkeletonGrid } from '@/components/mam-skeleton-grid';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { Button } from '@/components/ui/button';
import { ParticipantNav } from '@/components/mam/participant-nav';

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

  // Fetch static data (participants list, genres, directors, and user info) - these don't depend on search params
  const [participantsList, genresList, directorsList, userParticipant] = await Promise.all([
    getMamParticipants(),
    getAllGenres(),
    getAllDirectors(),
    session?.user?.id ? getUserMamParticipant(session.user.id) : null,
  ]);

  const hasUserPicks = userParticipant && userParticipant._count.picks > 0;

  // Create a stable key for Suspense based on search params
  const suspenseKey = JSON.stringify({
    title: params.title,
    imdb: params.imdb,
    participants: params.participants,
    genre: params.genre,
    director: params.director,
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
              <h1 className="text-4xl md:text-6xl font-black tracking-tighter bg-linear-to-b from-foreground to-muted-foreground bg-clip-text text-transparent">
                Míralas Antes de Morir
              </h1>
              <p className="mt-3 text-lg text-muted-foreground max-w-2xl leading-relaxed">
                La selección definitiva del séptimo arte. Una colección curada
                por la comunidad para ser vista, al menos, una vez en la vida.
              </p>
            </div>
            <div className="flex flex-wrap gap-4">
              <ParticipantNav participants={participantsList} />
              <Button
                asChild
                className="relative overflow-hidden group rounded-full bg-white/10 text-white hover:bg-white/20 px-8 h-12 border border-white/20"
              >
                <Link href="/mam/special-mentions">
                  <span className="relative z-10 font-bold tracking-tight">
                    Menciones Especiales
                  </span>
                </Link>
              </Button>
              {hasUserPicks && (
                <Button
                  asChild
                  className="relative overflow-hidden group rounded-full bg-white text-black hover:bg-white px-8 h-12"
                >
                  <Link href="/mam/my-list">
                    <span className="relative z-10 font-bold tracking-tight group-hover:text-white transition-colors duration-300">
                      Mi Lista Personal
                    </span>
                    {/* Animated background on hover */}
                    <div className="absolute inset-0 bg-linear-to-r from-yellow-400 to-orange-500 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Filters */}
        <MamMovieFilters
          participants={participantsList}
          genres={genresList}
          directors={directorsList}
        />

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
