'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { InfoPopover } from '@/components/ui/info-popover';
import { ParticipantAvatar, getParticipantDisplayName } from './participant-avatar';
import { Film, Star } from 'lucide-react';
import type { MamMovieWithPicks } from '@/lib/validations/mam';

interface MamMovieCardProps {
  movie: MamMovieWithPicks;
  rank?: number;
  userPick?: {
    review: string | null;
    score: number;
  };
  showReview?: boolean;
}

export function MamMovieCard({
  movie,
  rank,
  userPick,
  showReview = false,
}: MamMovieCardProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const displayTitle =
    movie.originalLanguage === 'es' ? movie.originalTitle : movie.title;

  return (
    <div className="group relative flex h-full flex-col">
      <div className="relative flex h-full flex-col overflow-hidden rounded-sm bg-card ring-1 ring-border transition-shadow duration-200 group-hover:z-10 group-hover:ring-primary/70">
        {/* The Poster Layer */}
        <Link href={`/mam/movie/${movie.id}`} className="block">
          <div className="aspect-[2/3] relative overflow-hidden bg-background">
            {movie.posterUrl ? (
              <Image
                src={`https://image.tmdb.org/t/p/w500${movie.posterUrl}`}
                alt={displayTitle}
                fill
                className="object-cover transition-transform duration-300 ease-out [@media(hover:hover)_and_(pointer:fine)]:group-hover:scale-105"
                sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
              />
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center">
                <Film className="h-12 w-12 text-muted-foreground" />
              </div>
            )}

            {/* Rank Badge - Minimalist style */}
            {rank && (
              <div
                className={cn(
                  'pointer-events-none absolute left-0 top-0 z-10 flex h-10 min-w-10 items-center justify-center px-2 font-display text-xl font-bold tabular-nums',
                  rank <= 3
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background/90 text-foreground'
                )}
              >
                {rank}
              </div>
            )}

            {/* Hover overlay: scrim keeps review readable over busy posters */}
            <div className="absolute inset-0 flex flex-col justify-end opacity-0 group-hover:opacity-100 [@media(hover:none)]:hidden transition-opacity duration-200 ease-out pointer-events-none">
              <div className="bg-gradient-to-t from-background via-background/85 to-transparent px-4 pb-4 pt-16">
                <div className="space-y-2 [@media(hover:hover)_and_(pointer:fine)]:translate-y-2 transition-transform duration-200 ease-out group-hover:translate-y-0">
                  {(movie.totalPoints ?? 0) > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 bg-primary px-1.5 py-0.5 text-xs font-bold text-primary-foreground">
                        <Star className="size-3 fill-current" />
                        {movie.totalPoints} pts
                      </span>
                    </div>
                  )}
                  <p className="text-xs text-white/90 line-clamp-3 leading-snug">
                    &quot;{movie.picks[0]?.review || 'Sin reseña destacada'}&quot;
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Link>

        {/* Caption: year and voters sit on top (visually), title under them; any spare height falls below */}
        <div className="flex flex-1 flex-col-reverse justify-end gap-1.5 border-t border-border px-3 pb-3 pt-2.5">
          <Link href={`/mam/movie/${movie.id}`}>
            <h3 className="line-clamp-2 text-balance text-sm font-semibold leading-snug text-foreground transition-colors group-hover:text-primary">
              {displayTitle}
            </h3>
          </Link>
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <span className="text-xs tabular-nums text-muted-foreground">
              {new Date(movie.releaseDate).getFullYear()}
            </span>
              {(movie.totalPoints ?? 0) > 0 && (
                <span className="hidden items-center gap-0.5 bg-primary px-1 text-[11px] font-bold tabular-nums text-primary-foreground [@media(hover:none)]:inline-flex">
                  <Star className="size-2.5 fill-current" aria-hidden />
                  {movie.totalPoints} pts
                </span>
              )}
            </div>
            {movie.picks.length > 0 && (
              <InfoPopover
                content={
                  <>
                    <p className="font-bold mb-1 text-xs text-white">
                      Participantes ({movie.picks.length})
                    </p>
                    <p className="text-[11px] leading-snug text-zinc-400">
                      {movie.picks
                        .map((pick) => getParticipantDisplayName(pick.participant))
                        .join(' • ')}
                    </p>
                  </>
                }
              >
                <button
                  type="button"
                  aria-label={`Ver participantes (${movie.picks.length})`}
                  className="-my-2 -mr-1 flex -space-x-2 cursor-pointer py-2 pr-1 outline-none group/avatars"
                >
                  {movie.picks.slice(0, 3).map((pick) => (
                    <div
                      key={pick.id}
                      className="w-6 h-6 rounded-full border-2 border-card overflow-hidden shrink-0 group-hover/avatars:border-primary/50 transition-colors"
                    >
                      <ParticipantAvatar
                        participant={pick.participant}
                        size="sm"
                        className="w-full h-full"
                      />
                    </div>
                  ))}
                  {movie.picks.length > 3 && (
                    <div className="w-6 h-6 rounded-full border-2 border-card bg-secondary flex items-center justify-center text-[10px] font-bold text-foreground shrink-0">
                      +{movie.picks.length - 3}
                    </div>
                  )}
                </button>
              </InfoPopover>
            )}
          </div>
        </div>
      </div>

      {/* Review Dialog */}
      {showReview && userPick?.review && (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[85dvh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{displayTitle}</DialogTitle>
              <DialogDescription>
                Tu puntuación: {userPick.score}{' '}
                {userPick.score === 1 ? 'punto' : 'puntos'}
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {userPick.review}
              </p>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
