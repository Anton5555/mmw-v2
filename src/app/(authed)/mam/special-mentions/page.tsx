import { Suspense } from 'react';
import { getMamCountriesWithMovieCounts, getMamParticipants } from '@/lib/api/mam';
import { getAllGenres, getAllDirectors } from '@/lib/api/movies';
import { loadMamMoviesSearchParams } from '@/lib/searchParams';
import { MamMovieFilters } from '@/components/mam-movie-filters';
import { MamSkeletonGrid } from '@/components/mam-skeleton-grid';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
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
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="container mx-auto px-4 pb-8 pt-8">
        {/* Header */}
        <div className="relative mb-12 pt-8 text-center md:text-left">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-white">
                Menciones especiales
              </h1>
              <p className="mt-2 text-zinc-400 max-w-2xl">
                Selecciones de los participantes que merecen un reconocimiento
                aparte.
              </p>
            </div>
            <Button
              asChild
              variant="outline"
              className="rounded-lg border-white/10 bg-zinc-900 hover:bg-zinc-800 px-5 h-10"
            >
              <Link href="/mam">Volver a MAM</Link>
            </Button>
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
        <SpecialMentionsGridWrapper initialParams={params}>
          <Suspense key={suspenseKey} fallback={<MamSkeletonGrid />}>
            <SpecialMentionsGrid searchParams={params} />
          </Suspense>
        </SpecialMentionsGridWrapper>
      </div>
    </div>
  );
}
