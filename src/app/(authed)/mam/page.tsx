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
import {
  SectionNav,
  SectionNavLink,
  sectionNavItemClassName,
} from '@/components/shared/section-nav';
import { ParticipantNav } from '@/components/mam/participant-nav';
import { Award, Film } from 'lucide-react';
import { getCurrentSession } from '@/lib/get-session';
import { LoadingSpinner } from '@/components/shared/loading-spinner';

interface MamPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default function MamPage({ searchParams }: MamPageProps) {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <MamPageContent searchParams={searchParams} />
    </Suspense>
  );
}

async function MamPageContent({ searchParams }: MamPageProps) {
  // Load and validate search parameters using nuqs
  const params = await loadMamMoviesSearchParams(searchParams);

  // Get current user session
  const session = await getCurrentSession();

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
    <div className="min-h-svh bg-[#0a0a0a] text-white">
      <div className="container mx-auto px-4 pb-8 pt-6">
        {/* Header: Identity & Navigation */}
        <header className="mb-8 flex flex-col gap-6 pt-4 md:pt-8 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-2">
            <h1 className="text-balance text-3xl font-semibold tracking-tight text-white sm:text-4xl md:text-5xl">
              Míralas Antes de Morir
            </h1>
            <p className="max-w-xl text-pretty text-zinc-400">
              Las películas que hay que ver antes de morir.
            </p>
          </div>

          {/* One grouped control instead of three competing buttons */}
          <SectionNav aria-label="Secciones de MAM" items={hasUserPicks ? 3 : 2}>
            <ParticipantNav
              participants={participantsList}
              className={sectionNavItemClassName}
            />
            <SectionNavLink href="/mam/special-mentions">
              <Award className="text-zinc-400" />
              <span>Menciones</span>
            </SectionNavLink>
            {hasUserPicks && (
              <SectionNavLink href="/mam/my-list">
                <Film className="text-zinc-400" />
                <span>Mi lista</span>
              </SectionNavLink>
            )}
          </SectionNav>
        </header>

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
