import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getImdbLtaPhase } from '@/lib/api/imdb-lta';
import {
  getHostedTriviaGame,
  listTriviaScoreboard,
  listTriviaWinnerOptions,
} from '@/lib/api/imdb-lta-trivia';
import { getCurrentSession } from '@/lib/get-session';
import { LoadingSpinner } from '@/components/shared/loading-spinner';
import { ImdbLtaPhaseNav } from '../_components/imdb-lta-phase-nav';
import { ImdbLtaTriviaPanel } from '../admin/trivia/_components/imdb-lta-trivia-panel';
import { toTriviaPanelGame } from '../admin/trivia/_components/to-trivia-panel-game';

/** For the member an admin picked to run the current trivia. */
export default function ImdbLtaHostTriviaPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ImdbLtaHostTriviaPageContent />
    </Suspense>
  );
}

async function ImdbLtaHostTriviaPageContent() {
  const session = await getCurrentSession();

  if (!session?.user) {
    redirect('/api/auth/clear-session');
  }

  if (session.user.role === 'admin') {
    redirect('/imdb-lta/admin/trivia');
  }

  const game = await getHostedTriviaGame(session.user.id);
  // Only the host sees the title or the full ladder. Anyone else gets the
  // empty state, same as a host whose game already ended.
  const [phase, scoreboard, winners] = await Promise.all([
    getImdbLtaPhase(),
    listTriviaScoreboard(),
    game ? listTriviaWinnerOptions() : Promise.resolve([]),
  ]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <ImdbLtaPhaseNav phase={phase} currentPath="/imdb-lta/trivia" />

        <header className="mb-8">
          <h1 className="text-3xl font-black uppercase italic tracking-tight">
            Trivia
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            Te tocó conducir. Mandá las revelaciones de la imagen desde acá,
            escribí las pistas vos en el grupo de Telegram y marcá quién la
            adivinó. Cuando termina, esta página se cierra.
          </p>
        </header>

        <ImdbLtaTriviaPanel
          mode="host"
          game={game ? toTriviaPanelGame(game) : null}
          scoreboard={scoreboard}
          winners={winners}
        />
      </div>
    </div>
  );
}
