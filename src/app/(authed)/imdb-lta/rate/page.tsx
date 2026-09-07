import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { ImdbLtaPhase } from '@prisma/client';
import {
  getImdbLtaPhase,
  listHighlightUnrated,
  listRateableCandidates,
} from '@/lib/api/imdb-lta';
import { loadImdbLtaRateSearchParams } from '@/lib/searchParams';
import {
  imdbLtaRatingFilterSchema,
  type ImdbLtaRatingFilter,
} from '@/lib/validations/imdb-lta';
import { ImdbLtaPhaseNav } from '../_components/imdb-lta-phase-nav';
import { RatingPageClient } from './_components/rating-page-client';

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
  };
}

export default async function ImdbLtaRatePage({ searchParams }: RatePageProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect('/sign-in');
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
    : 'unrated';

  const [list, highlights] = await Promise.all([
    listRateableCandidates(session.user.id, {
      filter,
      page: raw.page,
      limit: raw.limit,
    }),
    filter === 'unrated' && phase === ImdbLtaPhase.RATING_OPEN
      ? listHighlightUnrated(session.user.id, 10)
      : Promise.resolve([]),
  ]);

  const isRatingOpen = phase === ImdbLtaPhase.RATING_OPEN;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <ImdbLtaPhaseNav phase={phase} currentPath="/imdb-lta/rate" />
        <RatingPageClient
          movies={list.movies.map(serializeMovie)}
          highlights={highlights.map(serializeMovie)}
          pagination={list.pagination}
          isRatingOpen={isRatingOpen}
          filter={filter}
        />
      </div>
    </div>
  );
}
