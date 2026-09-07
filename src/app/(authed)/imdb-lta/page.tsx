import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  getImdbLtaPhase,
  getMyNominationList,
  listAdminNominationSnapshot,
} from '@/lib/api/imdb-lta';
import { NominationBuilder } from './_components/nomination-builder';
import { ImdbLtaPhase } from '@prisma/client';
import {
  ImdbLtaPhaseNav,
  phaseBannerCopy,
} from './_components/imdb-lta-phase-nav';
import { ImdbLtaAdminPhaseSwitcher } from './_components/imdb-lta-admin-phase-switcher';
import {
  ImdbLtaAdminNominationsOverview,
} from './_components/imdb-lta-admin-nominations-overview';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export const maxDuration = 60;

export default async function ImdbLtaPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect('/sign-in');
  }

  const isAdmin = session.user.role === 'admin';

  const [phase, nominationList, adminSnapshot] = await Promise.all([
    getImdbLtaPhase(),
    getMyNominationList(session.user.id),
    isAdmin ? listAdminNominationSnapshot() : Promise.resolve(null),
  ]);

  const isNominationOpen = phase === ImdbLtaPhase.NOMINATION_OPEN;
  const banner = phaseBannerCopy(phase);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <ImdbLtaPhaseNav phase={phase} currentPath="/imdb-lta" />

        {isAdmin && <ImdbLtaAdminPhaseSwitcher currentPhase={phase} />}

        {isAdmin && adminSnapshot && (
          <ImdbLtaAdminNominationsOverview
            snapshot={{
              uniqueMovies: adminSnapshot.uniqueMovies,
              totalNominations: adminSnapshot.totalNominations,
              listCount: adminSnapshot.listCount,
              submittedListCount: adminSnapshot.submittedListCount,
              participants: adminSnapshot.participants.map((p) => ({
                userId: p.userId,
                name: p.name,
                nominationCount: p.nominationCount,
                submittedAt: p.submittedAt?.toISOString() ?? null,
              })),
              movies: adminSnapshot.movies,
            }}
          />
        )}

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
                'border-white/10 bg-zinc-950/60 text-zinc-300'
            )}
          >
            <p className="text-sm font-bold uppercase tracking-wider opacity-90">
              {banner.title}
            </p>
            <p className="mt-1 text-sm opacity-80">{banner.body}</p>
            {phase === ImdbLtaPhase.RATING_OPEN && (
              <Link
                href="/imdb-lta/rate"
                className="mt-3 inline-block text-xs font-black uppercase tracking-widest text-yellow-400 underline underline-offset-4"
              >
                Ir a puntuar →
              </Link>
            )}
            {phase === ImdbLtaPhase.RATING_CLOSED && (
              <Link
                href="/imdb-lta/ranking"
                className="mt-3 inline-block text-xs font-black uppercase tracking-widest text-yellow-400 underline underline-offset-4"
              >
                Ver ranking oficial →
              </Link>
            )}
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
