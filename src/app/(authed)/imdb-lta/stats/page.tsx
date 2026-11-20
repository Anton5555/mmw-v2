import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { ImdbLtaPhase } from '@generated/prisma/client';
import { getImdbLtaPhase, loadImdbLtaDashboard } from '@/lib/api/imdb-lta';
import { getCurrentSession } from '@/lib/get-session';
import { LoadingSpinner } from '@/components/shared/loading-spinner';
import { ImdbLtaPhaseNav } from '../_components/imdb-lta-phase-nav';
import { StatsDashboard } from './_components/stats-dashboard';

export default function ImdbLtaStatsPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ImdbLtaStatsPageContent />
    </Suspense>
  );
}

async function ImdbLtaStatsPageContent() {
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

  const stats = await loadImdbLtaDashboard(session.user.id);
  const isAdmin = session.user.role === 'admin';

  return (
    <div className="mx-auto w-full px-4 py-8 sm:max-w-screen-sm md:max-w-screen-md lg:max-w-5xl xl:max-w-[1600px] xl:px-8 2xl:max-w-[1800px]">
      <div className="w-full">
        <ImdbLtaPhaseNav
          phase={phase}
          currentPath="/imdb-lta/stats"
          isAdmin={isAdmin}
        />
        <header className="mb-6 space-y-1">
          <h1 className="text-2xl font-black uppercase italic tracking-tight text-zinc-100 sm:text-3xl">
            Tus estadísticas
          </h1>
          <p className="text-sm text-zinc-400">
            Solo tus datos, sobre las películas que ya salieron en un lote.
            Nada del puntaje del grupo.
          </p>
        </header>
        {stats.inScopeCount === 0 ? (
          <p className="rounded-3xl border border-border bg-zinc-950/60 p-6 text-sm text-zinc-400">
            Todavía no salió ningún lote. Cuando salga el primero, acá vas a
            ver tus estadísticas.
          </p>
        ) : (
          <StatsDashboard stats={stats} />
        )}
      </div>
    </div>
  );
}
