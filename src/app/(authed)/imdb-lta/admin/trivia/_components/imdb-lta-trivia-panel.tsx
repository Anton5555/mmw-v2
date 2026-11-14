'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Dices,
  ImageIcon,
  Loader2,
  MessageSquare,
  Shield,
  SkipForward,
  Trophy,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  abandonTriviaGameAction,
  createTriviaDraftAction,
  discardTriviaDraftAction,
  rerollTriviaImageAction,
  rerollTriviaMovieAction,
  revealNextImageAction,
  sendNextClueAction,
  solveTriviaGameAction,
  startTriviaGameAction,
} from '@/lib/actions/imdb-lta/trivia';
import { TRIVIA_IMAGE_STEP_COUNT } from '@/lib/utils/trivia-image';

export type TriviaPanelGame = {
  id: number;
  number: number;
  status: 'DRAFT' | 'ACTIVE' | 'SOLVED' | 'ABANDONED';
  imageStep: number;
  clueStep: number;
  backdropPath: string;
  movie: {
    id: number;
    title: string;
    originalTitle: string;
    year: number;
    posterUrl: string;
    imdbId: string;
  };
  clues: Array<{ key: string; label: string; text: string }>;
};

export type TriviaPanelScore = {
  userId: string;
  name: string;
  wins: number;
};

export type TriviaPanelWinner = {
  userId: string;
  name: string;
};

type ImdbLtaTriviaPanelProps = {
  game: TriviaPanelGame | null;
  scoreboard: TriviaPanelScore[];
  winners: TriviaPanelWinner[];
};

function frameUrl(gameId: number, step: number, cacheKey: string) {
  return `/api/admin/trivia/frame?gameId=${gameId}&step=${step}&v=${encodeURIComponent(cacheKey)}`;
}

export function ImdbLtaTriviaPanel({
  game,
  scoreboard,
  winners,
}: ImdbLtaTriviaPanelProps) {
  const [isPending, startTransition] = useTransition();
  const [winnerUserId, setWinnerUserId] = useState<string>('');
  const router = useRouter();

  const run = (label: string, action: () => Promise<unknown>) => {
    if (isPending) return;
    startTransition(async () => {
      try {
        await action();
        toast.success(label);
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : 'No se pudo completar la acción'
        );
      }
    });
  };

  const nextImageStep = game
    ? Math.min(game.imageStep + 1, TRIVIA_IMAGE_STEP_COUNT)
    : 1;
  const nextClue =
    game && game.clueStep < game.clues.length
      ? game.clues[game.clueStep]
      : null;
  const sentClues = game ? game.clues.slice(0, game.clueStep) : [];
  const cacheKey = game
    ? `${game.backdropPath}:${game.id}:${game.imageStep}`
    : '';

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-yellow-500/30 bg-yellow-950/20 p-4">
        <div className="mb-3 flex items-center gap-2">
          <Shield className="h-4 w-4 text-yellow-400" />
          <p className="text-xs font-black uppercase tracking-widest text-yellow-400">
            Admin · Trivia
          </p>
          {isPending && (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-yellow-400" />
          )}
        </div>

        {!game && (
          <div className="space-y-3">
            <p className="text-sm text-yellow-100/80">
              Elegí una película al azar de las que todavía no salieron en un
              lote. Si te gusta, arrancás el juego en el grupo de Telegram.
            </p>
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() =>
                run('Borrador listo', () => createTriviaDraftAction())
              }
              className="border-yellow-500/40 bg-yellow-500/10 text-yellow-100 hover:bg-yellow-500/20"
            >
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Dices className="mr-2 h-4 w-4" />
              )}
              Elegir película al azar
            </Button>
          </div>
        )}

        {game?.status === 'DRAFT' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-start gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={game.movie.posterUrl}
                alt=""
                className="h-36 w-24 rounded-lg object-cover"
              />
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-xs font-black uppercase tracking-widest text-yellow-500">
                  Trivia #{game.number} · borrador
                </p>
                <h2 className="text-xl font-black uppercase italic tracking-tight text-yellow-50">
                  {game.movie.title}{' '}
                  <span className="text-yellow-200/70">
                    ({game.movie.year})
                  </span>
                </h2>
                {game.movie.originalTitle !== game.movie.title && (
                  <p className="text-sm text-yellow-200/60">
                    {game.movie.originalTitle}
                  </p>
                )}
                <p className="text-xs text-yellow-200/50">
                  {game.clues.length} pistas armadas · crop 1/
                  {TRIVIA_IMAGE_STEP_COUNT}
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-widest text-yellow-400/80">
                  Fotograma completo
                </p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={frameUrl(game.id, TRIVIA_IMAGE_STEP_COUNT, cacheKey)}
                  alt="Fotograma completo"
                  className="w-full rounded-lg border border-yellow-500/20 bg-black/40"
                />
              </div>
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-widest text-yellow-400/80">
                  Primer crop (lo que se manda)
                </p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={frameUrl(game.id, 1, cacheKey)}
                  alt="Primer crop"
                  className="w-full rounded-lg border border-yellow-500/20 bg-black/40"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={isPending}
                onClick={() =>
                  run('Trivia iniciada en Telegram', () =>
                    startTriviaGameAction()
                  )
                }
                className="bg-yellow-500 text-black hover:bg-yellow-400"
              >
                Empezar
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() =>
                  run('Otra película', () => rerollTriviaMovieAction())
                }
                className="border-yellow-500/40 text-yellow-100"
              >
                <Dices className="mr-2 h-4 w-4" />
                Otra película
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() =>
                  run('Otra imagen', () => rerollTriviaImageAction())
                }
                className="border-yellow-500/40 text-yellow-100"
              >
                <ImageIcon className="mr-2 h-4 w-4" />
                Otra imagen
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={isPending}
                onClick={() =>
                  run('Borrador descartado', () => discardTriviaDraftAction())
                }
                className="text-yellow-200/70"
              >
                <X className="mr-2 h-4 w-4" />
                Descartar
              </Button>
            </div>
          </div>
        )}

        {game?.status === 'ACTIVE' && (
          <div className="space-y-5">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-yellow-500">
                Trivia #{game.number} · activa
              </p>
              <h2 className="mt-1 text-xl font-black uppercase italic tracking-tight text-yellow-50">
                {game.movie.title}{' '}
                <span className="text-yellow-200/70">({game.movie.year})</span>
              </h2>
              <p className="mt-1 text-xs text-yellow-200/50">
                Solo vos ves el título acá. En Telegram siguen las pistas.
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-3 rounded-xl border border-yellow-500/20 bg-black/20 p-3">
                <p className="text-xs font-black uppercase tracking-widest text-yellow-400">
                  Imagen · paso {game.imageStep}/{TRIVIA_IMAGE_STEP_COUNT}
                </p>
                {game.imageStep < TRIVIA_IMAGE_STEP_COUNT ? (
                  <>
                    <p className="text-xs text-yellow-200/60">
                      Próximo crop (preview):
                    </p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={frameUrl(game.id, nextImageStep, cacheKey)}
                      alt={`Crop ${nextImageStep}`}
                      className="w-full rounded-lg border border-yellow-500/20"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isPending}
                      onClick={() =>
                        run(`Revelación ${nextImageStep} enviada`, () =>
                          revealNextImageAction()
                        )
                      }
                      className="border-yellow-500/40 text-yellow-100"
                    >
                      <ImageIcon className="mr-2 h-4 w-4" />
                      Revelar más
                    </Button>
                  </>
                ) : (
                  <p className="text-sm text-yellow-200/70">
                    Imagen completa ya revelada.
                  </p>
                )}
              </div>

              <div className="space-y-3 rounded-xl border border-yellow-500/20 bg-black/20 p-3">
                <p className="text-xs font-black uppercase tracking-widest text-yellow-400">
                  Pistas · {game.clueStep}/{game.clues.length}
                </p>
                {sentClues.length > 0 && (
                  <ul className="space-y-2 text-sm text-yellow-100/80">
                    {sentClues.map((clue, index) => (
                      <li key={clue.key}>
                        <span className="font-bold text-yellow-300">
                          {index + 1}. {clue.label}:
                        </span>{' '}
                        {clue.text}
                      </li>
                    ))}
                  </ul>
                )}
                {nextClue ? (
                  <>
                    <p className="text-xs text-yellow-200/60">
                      Siguiente: <span className="font-bold">{nextClue.label}</span>{' '}
                      — {nextClue.text}
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isPending}
                      onClick={() =>
                        run('Pista enviada', () => sendNextClueAction())
                      }
                      className="border-yellow-500/40 text-yellow-100"
                    >
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Siguiente pista
                    </Button>
                  </>
                ) : (
                  <p className="text-sm text-yellow-200/70">
                    No quedan más pistas.
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-3 rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-3">
              <p className="text-xs font-black uppercase tracking-widest text-emerald-400">
                Resolver
              </p>
              <div className="flex flex-wrap items-end gap-2">
                <div className="min-w-[14rem] flex-1">
                  <Select
                    value={winnerUserId}
                    onValueChange={setWinnerUserId}
                    disabled={isPending}
                  >
                    <SelectTrigger className="border-emerald-500/30 bg-black/30 text-emerald-50">
                      <SelectValue placeholder="Quién la adivinó" />
                    </SelectTrigger>
                    <SelectContent>
                      {winners.map((person) => (
                        <SelectItem key={person.userId} value={person.userId}>
                          {person.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="button"
                  disabled={isPending || !winnerUserId}
                  onClick={() =>
                    run('Trivia resuelta', () =>
                      solveTriviaGameAction({ winnerUserId })
                    )
                  }
                  className="bg-emerald-500 text-black hover:bg-emerald-400"
                >
                  <Trophy className="mr-2 h-4 w-4" />
                  Marcar resuelto
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={isPending}
                  onClick={() =>
                    run('Trivia cerrada sin ganador', () =>
                      abandonTriviaGameAction()
                    )
                  }
                  className="text-emerald-200/70"
                >
                  <SkipForward className="mr-2 h-4 w-4" />
                  Revelar sin ganador
                </Button>
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-white/10 bg-zinc-950/40 p-4">
        <p className="mb-3 text-xs font-black uppercase tracking-widest text-zinc-400">
          Marcador
        </p>
        {scoreboard.length === 0 ? (
          <p className="text-sm text-zinc-500">Todavía no hay ganadores.</p>
        ) : (
          <ol className="space-y-2">
            {scoreboard.map((row, index) => (
              <li
                key={row.userId}
                className="flex items-center justify-between text-sm text-zinc-200"
              >
                <span>
                  <span className="mr-2 font-black text-yellow-500">
                    #{index + 1}
                  </span>
                  {row.name}
                </span>
                <span className="font-bold text-yellow-300">
                  {row.wins} {row.wins === 1 ? 'acierto' : 'aciertos'}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
