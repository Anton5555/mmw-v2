import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  getActiveEdition,
  getOscarLeaderboard,
  getOscarPredictionStats,
} from '@/lib/api/oscars';
import { OscarResultsPageClient } from '@/components/oscars/oscar-results-page-client';

export default async function OscarsResultsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect('/sign-in');
  }

  const edition = await getActiveEdition();

  if (!edition) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] p-4 text-white">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-black tracking-tighter">
            No hay edición activa
          </h1>
          <p className="text-muted-foreground">
            No hay ninguna edición de los Oscars disponible en este momento.
          </p>
        </div>
      </div>
    );
  }

  const [leaderboard, stats] = await Promise.all([
    getOscarLeaderboard(edition.id),
    getOscarPredictionStats(edition.id),
  ]);

  const ceremonyStarted =
    edition.ceremonyDate && new Date(edition.ceremonyDate) <= new Date();

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="container mx-auto max-w-6xl px-4 py-12">
        <header className="mb-12 text-center">
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-white">
            Resultados {edition.year}
          </h1>
          <p className="mt-3 text-zinc-400">
            {ceremonyStarted
              ? 'Clasificación y ganadores de Los Oscalos.'
              : 'Los resultados se actualizan cuando empieza la ceremonia.'}
          </p>
          {!ceremonyStarted && edition.ceremonyDate && (
            <p className="mt-2 text-sm text-zinc-500">
              Ceremonia:{' '}
              {new Date(edition.ceremonyDate).toLocaleString('es-ES', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          )}
        </header>
        <OscarResultsPageClient
          initialLeaderboard={leaderboard}
          initialStats={stats}
          edition={edition}
        />
      </div>
    </div>
  );
}
