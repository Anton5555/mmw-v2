import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getImdbLtaPhase } from '@/lib/api/imdb-lta';
import {
  getCurrentTriviaGame,
  listTriviaScoreboard,
  listTriviaWinnerOptions,
} from '@/lib/api/imdb-lta-trivia';
import { getCurrentSession } from '@/lib/get-session';
import { LoadingSpinner } from '@/components/shared/loading-spinner';
import { ImdbLtaPhaseNav } from '../../_components/imdb-lta-phase-nav';
import {
  ImdbLtaTriviaPanel,
  type TriviaPanelGame,
} from './_components/imdb-lta-trivia-panel';

export default function ImdbLtaTriviaPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ImdbLtaTriviaPageContent />
    </Suspense>
  );
}

async function ImdbLtaTriviaPageContent() {
  const session = await getCurrentSession();

  if (!session?.user) {
    redirect('/api/auth/clear-session');
  }

  if (session.user.role !== 'admin') {
    redirect('/imdb-lta');
  }

  const [phase, game, scoreboard, winners] = await Promise.all([
    getImdbLtaPhase(),
    getCurrentTriviaGame(),
    listTriviaScoreboard(),
    listTriviaWinnerOptions(),
  ]);

  const panelGame: TriviaPanelGame | null = game
    ? {
        id: game.id,
        number: game.number,
        status: game.status,
        imageStep: game.imageStep,
        clueStep: game.clueStep,
        backdropPath: game.backdropPath,
        movie: {
          id: game.movie.id,
          title: game.movie.title,
          originalTitle: game.movie.originalTitle,
          year: game.movie.releaseDate.getUTCFullYear(),
          posterUrl: game.movie.posterUrl,
          imdbId: game.movie.imdbId,
        },
        clues: game.cluesSnapshot.clues,
      }
    : null;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <ImdbLtaPhaseNav
          phase={phase}
          currentPath="/imdb-lta/admin/trivia"
          isAdmin
        />

        <header className="mb-8">
          <p className="text-xs font-black uppercase tracking-widest text-yellow-400">
            Admin
          </p>
          <h1 className="mt-1 text-3xl font-black uppercase italic tracking-tight">
            Trivia
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            Fotograma con revelación gradual y pistas de TMDB al grupo de
            Telegram. Una trivia a la vez.
          </p>
        </header>

        <ImdbLtaTriviaPanel
          game={panelGame}
          scoreboard={scoreboard}
          winners={winners}
        />
      </div>
    </div>
  );
}
