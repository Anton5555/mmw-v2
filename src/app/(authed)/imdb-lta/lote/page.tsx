import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ImdbLtaPhase } from '@generated/prisma/client';
import { getImdbLtaPhase, listOpenBatchDeck } from '@/lib/api/imdb-lta';
import { getCurrentSession } from '@/lib/get-session';
import { LoadingSpinner } from '@/components/shared/loading-spinner';
import { ImdbLtaPhaseNav } from '../_components/imdb-lta-phase-nav';
import { BatchDeckClient } from './_components/batch-deck-client';

export default function ImdbLtaLotePage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ImdbLtaLotePageContent />
    </Suspense>
  );
}

async function ImdbLtaLotePageContent() {
  const session = await getCurrentSession();

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

  const deck =
    phase === ImdbLtaPhase.RATING_OPEN
      ? await listOpenBatchDeck(session.user.id)
      : null;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-xl">
        <ImdbLtaPhaseNav phase={phase} currentPath="/imdb-lta/lote" />

        {phase === ImdbLtaPhase.RATING_CLOSED ? (
          <div className="rounded-2xl border border-white/10 bg-zinc-950/60 px-6 py-16 text-center">
            <p className="text-sm text-zinc-400">
              Ya cerramos los puntajes. Mirá el{' '}
              <Link
                href="/imdb-lta/ranking"
                className="text-yellow-400 underline"
              >
                ranking oficial
              </Link>
              .
            </p>
          </div>
        ) : !deck ? (
          <div className="rounded-2xl border border-dashed border-white/10 px-6 py-16 text-center">
            <p className="text-sm font-bold uppercase tracking-wide text-zinc-300">
              No hay lote abierto
            </p>
            <p className="mt-2 text-sm text-zinc-500">
              Cuando un admin tire el próximo lote vas a poder votar acá.
              Mientras tanto podés{' '}
              <Link href="/imdb-lta/rate" className="text-yellow-400 underline">
                revisar puntajes
              </Link>{' '}
              de lotes anteriores.
            </p>
          </div>
        ) : (
          <BatchDeckClient
            key={deck.batch.id}
            batch={{
              id: deck.batch.id,
              number: deck.batch.number,
              openedAt: deck.batch.openedAt,
            }}
            deck={deck.deck.map((m) => ({
              id: m.id,
              title: m.title,
              originalTitle: m.originalTitle,
              releaseDate: m.releaseDate.toISOString(),
              posterUrl: m.posterUrl,
              imdbId: m.imdbId,
              userNominated: m.userNominated,
            }))}
            doneCount={deck.doneCount}
            skippedCount={deck.skippedCount}
            ineligibleCount={deck.ineligibleCount}
            totalInBatch={deck.totalInBatch}
            isRatingOpen
          />
        )}
      </div>
    </div>
  );
}
