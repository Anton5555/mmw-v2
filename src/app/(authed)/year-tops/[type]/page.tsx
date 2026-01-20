import { Suspense } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getYearTopParticipants } from '@/lib/api/year-top';
import { loadYearTopSearchParams } from '@/lib/searchParams';
import { YearTopMovieFilters } from '@/components/year-top-movie-filters';
import { YearTopMovieGrid } from '@/components/year-top-movie-grid';
import { YearTopMovieGridWrapper } from '@/components/year-top-movie-grid-wrapper';
import { YearTopSkeletonGrid } from '@/components/year-top-skeleton-grid';
import { prisma } from '@/lib/db';
import { YearTopPickType } from '@prisma/client';
import { cn } from '@/lib/utils';

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
  const validatedParams = {
    ...loadedParams,
    pickType: typeConfig.pickType,
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
                {typeConfig.title}
              </h1>
              <p className="mt-3 text-lg text-muted-foreground max-w-2xl leading-relaxed">
                {typeConfig.description.replace('{year}', validatedParams.year.toString())}
              </p>
            </div>
          </div>
          {/* Year navigation */}
          <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span>Ver otras listas de {validatedParams.year}:</span>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/year-tops/top-10?year=${validatedParams.year}`}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs font-medium transition',
                  type === 'top-10'
                    ? 'border-white/15 bg-white/10 text-white'
                    : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20'
                )}
              >
                Top del Año
              </Link>
              {validatedParams.year === 2025 && (
                <Link
                  href={`/year-tops/best-seen?year=${validatedParams.year}`}
                  className={cn(
                    'rounded-full border px-3 py-1 text-xs font-medium transition',
                    type === 'best-seen'
                      ? 'border-white/15 bg-white/10 text-white'
                      : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20'
                  )}
                >
                  Mejor vista
                </Link>
              )}
              <Link
                href={`/year-tops/worst-3?year=${validatedParams.year}`}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs font-medium transition',
                  type === 'worst-3'
                    ? 'border-white/15 bg-white/10 text-white'
                    : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20'
                )}
              >
                Porongas del Año
              </Link>
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
