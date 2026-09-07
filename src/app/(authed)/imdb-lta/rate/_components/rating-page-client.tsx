'use client';

import { useTransition } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import { Film, Loader2, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
};

type RatingPageClientProps = {
  movies: RateMovieClient[];
  highlights: RateMovieClient[];
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
  { key: 'unrated', label: 'Sin tu puntaje' },
  { key: 'no_scores', label: 'Sin puntajes' },
  { key: 'low', label: 'Pocas (0–2)' },
  { key: 'close', label: 'Cerca (3–4)' },
  { key: 'qualified', label: 'Calificadas (5+)' },
  { key: 'mine_done', label: 'Ya puntuadas' },
];

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

function ScorePicker({
  movieId,
  disabled,
  onScored,
}: {
  movieId: number;
  disabled: boolean;
  onScored: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  const handleScore = (score: number) => {
    if (disabled || isPending) return;
    startTransition(async () => {
      try {
        await submitRatingAction(movieId, score);
        toast.success(`Puntaje ${score}/10 guardado`);
        onScored();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : 'Error al guardar el puntaje'
        );
      }
    });
  };

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
        Puntaje 0–10
      </p>
      <div className="flex flex-wrap gap-1">
        {Array.from({ length: 11 }, (_, score) => (
          <Button
            key={score}
            type="button"
            size="sm"
            variant="outline"
            disabled={disabled || isPending}
            onClick={() => handleScore(score)}
            className={cn(
              'h-8 w-8 p-0 font-mono text-xs',
              score >= 8 && 'border-yellow-500/40 hover:bg-yellow-500/20',
              score <= 3 && 'border-red-500/30 hover:bg-red-500/10'
            )}
          >
            {isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              score
            )}
          </Button>
        ))}
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

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-zinc-950/60 p-3 sm:flex-row sm:gap-4 sm:p-4">
      <div className="relative mx-auto aspect-2/3 w-28 shrink-0 overflow-hidden rounded-xl border border-white/10 sm:mx-0 sm:w-24">
        {src ? (
          <Image
            src={src}
            alt={movie.title}
            fill
            className="object-cover"
            sizes="112px"
            unoptimized
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-zinc-900">
            <Film className="h-8 w-8 text-zinc-600" />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1 space-y-3">
        <div>
          <h3 className="truncate text-sm font-black uppercase italic tracking-tight">
            {movie.title}
          </h3>
          <p className="truncate text-xs text-zinc-500">
            {movie.originalTitle}
            {year ? ` · ${year}` : ''}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {avg !== null ? (
              <Badge
                variant="outline"
                className="border-yellow-500/40 text-[10px] text-yellow-400"
              >
                <Star className="mr-1 h-3 w-3 fill-yellow-400 text-yellow-400" />
                {avg} / 10
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] text-zinc-500">
                Sin promedio aún
              </Badge>
            )}
            <Badge variant="outline" className="text-[10px] text-zinc-400">
              {movie.ratingCount}{' '}
              {movie.ratingCount === 1 ? 'puntaje' : 'puntajes'}
            </Badge>
            {movie.ratingCount >= IMDB_LTA_MIN_RATINGS_TO_QUALIFY && (
              <Badge
                variant="outline"
                className="border-emerald-500/40 text-[10px] text-emerald-400"
              >
                Calificada
              </Badge>
            )}
            {movie.userNominated && (
              <Badge variant="outline" className="text-[10px] text-zinc-500">
                La nominaste
              </Badge>
            )}
          </div>
        </div>

        {movie.userScore !== null ? (
          <p className="text-sm font-bold text-emerald-400">
            Tu puntaje: {movie.userScore}/10
          </p>
        ) : showPicker && isRatingOpen ? (
          <ScorePicker
            movieId={movie.id}
            disabled={!isRatingOpen}
            onScored={onScored}
          />
        ) : !isRatingOpen ? (
          <p className="text-xs text-zinc-500">Puntuaciones cerradas</p>
        ) : null}
      </div>
    </div>
  );
}

export function RatingPageClient({
  movies,
  highlights,
  pagination,
  isRatingOpen,
  filter,
}: RatingPageClientProps) {
  const { setParams } = useImdbLtaRateParams();
  const router = useRouter();

  const showPicker = filter !== 'mine_done';

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="flex items-center gap-2 text-3xl font-black uppercase italic tracking-tight">
          <Star className="h-7 w-7 text-yellow-500" />
          Puntuar
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Puntuá del 0 al 10. Priorizamos películas con menos puntajes para
          completar el ranking. El orden de descubrimiento no afecta el puntaje
          final.
        </p>
      </header>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setParams({ filter: f.key, page: 1 })}
            className={cn(
              'rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-wider transition',
              filter === f.key
                ? 'bg-yellow-500 text-black'
                : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Destacadas */}
      {filter === 'unrated' && highlights.length > 0 && isRatingOpen && (
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-bold uppercase tracking-tight">
              Destacadas sin tu puntaje
            </h2>
            <p className="text-xs text-zinc-500">
              Bien puntuadas por el grupo — solo descubrimiento, no cambia el
              ranking.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {highlights.map((movie) => (
              <MovieRateCard
                key={`hl-${movie.id}`}
                movie={movie}
                isRatingOpen={isRatingOpen}
                showPicker
                onScored={() => router.refresh()}
              />
            ))}
          </div>
        </section>
      )}

      {/* Main list */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold uppercase tracking-tight">
            {filter === 'mine_done' ? 'Tus puntajes' : 'Para puntuar'}{' '}
            <span className="text-zinc-500">({pagination.total})</span>
          </h2>
        </div>

        {movies.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 px-6 py-16 text-center">
            <Film className="mx-auto mb-4 h-10 w-10 text-zinc-600" />
            <p className="text-sm text-zinc-400">
              No hay películas en este filtro.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
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
          <div className="flex items-center justify-center gap-3 pt-4">
            <Button
              variant="outline"
              disabled={pagination.page <= 1}
              onClick={() => setParams({ page: pagination.page - 1 })}
            >
              Anterior
            </Button>
            <span className="text-xs text-zinc-500">
              {pagination.page} / {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setParams({ page: pagination.page + 1 })}
            >
              Siguiente
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
