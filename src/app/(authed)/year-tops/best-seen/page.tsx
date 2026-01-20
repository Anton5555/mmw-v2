import { Suspense } from 'react';
import { getYearTopParticipants } from '@/lib/api/year-top';
import { loadYearTopSearchParams } from '@/lib/searchParams';
import { YearTopMovieFilters } from '@/components/year-top-movie-filters';
import { YearTopMovieGrid } from '@/components/year-top-movie-grid';
import { YearTopMovieGridWrapper } from '@/components/year-top-movie-grid-wrapper';
import { YearTopSkeletonGrid } from '@/components/year-top-skeleton-grid';
import { prisma } from '@/lib/db';
import { YearTopPickType } from '@prisma/client';

interface BestSeenPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function BestSeenPage({ searchParams }: BestSeenPageProps) {
  // Load and validate search parameters using nuqs
  const params = await loadYearTopSearchParams(searchParams);
  
  // Ensure pickType is BEST_SEEN
  const validatedParams = {
    ...params,
    pickType: YearTopPickType.BEST_SEEN,
  };


  // Get available years
  const years = await prisma.yearTopParticipant.findMany({
    select: {
      year: true,
    },
    distinct: ['year'],
    orderBy: {
      year: 'desc',
    },
  });
  const availableYears = years.map((y) => y.year);

  // Fetch static data (participants list)
  const participantsList = await getYearTopParticipants(validatedParams.year);


  // Create a stable key for Suspense based on search params
  const suspenseKey = JSON.stringify({
    year: validatedParams.year,
    pickType: validatedParams.pickType,
    title: validatedParams.title,
    imdb: validatedParams.imdb,
    participants: validatedParams.participants,
    page: validatedParams.page,
    limit: validatedParams.limit,
  });

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="container mx-auto px-4 pb-8 pt-8">
        {/* Header */}
        <div className="relative mb-12 pt-8 text-center md:text-left">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h1 className="text-4xl md:text-6xl font-black tracking-tighter bg-linear-to-b from-foreground to-muted-foreground bg-clip-text text-transparent">
                Mejor Vista del Año
              </h1>
              <p className="mt-3 text-lg text-muted-foreground max-w-2xl leading-relaxed">
                La mejor película vista en {validatedParams.year} (cualquier año de estreno).
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <YearTopMovieFilters
          participants={participantsList}
          availableYears={availableYears.length > 0 ? availableYears : [validatedParams.year]}
        />

        {/* Movie Grid with client-side loading state and Suspense */}
        <YearTopMovieGridWrapper initialParams={validatedParams}>
          <Suspense key={suspenseKey} fallback={<YearTopSkeletonGrid />}>
            <YearTopMovieGrid searchParams={validatedParams} />
          </Suspense>
        </YearTopMovieGridWrapper>
      </div>
    </div>
  );
}
