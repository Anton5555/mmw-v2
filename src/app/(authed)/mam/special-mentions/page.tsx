import { Suspense } from 'react';
import { getMamCountriesWithMovieCounts, getMamParticipants } from '@/lib/api/mam';
import { getAllGenres, getAllDirectors } from '@/lib/api/movies';
import { loadMamMoviesSearchParams } from '@/lib/searchParams';
import { MamMovieFilters } from '@/components/mam-movie-filters';
import { MamSkeletonGrid } from '@/components/mam-skeleton-grid';
import { SpecialMentionsGrid } from './_components/special-mentions-grid';
import { SpecialMentionsGridWrapper } from './_components/special-mentions-grid-wrapper';

interface SpecialMentionsPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function SpecialMentionsPage({
  searchParams,
}: SpecialMentionsPageProps) {
  // Load and validate search parameters using nuqs
  const params = await loadMamMoviesSearchParams(searchParams);

  // Fetch static data (participants list, genres, directors)
  const [participantsList, genresList, directorsList, countriesList] = await Promise.all([
    getMamParticipants(),
    getAllGenres(),
    getAllDirectors(),
    getMamCountriesWithMovieCounts(),
  ]);

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
    <div className="min-h-svh bg-[#0a0a0a] text-white">
      <div className="container mx-auto px-4 pb-8 pt-6">
        {/* Header */}
        <header className="mb-8 pt-4 md:pt-8">
          <h1 className="text-balance text-3xl font-semibold tracking-tight text-white sm:text-4xl md:text-5xl">
            Menciones especiales
          </h1>
          <p className="mt-2 max-w-2xl text-pretty text-zinc-400">
            Selecciones de los participantes que merecen un reconocimiento
            aparte.
          </p>
        </header>

        {/* Filters */}
        <MamMovieFilters
          participants={participantsList}
          genres={genresList}
          directors={directorsList}
          countries={countriesList}
        />

        {/* Movie Grid with client-side loading state and Suspense */}
        <SpecialMentionsGridWrapper initialParams={params}>
          <Suspense key={suspenseKey} fallback={<MamSkeletonGrid />}>
            <SpecialMentionsGrid searchParams={params} />
          </Suspense>
        </SpecialMentionsGridWrapper>
      </div>
    </div>
  );
}
