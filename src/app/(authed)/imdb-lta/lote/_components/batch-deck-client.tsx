'use client';

import { useEffect, useEffectEvent, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { toast } from 'sonner';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { EASE_OUT } from '@/lib/motion';
import {
  CheckCircle2,
  ExternalLink,
  EyeOff,
  Film,
  Loader2,
  SkipForward,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { submitRatingAction } from '@/lib/actions/imdb-lta/submit-rating';
import { markNotSeenAction } from '@/lib/actions/imdb-lta/mark-not-seen';

export type BatchDeckMovie = {
  id: number;
  title: string;
  originalTitle: string;
  releaseDate: string;
  posterUrl: string;
  imdbId: string;
  userNominated: boolean;
};

type BatchDeckClientProps = {
  batch: {
    id: number;
    number: number;
    openedAt: Date | string;
  };
  deck: BatchDeckMovie[];
  doneCount: number;
  skippedCount: number;
  totalInBatch: number;
  isRatingOpen: boolean;
};

type ExitDir = 'right' | 'left' | 'skip' | 'down';

const EXIT_ANIM: Record<
  ExitDir,
  { x: number; y: number; rotate: number; opacity: number }
> = {
  right: { x: 520, y: -28, rotate: 18, opacity: 0 },
  left: { x: -520, y: 28, rotate: -18, opacity: 0 },
  skip: { x: 120, y: -260, rotate: 10, opacity: 0 },
  down: { x: 40, y: 460, rotate: -8, opacity: 0 },
};

const IDLE_ANIM = { x: 0, y: 0, rotate: 0, opacity: 1, scale: 1 };

// The fly-out is a tween of known length so the deck can advance exactly when
// it lands, instead of cutting a still-settling spring off with a guess.
const EXIT_DURATION_S = 0.25;
const EXIT_TRANSITION = { duration: EXIT_DURATION_S, ease: EASE_OUT };
const ENTER_SPRING = { type: 'spring' as const, duration: 0.4, bounce: 0.15 };
// Keyboard ratings are repeated hundreds of times per batch: no movement,
// just a quick fade so the swap still registers.
const INSTANT_ENTER = { duration: 0.12, ease: EASE_OUT };

const NOT_SEEN_HREF = '/imdb-lta/rate?filter=not_seen';

/** In-flight save for a card that may already have left the deck. */
type SavePhase = 'pending' | 'advanced' | 'failed';

function NotSeenRecall({ count }: { count: number }) {
  const label = count === 1 ? '1 no vista' : `${count} no vistas`;
  return (
    <p className="text-xs text-zinc-400">
      <Link href={NOT_SEEN_HREF} className="font-bold text-yellow-400 underline">
        {label}
      </Link>
      {count === 1 ? ' · puntuála si la ves' : ' · puntuálas si las ves'}
    </p>
  );
}

function posterSrc(posterUrl: string) {
  if (!posterUrl) return '';
  return posterUrl.startsWith('http')
    ? posterUrl
    : `https://image.tmdb.org/t/p/w500${posterUrl}`;
}

export function BatchDeckClient({
  batch,
  deck: initialDeck,
  doneCount: initialDoneCount,
  skippedCount: initialSkippedCount,
  totalInBatch,
  isRatingOpen,
}: BatchDeckClientProps) {
  const reduceMotion = useReducedMotion();
  const [deck, setDeck] = useState(initialDeck);
  const [doneCount, setDoneCount] = useState(initialDoneCount);
  const [skippedCount, setSkippedCount] = useState(initialSkippedCount);
  const countedNotSeen = useRef(new Set<number>());
  const savePhase = useRef(new Map<number, SavePhase>());
  const [pendingScore, setPendingScore] = useState<number | null>(null);
  const [exitDir, setExitDir] = useState<ExitDir | null>(null);
  // 'instant' after a keyboard rating (or with reduced motion): the next card
  // fades in without the fly-out / slide-up.
  const [swapMode, setSwapMode] = useState<'fly' | 'instant'>('fly');
  const keyboardInput = useRef(false);

  const current = deck[0] ?? null;
  const nextUp = deck[1] ?? null;
  const remaining = deck.length;
  const progressDone = doneCount;
  const progressTotal = Math.max(totalInBatch, 1);
  const progressPct = Math.min(
    100,
    Math.round((progressDone / progressTotal) * 100)
  );
  // The fly-out is the only lock. The save stays in the background so the
  // next card is clickable the moment it lands.
  const busy = exitDir !== null;

  const advance = (movieId: number, asNotSeen = false) => {
    const phase = savePhase.current.get(movieId);
    if (phase === 'failed') {
      savePhase.current.delete(movieId);
      return;
    }
    if (phase === 'pending') {
      savePhase.current.set(movieId, 'advanced');
    }
    setDeck((prev) => prev.filter((m) => m.id !== movieId));
    setDoneCount((n) => n + 1);
    if (asNotSeen) {
      countedNotSeen.current.add(movieId);
      setSkippedCount((n) => n + 1);
    }
  };

  const restoreFront = (movie: BatchDeckMovie) => {
    const phase = savePhase.current.get(movie.id);
    if (phase !== 'advanced') {
      // Card is still on screen; skip the upcoming advance.
      savePhase.current.set(movie.id, 'failed');
      return;
    }
    savePhase.current.delete(movie.id);
    setDeck((prev) =>
      prev.some((m) => m.id === movie.id) ? prev : [movie, ...prev]
    );
    setDoneCount((n) => Math.max(0, n - 1));
    if (countedNotSeen.current.delete(movie.id)) {
      setSkippedCount((n) => Math.max(0, n - 1));
    }
  };

  /**
   * Play the fling, then run `onDone` (advance deck / rotate).
   * The server write starts immediately and does not lock the next card.
   * On failure the movie snaps back to the front.
   */
  const fling = (
    dir: ExitDir,
    movie: BatchDeckMovie,
    onDone: () => void,
    work?: () => Promise<void>
  ) => {
    if (exitDir) return;
    const instant = reduceMotion || keyboardInput.current;
    keyboardInput.current = false;
    setSwapMode(instant ? 'instant' : 'fly');

    const finish = () => {
      onDone();
      setExitDir(null);
      setPendingScore(null);
    };

    if (work) {
      savePhase.current.set(movie.id, 'pending');
      void work()
        .then(() => {
          const phase = savePhase.current.get(movie.id);
          if (phase === 'pending' || phase === 'advanced') {
            savePhase.current.delete(movie.id);
          }
        })
        .catch((error: unknown) => {
          toast.error(
            error instanceof Error ? error.message : 'No se pudo guardar'
          );
          restoreFront(movie);
        });
    }

    if (instant) {
      finish();
      return;
    }

    setExitDir(dir);
    window.setTimeout(finish, EXIT_DURATION_S * 1000);
  };

  const handleScore = (score: number) => {
    if (!current || !isRatingOpen || busy) return;
    const movie = current;
    setPendingScore(score);
    fling(
      score <= 3 ? 'left' : 'right',
      movie,
      () => advance(movie.id),
      async () => {
        await submitRatingAction(movie.id, score);
        toast.success(`${score}/10 guardado`);
      }
    );
  };

  const handleSkip = () => {
    if (!current || busy || remaining <= 1) return;
    const movie = current;
    fling('skip', movie, () => {
      setDeck((prev) => {
        if (prev.length <= 1) return prev;
        const [first, ...rest] = prev;
        return [...rest, first];
      });
    });
  };

  const handleNotSeen = () => {
    if (!current || !isRatingOpen || busy) return;
    const movie = current;
    setPendingScore(-1);
    fling(
      'down',
      movie,
      () => advance(movie.id, true),
      async () => {
        await markNotSeenAction(movie.id);
        toast.message('Marcada como no vista', {
          description: 'Queda en Tus puntajes → No vistas, por si la ves.',
        });
      }
    );
  };

  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (!current || !isRatingOpen || busy) return;
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const target = event.target as HTMLElement | null;
    if (
      target &&
      (target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable)
    ) {
      return;
    }

    keyboardInput.current = true;
    if (event.key >= '0' && event.key <= '9') {
      event.preventDefault();
      handleScore(Number(event.key));
    } else if (event.key === '=' || event.key === '+') {
      event.preventDefault();
      handleScore(10);
    } else if (event.key.toLowerCase() === 'n') {
      event.preventDefault();
      handleNotSeen();
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      handleSkip();
    }
    keyboardInput.current = false;
  });

  useEffect(() => {
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);


  return (
    <div className="space-y-4 overflow-x-clip">
      <div className="space-y-2">
        <div className="flex items-baseline justify-between gap-3">
          <div className="flex items-baseline gap-2.5">
            <span className="rounded-sm bg-yellow-500/15 px-2.5 py-0.5 text-xs font-bold text-yellow-400">
              Lote #{batch.number}
            </span>
            <span className="text-xs text-zinc-500">
              Dura ~2 días · promedios al cerrar la votación
            </span>
          </div>
          <span className="shrink-0 font-mono text-xs font-bold text-zinc-300">
            {progressDone} / {progressTotal}
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-sm bg-zinc-900">
          <motion.div
            className="h-full w-full rounded-sm bg-yellow-500"
            initial={false}
            style={{ originX: 0 }}
            animate={{ scaleX: progressPct / 100 }}
            transition={{ duration: 0.3, ease: EASE_OUT }}
          />
        </div>
        {current && skippedCount > 0 && <NotSeenRecall count={skippedCount} />}
      </div>

      <div className="relative min-h-[28rem] overflow-visible">
        <AnimatePresence mode="wait" initial={false}>
          {!current ? (
            <motion.div
              key="done"
              initial={reduceMotion ? false : { opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={ENTER_SPRING}
              className="rounded-3xl border border-border bg-zinc-950/80 p-8 text-center"
            >
              <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-emerald-400" />
              <p className="text-xs font-bold text-yellow-500">
                Lote #{batch.number}
              </p>
              <h1 className="mt-1 text-2xl font-black uppercase italic tracking-tight">
                Ya votaste este lote
              </h1>
              <p className="mx-auto mt-2 max-w-sm text-sm text-zinc-400">
                Cuando salga el próximo lote te avisamos por Telegram (~2 días).
                Mientras tanto podés{' '}
                <Link
                  href="/imdb-lta/rate"
                  className="text-yellow-400 underline"
                >
                  revisar o cambiar puntajes
                </Link>
                .
              </p>
              {skippedCount > 0 && (
                <p className="mx-auto mt-4 max-w-sm text-sm text-zinc-300">
                  {skippedCount === 1
                    ? 'Marcaste 1 como no vista. Si la ves, '
                    : `Marcaste ${skippedCount} como no vistas. Si las ves, `}
                  <Link href={NOT_SEEN_HREF} className="text-yellow-400 underline">
                    {skippedCount === 1 ? 'puntuála acá' : 'puntuálas acá'}
                  </Link>
                  .
                </p>
              )}
            </motion.div>
          ) : (
            <motion.div
              key={current.id}
              initial={
                swapMode === 'instant'
                  ? { opacity: 0 }
                  : { opacity: 0, scale: 0.94, y: 40, rotate: -1.5 }
              }
              animate={exitDir ? EXIT_ANIM[exitDir] : IDLE_ANIM}
              transition={
                exitDir
                  ? EXIT_TRANSITION
                  : swapMode === 'instant'
                    ? INSTANT_ENTER
                    : ENTER_SPRING
              }
              className="relative overflow-hidden rounded-3xl border border-border bg-zinc-950/90 shadow-2xl will-change-transform"
            >
              <DeckCard
                movie={current}
                isRatingOpen={isRatingOpen}
                busy={busy}
                pendingScore={pendingScore}
                remaining={remaining}
                onScore={handleScore}
                onNotSeen={handleNotSeen}
                onSkip={handleSkip}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {current && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-[11px] text-zinc-500">
          {nextUp ? (
            <span className="truncate">
              Sigue: <span className="text-zinc-400">{nextUp.title}</span>
            </span>
          ) : (
            <span>Última del lote</span>
          )}
          <span className="hidden sm:inline">
            Teclado:{' '}
            <kbd className="font-mono text-zinc-400">0–9</kbd> ·{' '}
            <kbd className="font-mono text-zinc-400">=</kbd> es 10 ·{' '}
            <kbd className="font-mono text-zinc-400">N</kbd> no la vi ·{' '}
            <kbd className="font-mono text-zinc-400">→</kbd> pasar
          </span>
        </div>
      )}
    </div>
  );
}

function DeckCard({
  movie,
  isRatingOpen,
  busy,
  pendingScore,
  remaining,
  onScore,
  onNotSeen,
  onSkip,
}: {
  movie: BatchDeckMovie;
  isRatingOpen: boolean;
  busy: boolean;
  pendingScore: number | null;
  remaining: number;
  onScore: (score: number) => void;
  onNotSeen: () => void;
  onSkip: () => void;
}) {
  const src = posterSrc(movie.posterUrl);
  const year = (() => {
    try {
      return new Date(movie.releaseDate).getFullYear();
    } catch {
      return null;
    }
  })();
  const showOriginalTitle =
    movie.originalTitle &&
    movie.originalTitle.trim().toLowerCase() !==
      movie.title.trim().toLowerCase();

  return (
    <>
      {src && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-56 opacity-25 blur-3xl"
          style={{
            backgroundImage: `url(${src})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      )}

      <div className="relative space-y-5 p-5 sm:p-6 xl:p-8">
        <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-end sm:gap-5 sm:text-left xl:gap-8">
          <Link
            href={`/imdb-lta/movie/${movie.id}`}
            aria-label={`Ver ficha de ${movie.title}`}
            className="relative aspect-2/3 w-36 shrink-0 overflow-hidden rounded-2xl border border-white/15 bg-zinc-900 shadow-lg transition-colors hover:border-yellow-400/60 sm:w-40 lg:w-52 xl:w-64 2xl:w-72"
          >
            {src ? (
              <Image
                src={src}
                alt={movie.title}
                fill
                className="object-cover"
                sizes="(min-width: 1536px) 288px, (min-width: 1280px) 256px, (min-width: 1024px) 208px, 160px"
                priority
                unoptimized
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <Film className="h-10 w-10 text-zinc-700" />
              </div>
            )}
          </Link>

          <div className="min-w-0 flex-1 space-y-1.5">
            {movie.userNominated && (
              <span className="inline-flex items-center gap-1 rounded-sm border border-yellow-500/30 bg-yellow-500/10 px-2.5 py-0.5 text-xs font-bold text-yellow-300">
                <Sparkles className="h-3 w-3" />
                La nominaste vos
              </span>
            )}
            <h1 className="text-2xl font-black uppercase italic leading-tight tracking-tight sm:text-3xl xl:text-4xl">
              <Link
                href={`/imdb-lta/movie/${movie.id}`}
                className="hover:text-yellow-400"
              >
                {movie.title}
              </Link>
            </h1>
            <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs text-zinc-400 sm:justify-start">
              {showOriginalTitle && (
                <span className="italic text-zinc-500">
                  {movie.originalTitle}
                </span>
              )}
              {showOriginalTitle && year && <span>·</span>}
              {year && <span className="font-mono">{year}</span>}
              {movie.imdbId && (
                <>
                  <span>·</span>
                  <a
                    href={`https://www.imdb.com/title/${movie.imdbId}/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-zinc-400 hover:text-yellow-400"
                  >
                    IMDb
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-xs font-bold text-zinc-500">
            <span>0 · malísima</span>
            <span>¿Qué puntaje le ponés?</span>
            <span>10 · obra maestra</span>
          </div>

          <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-11">
            {Array.from({ length: 11 }, (_, score) => {
              const isThisPending = busy && pendingScore === score;
              return (
                <button
                  key={score}
                  type="button"
                  disabled={!isRatingOpen || busy}
                  onClick={() => onScore(score)}
                  className={cn(
                    'flex h-11 cursor-pointer items-center justify-center rounded-xl border font-mono text-sm font-bold transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 xl:h-12 xl:text-base',
                    score === 10 && 'col-span-2 sm:col-span-1',
                    score <= 3 &&
                      'border-red-500/25 bg-red-950/20 text-red-200 hover:border-red-400 hover:bg-red-500/25',
                    score >= 4 &&
                      score <= 6 &&
                      'border-border bg-zinc-900/80 text-zinc-200 hover:border-white/30 hover:bg-zinc-800',
                    score >= 7 &&
                      score <= 8 &&
                      'border-amber-500/30 bg-amber-500/10 text-amber-200 hover:border-amber-400 hover:bg-amber-500/25',
                    score >= 9 &&
                      'border-emerald-500/35 bg-emerald-500/15 text-emerald-200 hover:border-emerald-400 hover:bg-emerald-500/30'
                  )}
                >
                  {isThisPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    score
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            className="h-10 flex-1 border-white/15 bg-zinc-900/70 text-zinc-200 hover:bg-zinc-800"
            disabled={!isRatingOpen || busy}
            onClick={onNotSeen}
          >
            {busy && pendingScore === -1 ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <EyeOff className="mr-2 h-4 w-4" />
            )}
            No la vi
          </Button>
          {remaining > 1 && (
            <Button
              type="button"
              variant="ghost"
              className="h-10 text-xs text-zinc-400 hover:text-zinc-200"
              disabled={busy}
              onClick={onSkip}
            >
              Pasar
              <SkipForward className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
