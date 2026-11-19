import { Suspense } from 'react';
import { TabNav } from '@/components/shared/tab-nav';
import { notFound } from 'next/navigation';
import { getYearTopParticipants } from '@/lib/api/year-top';
import { loadYearTopSearchParams } from '@/lib/searchParams';
import { YearTopMovieFilters } from '@/components/year-top-movie-filters';
import { YearTopMovieGrid } from '@/components/year-top-movie-grid';
import { YearTopMovieGridWrapper } from '@/components/year-top-movie-grid-wrapper';
import { YearTopSkeletonGrid } from '@/components/year-top-skeleton-grid';
import { YearTopParticipantNav } from '@/components/year-tops/participant-nav';
import { YearTopParticipantHeader } from '@/components/year-tops/participant-header';
import { prisma } from '@/lib/db';
import { YearTopPickType } from '@generated/prisma/client';

interface YearTopTypePageProps {
  params: Promise<{ type: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

const TYPE_CONFIG = {
  'top-10': {
    pickType: YearTopPickType.TOP_10,
    title: 'Top del Año',
    description: 'Las mejores películas de {year} según la comunidad.',
  },
  'best-seen': {
    pickType: YearTopPickType.BEST_SEEN,
    title: 'Mejor Vista del Año',
    description: 'La mejor película vista en {year} (cualquier año de estreno).',
  },
  'worst-3': {
    pickType: YearTopPickType.WORST_3,
    title: 'Porongas del Año',
    description: 'Las peores películas de {year} según cada participante.',
  },
  'best-and-worst': {
    pickType: 'BEST_AND_WORST' as const,
    title: 'Duales',
    description: 'Películas que aparecen tanto en el Top del Año como en Porongas del Año.',
  },
} as const;

type ValidType = keyof typeof TYPE_CONFIG;

export default async function YearTopTypePage({
  params,
  searchParams,
}: YearTopTypePageProps) {
  const { type } = await params;

  // Validate type
  if (!(type in TYPE_CONFIG)) {
    notFound();
  }

  const typeConfig = TYPE_CONFIG[type as ValidType];

  // Load and validate search parameters using nuqs
  const loadedParams = await loadYearTopSearchParams(searchParams);

  // best-seen is only available for 2025
  if (type === 'best-seen' && loadedParams.year !== 2025) {
    notFound();
  }

  // Ensure pickType matches the route type
  // For best-and-worst, use the string literal; otherwise use the enum value
  const validatedParams = {
    ...loadedParams,
    pickType: typeConfig.pickType,
  };

  // Get available years from picks (since year was removed from YearTopParticipant)
  const years = await prisma.yearTopPick.findMany({
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
    <div className="min-h-svh">
      <div className="container mx-auto px-4 pb-8 pt-6">
        {/* Header */}
        <div className="mb-8 pt-4 md:pt-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h1 className="text-balance text-3xl sm:text-4xl md:text-5xl">
                {typeConfig.title}
              </h1>
              <p className="mt-2 max-w-2xl text-pretty text-muted-foreground">
                {typeConfig.description.replace('{year}', validatedParams.year.toString())}
              </p>
            </div>
            <div className="flex flex-wrap gap-4">
              <YearTopParticipantNav
                participants={participantsList}
                currentType={type}
                year={validatedParams.year}
              />
            </div>
          </div>
          {/* Other lists of the same year */}
          <TabNav
            className="mt-8"
            label={`Listas de ${validatedParams.year}`}
            items={[
              { href: `/year-tops/top-10?year=${validatedParams.year}`, label: 'Top del Año', active: type === 'top-10' },
              ...(validatedParams.year === 2025
                ? [{ href: `/year-tops/best-seen?year=${validatedParams.year}`, label: 'Mejor vista', active: type === 'best-seen' }]
                : []),
              { href: `/year-tops/worst-3?year=${validatedParams.year}`, label: 'Porongas del Año', active: type === 'worst-3' },
              { href: `/year-tops/best-and-worst?year=${validatedParams.year}`, label: 'Duales', active: type === 'best-and-worst' },
            ]}
          />
        </div>

        {/* Participant Header (shown when viewing single participant) */}
        <YearTopParticipantHeader
          participants={participantsList}
          year={validatedParams.year}
        />

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
