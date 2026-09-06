import { Suspense } from 'react';
import {
  getMamParticipants,
  getUserMamParticipant,
  getMamCountriesWithMovieCounts,
} from '@/lib/api/mam';
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
import { Film } from 'lucide-react';

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

  // Fetch static data (participants list, genres, directors, countries, and user info) - these don't depend on search params
  const [
    participantsList,
    genresList,
    directorsList,
    countriesList,
    userParticipant,
  ] = await Promise.all([
    getMamParticipants(),
    getAllGenres(),
    getAllDirectors(),
    getMamCountriesWithMovieCounts(),
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
    country: params.country,
    page: params.page,
    limit: params.limit,
  });

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="container mx-auto px-4 pb-8 pt-8">
        {/* Header: Identity & Navigation */}
        <div className="relative mb-10 pt-8">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
            <div className="space-y-2 text-center md:text-left">
              <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-white">
                Míralas Antes de Morir
              </h1>
              <p className="text-zinc-400 max-w-xl mx-auto md:mx-0">
                Las películas que hay que ver antes de morir.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
              <ParticipantNav participants={participantsList} />

              <Button
                asChild
                variant="outline"
                className="rounded-lg border-white/10 bg-zinc-900 hover:bg-zinc-800 h-10 px-4"
              >
                <Link href="/mam/special-mentions">Menciones especiales</Link>
              </Button>

              {hasUserPicks && (
                <Button
                  className="rounded-lg bg-white text-black hover:bg-yellow-500 font-medium h-10 px-4"
                  asChild
                >
                  <Link href="/mam/my-list" className="flex items-center gap-2">
                    <Film className="h-4 w-4" />
                    <span>Mi lista</span>
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
          countries={countriesList}
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
