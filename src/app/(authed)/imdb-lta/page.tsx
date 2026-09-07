import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getImdbLtaPhase, getMyNominationList } from '@/lib/api/imdb-lta';
import { NominationBuilder } from './_components/nomination-builder';
import { ImdbLtaPhase } from '@prisma/client';

export const maxDuration = 60;

export default async function ImdbLtaPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect('/sign-in');
  }

  const [phase, nominationList] = await Promise.all([
    getImdbLtaPhase(),
    getMyNominationList(session.user.id),
  ]);

  const isNominationOpen = phase === ImdbLtaPhase.NOMINATION_OPEN;

  return (
    <div className="container mx-auto px-4 py-8">
      <NominationBuilder
        initialMovies={nominationList.movies.map((m) => ({
          id: m.id,
          title: m.title,
          originalTitle: m.originalTitle,
          originalLanguage: m.originalLanguage,
          releaseDate: m.releaseDate.toISOString(),
          posterUrl: m.posterUrl,
          imdbId: m.imdbId,
          tmdbId: m.tmdbId,
          nominationId: m.nominationId,
          nominatedAt: m.nominatedAt.toISOString(),
        }))}
        initialSubmittedAt={nominationList.submittedAt?.toISOString() ?? null}
        isNominationOpen={isNominationOpen}
        phase={phase}
      />
    </div>
  );
}
