'use client';

import { useState, useTransition } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import {
  AlertCircle,
  CheckCircle2,
  Film,
  Loader2,
  Lock,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { lookupMovieAction } from '@/lib/actions/imdb-lta/lookup-movie';
import { addNominationAction } from '@/lib/actions/imdb-lta/add-nomination';
import { removeNominationAction } from '@/lib/actions/imdb-lta/remove-nomination';
import { submitNominationsAction } from '@/lib/actions/imdb-lta/submit-nominations';
import {
  IMDB_LTA_MAX_NOMINATIONS,
  IMDB_LTA_MIN_NOMINATIONS,
} from '@/lib/validations/imdb-lta';
import type { MovieCardData } from '@/lib/api/movies';

export type NominationMovieClient = {
  id: number;
  title: string;
  originalTitle: string;
  originalLanguage: string;
  releaseDate: string;
  posterUrl: string;
  imdbId: string;
  tmdbId: number | null;
  nominationId: number;
  nominatedAt: string;
};

type NominationBuilderProps = {
  initialMovies: NominationMovieClient[];
  initialSubmittedAt: string | null;
  isNominationOpen: boolean;
  phase: string;
};

function posterSrc(posterUrl: string) {
  if (!posterUrl) return '';
  return posterUrl.startsWith('http')
    ? posterUrl
    : `https://image.tmdb.org/t/p/w500${posterUrl}`;
}

function releaseYear(isoDate: string | Date) {
  try {
    return new Date(isoDate).getFullYear();
  } catch {
    return null;
  }
}

function progressState(count: number) {
  if (count >= IMDB_LTA_MAX_NOMINATIONS) return 'max';
  if (count >= IMDB_LTA_MIN_NOMINATIONS) return 'valid';
  return 'incomplete';
}

export function NominationBuilder({
  initialMovies,
  initialSubmittedAt,
  isNominationOpen,
  phase,
}: NominationBuilderProps) {
  const [movies, setMovies] = useState(initialMovies);
  const [submittedAt, setSubmittedAt] = useState(initialSubmittedAt);
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [pickerMovies, setPickerMovies] = useState<MovieCardData[] | null>(
    null
  );
  const [isLookingUp, startLookup] = useTransition();
  const [isSaving, startSave] = useTransition();
  const [pendingMovieId, setPendingMovieId] = useState<number | null>(null);

  const count = movies.length;
  const state = progressState(count);
  const canSubmit = count >= IMDB_LTA_MIN_NOMINATIONS && isNominationOpen;

  const handleLookup = () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    if (!isNominationOpen) {
      toast.error('Las nominaciones están cerradas');
      return;
    }

    setMessage(null);
    startLookup(async () => {
      try {
        const result = await lookupMovieAction(trimmed);

        if (result.status === 'found') {
          await addMovie(result.movie);
          setQuery('');
          return;
        }

        if (result.status === 'multiple') {
          setPickerMovies(result.movies);
          return;
        }

        setMessage(result.message);
        toast.message(result.message);
      } catch (error) {
        const msg =
          error instanceof Error ? error.message : 'Error al buscar la película';
        setMessage(msg);
        toast.error(msg);
      }
    });
  };

  const addMovie = async (movie: MovieCardData) => {
    if (movies.some((m) => m.id === movie.id)) {
      toast.error('Esta película ya está en tu lista');
      return;
    }

    if (movies.length >= IMDB_LTA_MAX_NOMINATIONS) {
      toast.error(
        `Ya alcanzaste el máximo de ${IMDB_LTA_MAX_NOMINATIONS} películas`
      );
      return;
    }

    setPendingMovieId(movie.id);
    try {
      const result = await addNominationAction(movie.id);
      setMovies((prev) => [
        {
          ...result.movie,
          releaseDate: new Date(result.movie.releaseDate).toISOString(),
          nominatedAt: new Date(result.movie.nominatedAt).toISOString(),
        },
        ...prev,
      ]);
      setMessage(null);
      setPickerMovies(null);
      setQuery('');
      toast.success(`Agregada: ${movie.title}`);
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : 'Error al agregar la película';
      toast.error(msg);
    } finally {
      setPendingMovieId(null);
    }
  };

  const handleRemove = (movieId: number) => {
    if (!isNominationOpen) return;

    setPendingMovieId(movieId);
    startLookup(async () => {
      try {
        await removeNominationAction(movieId);
        setMovies((prev) => prev.filter((m) => m.id !== movieId));
        toast.success('Película eliminada de tu lista');
      } catch (error) {
        const msg =
          error instanceof Error
            ? error.message
            : 'Error al eliminar la película';
        toast.error(msg);
      } finally {
        setPendingMovieId(null);
      }
    });
  };

  const handleSubmit = () => {
    if (!canSubmit) return;

    startSave(async () => {
      try {
        const result = await submitNominationsAction();
        setSubmittedAt(
          result.submittedAt
            ? new Date(result.submittedAt).toISOString()
            : new Date().toISOString()
        );
        toast.success('Lista guardada');
      } catch (error) {
        const msg =
          error instanceof Error ? error.message : 'Error al guardar la lista';
        toast.error(msg);
      }
    });
  };

  return (
    <div className="space-y-5">
      <header className="space-y-3">
        <div className="flex items-center gap-2">
          <Film className="h-6 w-6 text-yellow-500" />
          <h1 className="text-3xl font-black uppercase italic tracking-tight">
            IMDB LTA
          </h1>
        </div>
        <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed">
          Nominá entre {IMDB_LTA_MIN_NOMINATIONS} y {IMDB_LTA_MAX_NOMINATIONS}{' '}
          películas que considerás las mejores de todos los tiempos. Tu lista
          sigue siendo editable mientras las nominaciones estén abiertas.
        </p>
      </header>

      {/* Phase / status banners — scroll away */}
      {!isNominationOpen ? (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-950/40 p-4">
          <Lock className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
          <div className="space-y-1">
            <p className="text-sm font-bold uppercase tracking-wider text-amber-300">
              Nominaciones cerradas
            </p>
            <p className="text-sm text-amber-200/80">
              Ya no podés modificar tu lista. Podés revisarla abajo.
              {phase !== 'NOMINATION_CLOSED' && (
                <span className="ml-1 opacity-70">(fase: {phase})</span>
              )}
            </p>
          </div>
        </div>
      ) : submittedAt ? (
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-950/40 p-4">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
          <div className="space-y-1">
            <p className="text-sm font-bold uppercase tracking-wider text-emerald-300">
              Lista guardada
            </p>
            <p className="text-sm text-emerald-200/80">
              Tu lista está guardada, pero podés seguir editándola hasta que
              cierren las nominaciones.
            </p>
          </div>
        </div>
      ) : null}

      {/* Sticky progress + search chrome */}
      <div
        className={cn(
          'sticky top-14 z-20 space-y-3 rounded-2xl border p-4 shadow-2xl backdrop-blur-xl',
          state === 'incomplete' && 'border-white/10 bg-zinc-950/80',
          state === 'valid' && 'border-emerald-500/30 bg-emerald-950/80',
          state === 'max' && 'border-yellow-500/30 bg-yellow-950/80'
        )}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex shrink-0 items-center gap-3">
            <p className="text-lg font-black italic tracking-tight sm:text-xl">
              {count}{' '}
              <span className="text-sm font-bold text-zinc-400">
                / {IMDB_LTA_MIN_NOMINATIONS}–{IMDB_LTA_MAX_NOMINATIONS}
              </span>
            </p>
            <Badge
              variant="outline"
              className={cn(
                'uppercase tracking-wider text-[10px] font-bold',
                state === 'incomplete' && 'border-zinc-600 text-zinc-400',
                state === 'valid' && 'border-emerald-500/50 text-emerald-400',
                state === 'max' && 'border-yellow-500/50 text-yellow-400'
              )}
            >
              {state === 'incomplete' && 'Incompleta'}
              {state === 'valid' && 'Válida'}
              {state === 'max' && 'Máximo alcanzado'}
            </Badge>
          </div>

          {isNominationOpen && (
            <div className="flex min-w-0 flex-1 gap-2">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleLookup();
                    }
                  }}
                  placeholder="Nombre o ID de IMDb (tt0068646)"
                  disabled={isLookingUp || count >= IMDB_LTA_MAX_NOMINATIONS}
                  aria-label="Buscar película"
                  className="bg-zinc-950 border-white/10 pl-10 font-mono text-sm"
                />
              </div>
              <Button
                onClick={handleLookup}
                disabled={
                  isLookingUp ||
                  !query.trim() ||
                  count >= IMDB_LTA_MAX_NOMINATIONS
                }
                className="bg-white text-black hover:bg-yellow-500 font-bold uppercase italic shrink-0"
              >
                {isLookingUp ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Buscar'
                )}
              </Button>
            </div>
          )}
        </div>

        {isNominationOpen && message && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-950/30 p-3 text-sm text-amber-200">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{message}</p>
          </div>
        )}
        {isNominationOpen && count >= IMDB_LTA_MAX_NOMINATIONS && (
          <p className="text-xs text-yellow-500/80">
            Alcanzaste el máximo. Eliminá una película para agregar otra.
          </p>
        )}
      </div>

      {/* Review grid */}
      <section className="space-y-4">
        <h2 className="flex items-center gap-2 text-xl font-bold uppercase tracking-tight">
          <Film className="h-5 w-5 text-yellow-500" />
          Tu lista
        </h2>

        {movies.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-zinc-950/40 px-6 py-16 text-center">
            <Film className="mx-auto mb-4 h-10 w-10 text-zinc-600" />
            <p className="text-sm text-zinc-400">
              Todavía no agregaste películas. Buscá por nombre o ID de IMDb para
              empezar.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 italic">
            {movies.map((movie) => {
              const year = releaseYear(movie.releaseDate);
              const src = posterSrc(movie.posterUrl);
              const isPending = pendingMovieId === movie.id;

              return (
                <div key={movie.id} className="group relative space-y-2">
                  <div className="relative aspect-[2/3] overflow-hidden rounded-xl border border-white/10 shadow-lg">
                    {src ? (
                      <Image
                        src={src}
                        alt={movie.title}
                        fill
                        className="object-cover grayscale transition-all duration-500 group-hover:grayscale-0"
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 16vw"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-zinc-900">
                        <Film className="h-8 w-8 text-zinc-600" />
                      </div>
                    )}
                    <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-white/10" />

                    {isNominationOpen && (
                      <button
                        type="button"
                        onClick={() => handleRemove(movie.id)}
                        disabled={isPending}
                        className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-white opacity-100 transition hover:bg-red-600 sm:opacity-0 sm:group-hover:opacity-100"
                        aria-label={`Eliminar ${movie.title}`}
                      >
                        {isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                  <div className="space-y-0.5">
                    <p className="truncate text-xs font-bold uppercase leading-tight text-zinc-100">
                      {movie.title}
                    </p>
                    <p className="truncate text-[10px] text-zinc-500">
                      {year ?? movie.originalTitle}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Sticky save footer */}
      {isNominationOpen && (
        <footer className="sticky bottom-6 flex gap-4 rounded-2xl border border-white/10 bg-zinc-950/80 p-4 shadow-2xl backdrop-blur-xl">
          <div className="hidden flex-1 self-center text-xs text-zinc-500 sm:block">
            {submittedAt
              ? 'Podés seguir editando y guardar de nuevo.'
              : count < IMDB_LTA_MIN_NOMINATIONS
                ? `Agregá al menos ${IMDB_LTA_MIN_NOMINATIONS - count} más para poder guardar.`
                : 'Tu lista es válida. Guardala cuando quieras.'}
          </div>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || isSaving}
            className="flex-1 bg-white font-black uppercase italic text-black shadow-xl hover:bg-yellow-500 hover:text-black sm:flex-none sm:min-w-[200px]"
          >
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Guardar lista
          </Button>
        </footer>
      )}

      {/* Multiple matches picker */}
      <Dialog
        open={pickerMovies !== null}
        onOpenChange={(open) => {
          if (!open) setPickerMovies(null);
        }}
      >
        <DialogContent className="max-h-[80vh] overflow-y-auto border-white/10 bg-zinc-950 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="uppercase italic tracking-tight">
              Varias coincidencias
            </DialogTitle>
            <DialogDescription>
              Elegí la película correcta de nuestra base de datos.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 pt-2">
            {pickerMovies?.map((movie) => {
              const year = releaseYear(movie.releaseDate);
              const src = posterSrc(movie.posterUrl);
              const alreadyAdded = movies.some((m) => m.id === movie.id);
              const isPending = pendingMovieId === movie.id;

              return (
                <button
                  key={movie.id}
                  type="button"
                  disabled={alreadyAdded || isPending}
                  onClick={() => addMovie(movie)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-xl border border-white/10 bg-zinc-900/60 p-3 text-left transition hover:border-yellow-500/40 hover:bg-zinc-900',
                    alreadyAdded && 'opacity-50'
                  )}
                >
                  <div className="relative h-16 w-11 shrink-0 overflow-hidden rounded-md bg-zinc-800">
                    {src ? (
                      <Image
                        src={src}
                        alt={movie.title}
                        fill
                        className="object-cover"
                        sizes="44px"
                        unoptimized
                      />
                    ) : (
                      <Film className="m-auto mt-4 h-5 w-5 text-zinc-600" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold uppercase">
                      {movie.title}
                    </p>
                    <p className="truncate text-xs text-zinc-500">
                      {movie.originalTitle}
                      {year ? ` · ${year}` : ''}
                    </p>
                    <p className="font-mono text-[10px] text-zinc-600">
                      {movie.imdbId}
                    </p>
                  </div>
                  {alreadyAdded ? (
                    <Badge variant="outline" className="text-[10px]">
                      En lista
                    </Badge>
                  ) : isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin text-yellow-500" />
                  ) : null}
                </button>
              );
            })}
          </div>
          <Button
            variant="ghost"
            onClick={() => setPickerMovies(null)}
            className="mt-2 text-zinc-400"
          >
            <X className="mr-2 h-4 w-4" />
            Cancelar
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
