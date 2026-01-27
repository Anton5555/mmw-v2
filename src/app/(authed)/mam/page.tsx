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
              <h1 className="text-5xl md:text-7xl font-black tracking-tighter bg-linear-to-b from-white to-zinc-500 bg-clip-text text-transparent">
                Míralas Antes de Morir
              </h1>
              <p className="text-zinc-400 max-w-xl text-lg leading-snug mx-auto md:mx-0">
                La selección definitiva del séptimo arte. Curada por la comunidad.
              </p>
            </div>

            {/* Navigation tier */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
              {/* Participant explorer (command palette) */}
              <ParticipantNav participants={participantsList} />

              {/* Special mentions */}
              <Button
                asChild
                variant="outline"
                className="rounded-full border-white/10 bg-white/5 hover:bg-white/10 h-11 px-5"
              >
                <Link href="/mam/special-mentions">Menciones Especiales</Link>
              </Button>

              {/* My personal list */}
              {hasUserPicks && (
                <Button className="rounded-full bg-white text-black hover:bg-yellow-500 transition-all font-bold h-11 px-6 shadow-xl" asChild>
                  <Link href="/mam/my-list" className="flex items-center gap-2">
                    <Film className="h-4 w-4" />
                    <span>Mi Lista Personal</span>
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
