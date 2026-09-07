'use client';

import Image from 'next/image';
import { useState } from 'react';
import { ChevronDown, Film, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type AdminNominationSnapshotClient = {
  uniqueMovies: number;
  totalNominations: number;
  listCount: number;
  submittedListCount: number;
  participants: {
    userId: string;
    name: string;
    nominationCount: number;
    submittedAt: string | null;
  }[];
  movies: {
    id: number;
    title: string;
    originalTitle: string;
    posterUrl: string;
    imdbId: string;
    nominationCount: number;
    nominators: string[];
  }[];
};

type ImdbLtaAdminNominationsOverviewProps = {
  snapshot: AdminNominationSnapshotClient;
};

function posterSrc(posterUrl: string) {
  if (!posterUrl) return '';
  return posterUrl.startsWith('http')
    ? posterUrl
    : `https://image.tmdb.org/t/p/w185${posterUrl}`;
}

export function ImdbLtaAdminNominationsOverview({
  snapshot,
}: ImdbLtaAdminNominationsOverviewProps) {
  const [open, setOpen] = useState(false);

  return (
    <section className="mb-6 rounded-2xl border border-yellow-500/30 bg-yellow-950/20">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-yellow-400" />
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-yellow-400">
              Admin · Nominaciones del grupo
            </p>
            <p className="text-[11px] text-yellow-200/70">
              {snapshot.uniqueMovies} películas · {snapshot.totalNominations}{' '}
              nominaciones · {snapshot.submittedListCount}/
              {snapshot.listCount} listas guardadas
            </p>
          </div>
        </div>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-yellow-400 transition-transform',
            open && 'rotate-180'
          )}
        />
      </button>

      {open && (
        <div className="space-y-6 border-t border-yellow-500/20 px-4 py-4">
          <p className="text-xs text-yellow-200/70">
            Incluye listas en progreso (sin Guardar). Cada add/remove ya está
            en la base.
          </p>

          <div className="space-y-2">
            <h3 className="text-[11px] font-black uppercase tracking-widest text-yellow-400/90">
              Participantes
            </h3>
            {snapshot.participants.length === 0 ? (
              <p className="text-xs text-zinc-500">Nadie nominó todavía.</p>
            ) : (
              <ul className="divide-y divide-white/5 rounded-xl border border-white/10 bg-zinc-950/50">
                {snapshot.participants.map((p) => (
                  <li
                    key={p.userId}
                    className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                  >
                    <span className="truncate font-medium text-zinc-200">
                      {p.name}
                    </span>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-xs text-zinc-400">
                        {p.nominationCount}{' '}
                        {p.nominationCount === 1 ? 'película' : 'películas'}
                      </span>
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[10px]',
                          p.submittedAt
                            ? 'border-emerald-500/40 text-emerald-400'
                            : 'border-white/10 text-zinc-500'
                        )}
                      >
                        {p.submittedAt ? 'Guardada' : 'Borrador'}
                      </Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-2">
            <h3 className="text-[11px] font-black uppercase tracking-widest text-yellow-400/90">
              Películas (más nominadas primero)
            </h3>
            {snapshot.movies.length === 0 ? (
              <p className="text-xs text-zinc-500">Sin películas aún.</p>
            ) : (
              <ul className="max-h-[28rem] space-y-2 overflow-y-auto pr-1">
                {snapshot.movies.map((movie) => {
                  const src = posterSrc(movie.posterUrl);
                  return (
                    <li
                      key={movie.id}
                      className="flex gap-3 rounded-xl border border-white/10 bg-zinc-950/50 p-2"
                    >
                      <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded-md border border-white/10 bg-zinc-900">
                        {src ? (
                          <Image
                            src={src}
                            alt={movie.title}
                            fill
                            className="object-cover"
                            sizes="40px"
                            unoptimized
                          />
                        ) : (
                          <Film className="m-auto mt-4 h-4 w-4 text-zinc-600" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-zinc-100">
                              {movie.title}
                            </p>
                            <p className="truncate text-[11px] text-zinc-500">
                              {movie.originalTitle} · {movie.imdbId}
                            </p>
                          </div>
                          <Badge className="shrink-0 bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/20">
                            {movie.nominationCount}
                          </Badge>
                        </div>
                        <p className="mt-1 line-clamp-2 text-[11px] text-zinc-400">
                          {movie.nominators.join(', ')}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
