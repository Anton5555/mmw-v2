import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import {
  getImdbLtaPhase,
  getMyNominationList,
} from '@/lib/api/imdb-lta';
import { NominationBuilder } from './_components/nomination-builder';
import { ImdbLtaPhase } from '@generated/prisma/client';
import {
  ImdbLtaPhaseNav,
  phaseBannerCopy,
} from './_components/imdb-lta-phase-nav';
import { cn } from '@/lib/utils';
import { isImdbLtaNominationDeadlinePassed } from '@/lib/validations/imdb-lta';
import { getCurrentSession } from '@/lib/get-session';
import { LoadingSpinner } from '@/components/shared/loading-spinner';

export const maxDuration = 60;

export default function ImdbLtaPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ImdbLtaPageContent />
    </Suspense>
  );
}

async function ImdbLtaPageContent() {
  const session = await getCurrentSession();

  if (!session?.user) {
    redirect('/api/auth/clear-session');
  }

  const isAdmin = session.user.role === 'admin';
  const phase = await getImdbLtaPhase();

  // During scoring, send everyone to the rating surfaces. Personal lists live on
  // Inicio; admin controls live on /imdb-lta/admin.
  if (phase === ImdbLtaPhase.RATING_OPEN) {
    redirect('/imdb-lta/lote');
  }

  if (phase === ImdbLtaPhase.RATING_CLOSED) {
    redirect('/imdb-lta/ranking');
  }

  const nominationList = await getMyNominationList(session.user.id);

  const isNominationOpen =
    phase === ImdbLtaPhase.NOMINATION_OPEN &&
    !isImdbLtaNominationDeadlinePassed();
  const banner = phaseBannerCopy(phase);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <ImdbLtaPhaseNav
          phase={phase}
          currentPath="/imdb-lta"
          isAdmin={isAdmin}
        />

        {banner && (
          <div
            className={cn(
              'mb-6 rounded-2xl border p-4',
              banner.tone === 'amber' &&
                'border-amber-500/20 bg-amber-950/40 text-amber-200',
              banner.tone === 'emerald' &&
                'border-emerald-500/20 bg-emerald-950/40 text-emerald-200',
              banner.tone === 'blue' &&
                'border-blue-500/20 bg-blue-950/40 text-blue-200',
              banner.tone === 'zinc' &&
                'border-border bg-zinc-950/60 text-zinc-300'
            )}
          >
            <p className="text-sm font-bold uppercase tracking-wider opacity-90">
              {banner.title}
            </p>
            <p className="mt-1 text-sm opacity-80">{banner.body}</p>
          </div>
        )}

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
    </div>
  );
}
