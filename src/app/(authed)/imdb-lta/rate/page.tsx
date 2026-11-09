import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { ImdbLtaPhase } from '@generated/prisma/client';
import {
  getImdbLtaPhase,
  listRateableCandidates,
} from '@/lib/api/imdb-lta';
import { loadImdbLtaRateSearchParams } from '@/lib/searchParams';
import {
  imdbLtaRatingFilterSchema,
  type ImdbLtaRatingFilter,
} from '@/lib/validations/imdb-lta';
import { ImdbLtaPhaseNav } from '../_components/imdb-lta-phase-nav';
import { RatingPageClient } from './_components/rating-page-client';
import { getCurrentSession } from '@/lib/get-session';
import { LoadingSpinner } from '@/components/shared/loading-spinner';

interface RatePageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

function serializeMovie(
  m: Awaited<ReturnType<typeof listRateableCandidates>>['movies'][number]
) {
  return {
    id: m.id,
    title: m.title,
    originalTitle: m.originalTitle,
    originalLanguage: m.originalLanguage,
    releaseDate: m.releaseDate.toISOString(),
    posterUrl: m.posterUrl,
    imdbId: m.imdbId,
    tmdbId: m.tmdbId,
    nominationCount: m.nominationCount,
    ratingCount: m.ratingCount,
    averageScore: m.averageScore,
    userNominated: m.userNominated,
    userScore: m.userScore,
    batchState: m.batchState,
    userSkipped: m.userSkipped,
  };
}

export default function ImdbLtaRatePage({ searchParams }: RatePageProps) {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ImdbLtaRatePageContent searchParams={searchParams} />
    </Suspense>
  );
}

async function ImdbLtaRatePageContent({ searchParams }: RatePageProps) {
  const session = await getCurrentSession();

  if (!session?.user) {
    redirect('/api/auth/clear-session');
  }

  const phase = await getImdbLtaPhase();

  if (
    phase !== ImdbLtaPhase.RATING_OPEN &&
    phase !== ImdbLtaPhase.RATING_CLOSED
  ) {
    redirect('/imdb-lta');
  }

  const raw = await loadImdbLtaRateSearchParams(searchParams);
  const parsedFilter = imdbLtaRatingFilterSchema.safeParse(raw.filter);
  const filter: ImdbLtaRatingFilter = parsedFilter.success
    ? parsedFilter.data
    : 'needs_votes';

  const list = await listRateableCandidates(session.user.id, {
    filter,
    page: raw.page,
    limit: raw.limit,
  });

  const isRatingOpen = phase === ImdbLtaPhase.RATING_OPEN;
  const isAdmin = session.user.role === 'admin';

  return (
    <div className="mx-auto w-full px-4 py-8 sm:max-w-screen-sm md:max-w-screen-md lg:max-w-5xl xl:max-w-[1600px] xl:px-8 2xl:max-w-[1800px]">
      <div className="w-full">
        <ImdbLtaPhaseNav
          phase={phase}
          currentPath="/imdb-lta/rate"
          isAdmin={isAdmin}
        />
        <RatingPageClient
          movies={list.movies.map(serializeMovie)}
          pagination={list.pagination}
          isRatingOpen={isRatingOpen}
          filter={filter}
        />
      </div>
    </div>
  );
}
