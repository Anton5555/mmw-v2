'use client';

import { useState, useTransition } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  ArrowRight,
  ExternalLink,
  Film,
  Loader2,
  Sparkles,
  Star,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { submitRatingAction } from '@/lib/actions/imdb-lta/submit-rating';
import { useImdbLtaRateParams } from '@/lib/hooks/useImdbLtaRateParams';
import {
  IMDB_LTA_MIN_RATINGS_TO_QUALIFY,
  type ImdbLtaRatingFilter,
} from '@/lib/validations/imdb-lta';
import { useRouter } from 'next/navigation';

export type RateMovieClient = {
  id: number;
  title: string;
  originalTitle: string;
  originalLanguage: string;
  releaseDate: string;
  posterUrl: string;
  imdbId: string;
  tmdbId: number | null;
  nominationCount: number;
  ratingCount: number;
  averageScore: number | null;
  userNominated: boolean;
  userScore: number | null;
  batchState: 'locked' | 'open' | 'released';
  userSkipped: boolean;
};

type RatingPageClientProps = {
  movies: RateMovieClient[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  isRatingOpen: boolean;
  filter: ImdbLtaRatingFilter;
};

const FILTERS: { key: ImdbLtaRatingFilter; label: string }[] = [
  { key: 'needs_votes', label: 'Necesitan votos' },
  { key: 'enough_votes', label: 'Con votos suficientes' },
  { key: 'mine_done', label: 'Ya puntuadas' },
  { key: 'not_seen', label: 'No vistas' },
];

function filterHeading(filter: ImdbLtaRatingFilter) {
  switch (filter) {
    case 'mine_done':
      return 'Tus puntajes';
    case 'enough_votes':
      return 'Ya llegan al ranking';
    case 'not_seen':
      return 'No vistas';
    default:
      return 'Les faltan votos';
  }
}

function posterSrc(posterUrl: string) {
  if (!posterUrl) return '';
  return posterUrl.startsWith('http')
    ? posterUrl
    : `https://image.tmdb.org/t/p/w500${posterUrl}`;
}

function formatAvg(avg: number | null) {
  if (avg === null) return null;
  return avg.toFixed(2);
}

function scoreButtonClass(score: number, currentScore: number | null) {
  const selected = score === currentScore;
  if (selected) {
    return 'border-yellow-400 bg-yellow-500/30 text-yellow-100 ring-1 ring-yellow-400/60';
  }
  // Traffic light: red → amber → green
  if (score <= 3) {
    return 'border-red-500/25 bg-red-950/20 text-red-200 hover:border-red-400 hover:bg-red-500/25';
  }
  if (score <= 6) {
    return 'border-white/10 bg-zinc-900/80 text-zinc-200 hover:border-white/30 hover:bg-zinc-800';
  }
  if (score <= 8) {
    return 'border-amber-500/30 bg-amber-500/10 text-amber-200 hover:border-amber-400 hover:bg-amber-500/25';
  }
  return 'border-emerald-500/35 bg-emerald-500/15 text-emerald-200 hover:border-emerald-400 hover:bg-emerald-500/30';
}

function ScorePicker({
  movieId,
  disabled,
  currentScore,
  onScored,
}: {
  movieId: number;
  disabled: boolean;
  currentScore: number | null;
  onScored: () => void;
}) {
  const [pendingScore, setPendingScore] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleScore = (score: number) => {
    if (disabled || isPending) return;
    setPendingScore(score);
    startTransition(async () => {
      try {
        await submitRatingAction(movieId, score);
        toast.success(
          currentScore === null
            ? `${score}/10 guardado`
            : `Actualizado a ${score}/10`
        );
        onScored();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : 'Error al guardar el puntaje'
        );
      } finally {
        setPendingScore(null);
      }
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
        <span>
          {currentScore === null
            ? '¿Qué puntaje le ponés?'
            : `Tu puntaje: ${currentScore}/10 · tocá para cambiar`}
        </span>
        <span className="hidden sm:inline">0 · malísima ··· 10 · obra maestra</span>
      </div>
      <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-11">
        {Array.from({ length: 11 }, (_, score) => {
          const isThisPending = isPending && pendingScore === score;
          return (
            <button
              key={score}
              type="button"
              disabled={disabled || isPending}
              onClick={() => handleScore(score)}
              className={cn(
                'flex h-9 cursor-pointer items-center justify-center rounded-xl border font-mono text-xs font-bold transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 sm:h-10 sm:text-sm xl:h-11',
                score === 10 && 'col-span-2 sm:col-span-1',
                scoreButtonClass(score, currentScore)
              )}
            >
              {isThisPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                score
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MovieRateCard({
  movie,
  isRatingOpen,
  showPicker,
  onScored,
}: {
  movie: RateMovieClient;
  isRatingOpen: boolean;
  showPicker: boolean;
  onScored: () => void;
}) {
  const src = posterSrc(movie.posterUrl);
  const year = (() => {
    try {
      return new Date(movie.releaseDate).getFullYear();
    } catch {
      return null;
    }
  })();
  const avg = formatAvg(movie.averageScore);
  const showOriginalTitle =
    movie.originalTitle &&
    movie.originalTitle.trim().toLowerCase() !==
      movie.title.trim().toLowerCase();

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-zinc-950/90 shadow-lg">
      {src && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-28 opacity-20 blur-2xl"
          style={{
            backgroundImage: `url(${src})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      )}

      <div className="relative space-y-4 p-4 sm:p-5 xl:p-6">
        <div className="flex gap-4 xl:gap-5">
          <div className="relative aspect-2/3 w-20 shrink-0 overflow-hidden rounded-xl border border-white/15 bg-zinc-900 shadow-md sm:w-24 lg:w-32 xl:w-40 2xl:w-48">
            {src ? (
              <Image
                src={src}
                alt={movie.title}
                fill
                className="object-cover"
                sizes="(min-width: 1536px) 192px, (min-width: 1280px) 160px, (min-width: 1024px) 128px, 96px"
                unoptimized
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <Film className="h-7 w-7 text-zinc-700" />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-2">
            {movie.userNominated && (
              <span className="inline-flex items-center gap-1 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-yellow-300">
                <Sparkles className="h-3 w-3" />
                La nominaste vos
              </span>
            )}

            <div>
              <h3 className="text-base font-black uppercase italic leading-tight tracking-tight sm:text-lg xl:text-xl">
                {movie.title}
              </h3>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-zinc-400">
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

            <div className="flex flex-wrap gap-1.5">
              {avg !== null ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-yellow-500/35 bg-yellow-500/10 px-2.5 py-0.5 text-[10px] font-bold text-yellow-300">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  {avg} / 10
                </span>
              ) : (
                <span className="rounded-full border border-white/10 bg-zinc-900/80 px-2.5 py-0.5 text-[10px] font-bold text-zinc-500">
                  Todavía sin promedio
                </span>
              )}
              <span className="rounded-full border border-white/10 bg-zinc-900/80 px-2.5 py-0.5 text-[10px] font-bold text-zinc-400">
                {movie.ratingCount}{' '}
                {movie.ratingCount === 1 ? 'puntaje' : 'puntajes'}
              </span>
              {movie.ratingCount >= IMDB_LTA_MIN_RATINGS_TO_QUALIFY && (
                <span className="rounded-full border border-emerald-500/35 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300">
                  Entra al ranking
                </span>
              )}
              {movie.userScore !== null && (
                <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 text-[10px] font-bold text-zinc-200">
                  Vos: {movie.userScore}/10
                </span>
              )}
              {movie.batchState === 'open' && (
                <span className="rounded-full border border-yellow-500/35 bg-yellow-500/10 px-2.5 py-0.5 text-[10px] font-bold text-yellow-300">
                  Lote actual
                </span>
              )}
              {movie.userSkipped && movie.userScore === null && (
                <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 text-[10px] font-bold text-zinc-300">
                  No vista
                </span>
              )}
            </div>
          </div>
        </div>

        {showPicker && isRatingOpen ? (
          <ScorePicker
            movieId={movie.id}
            disabled={!isRatingOpen}
            currentScore={movie.userScore}
            onScored={onScored}
          />
        ) : movie.userScore !== null ? (
          <p className="rounded-xl border border-emerald-500/20 bg-emerald-950/30 px-3 py-2 text-sm font-bold text-emerald-300">
            Tu puntaje: {movie.userScore}/10
          </p>
        ) : !isRatingOpen ? (
          <p className="text-xs text-zinc-500">Los puntajes ya están cerrados.</p>
        ) : null}
      </div>
    </div>
  );
}

export function RatingPageClient({
  movies,
  pagination,
  isRatingOpen,
  filter,
}: RatingPageClientProps) {
  const { setParams } = useImdbLtaRateParams();
  const router = useRouter();

  const showPicker = isRatingOpen;

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <div className="flex items-baseline gap-2.5">
          <span className="rounded-full bg-yellow-500/15 px-2.5 py-0.5 text-[11px] font-black uppercase tracking-widest text-yellow-400">
            Revisar
          </span>
          <span className="text-xs text-zinc-500">
            Cambiá puntajes · también del lote actual
          </span>
        </div>
        <h1 className="text-2xl font-black uppercase italic tracking-tight sm:text-3xl">
          Tus puntajes
        </h1>
        <p className="max-w-2xl text-sm text-zinc-400">
          Acá ves todo lo que ya puntuaste (incluido el lote de ahora) y podés
          cambiar el número. Si marcaste alguna como no vista, queda en{' '}
          <button
            type="button"
            onClick={() => setParams({ filter: 'not_seen', page: 1 })}
            className="cursor-pointer text-yellow-400 underline"
          >
            No vistas
          </button>{' '}
          para puntuarla cuando la veas. Películas nuevas del lote se votan en{' '}
          <Link href="/imdb-lta/lote" className="text-yellow-400 underline">
            Lote actual
          </Link>
          .
        </p>
      </header>

      {isRatingOpen && (
        <Link
          href="/imdb-lta/lote"
          className="group flex items-center justify-between gap-3 overflow-hidden rounded-2xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3.5 text-yellow-100 transition hover:bg-yellow-500/20"
        >
          <div>
            <p className="text-sm font-black uppercase tracking-wide">
              Volver al lote actual
            </p>
            <p className="text-xs text-yellow-200/70">
              Votá de a una · dura ~2 días
            </p>
          </div>
          <ArrowRight className="h-5 w-5 transition group-hover:translate-x-0.5" />
        </Link>
      )}

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setParams({ filter: f.key, page: 1 })}
            className={cn(
              'cursor-pointer rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-wider transition',
              filter === f.key
                ? 'bg-yellow-500 text-black'
                : 'border border-white/10 bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-black uppercase tracking-widest text-zinc-300">
            {filterHeading(filter)}{' '}
            <span className="font-mono text-zinc-500">({pagination.total})</span>
          </h2>
          {filter === 'needs_votes' && (
            <p className="mt-1 text-xs text-zinc-500">
              Menos de {IMDB_LTA_MIN_RATINGS_TO_QUALIFY} puntajes — priorizá
              estas para que entren al ranking.
            </p>
          )}
          {filter === 'enough_votes' && (
            <p className="mt-1 text-xs text-zinc-500">
              Ya tienen {IMDB_LTA_MIN_RATINGS_TO_QUALIFY}+ puntajes. Todavía
              podés sumar el tuyo si no las puntuaste.
            </p>
          )}
          {filter === 'not_seen' && (
            <p className="mt-1 text-xs text-zinc-500">
              Las marcaste como no vistas, también las del lote de ahora. Si
              las ves, el puntaje reemplaza el “no vista”.
            </p>
          )}
        </div>

        {movies.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/10 px-6 py-16 text-center">
            <Film className="mx-auto mb-4 h-10 w-10 text-zinc-600" />
            <p className="text-sm text-zinc-400">
              {filter === 'not_seen'
                ? 'No marcaste ninguna como no vista.'
                : 'No hay películas en este filtro.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2 xl:gap-4">
            {movies.map((movie) => (
              <MovieRateCard
                key={movie.id}
                movie={movie}
                isRatingOpen={isRatingOpen}
                showPicker={showPicker}
                onScored={() => router.refresh()}
              />
            ))}
          </div>
        )}

        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button
              variant="outline"
              disabled={pagination.page <= 1}
              onClick={() => setParams({ page: pagination.page - 1 })}
              className="border-white/10 bg-zinc-900"
            >
              Anterior
            </Button>
            <span className="font-mono text-xs text-zinc-500">
              {pagination.page} / {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setParams({ page: pagination.page + 1 })}
              className="border-white/10 bg-zinc-900"
            >
              Siguiente
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
