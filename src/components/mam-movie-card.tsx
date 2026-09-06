'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
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
import { useFilmStrip } from '@/lib/contexts/film-strip-context';

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
  const { triggerStrip } = useFilmStrip();

  const displayTitle =
    movie.originalLanguage === 'es' ? movie.originalTitle : movie.title;

  const handleMovieClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    triggerStrip(displayTitle, `/mam/movie/${movie.id}`);
  };

  const rankConfig = rank
    ? {
        1: {
          color: 'from-yellow-400 to-amber-600',
          shadow: 'shadow-yellow-500/20',
          label: 'Imprescindible',
        },
        2: {
          color: 'from-slate-300 to-slate-500',
          shadow: 'shadow-slate-400/20',
          label: 'Obra Maestra',
        },
        3: {
          color: 'from-orange-400 to-orange-700',
          shadow: 'shadow-orange-500/20',
          label: 'Destacada',
        },
      }[rank] || {
        color: 'from-zinc-700 to-zinc-900',
        shadow: 'shadow-black/20',
        label: null,
      }
    : {
        color: 'from-zinc-700 to-zinc-900',
        shadow: 'shadow-black/20',
        label: null,
      };

  return (
    <div className="relative group">
      <div
        className={cn(
          'relative overflow-hidden border-0 bg-transparent transition-all duration-300 ease-out',
          'group-hover:z-10'
        )}
      >
        {/* The Poster Layer */}
        <Link href={`/mam/movie/${movie.id}`} onClick={handleMovieClick} className="block">
          <div className="aspect-[2/3] relative rounded-lg overflow-hidden shadow-lg">
            {movie.posterUrl ? (
              <Image
                src={`https://image.tmdb.org/t/p/w500${movie.posterUrl}`}
                alt={displayTitle}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
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
                  'absolute top-0 left-0 w-12 h-12 flex items-center justify-center font-black text-lg',
                  'bg-gradient-to-br text-white rounded-br-xl shadow-lg z-10 pointer-events-none',
                  rankConfig.color
                )}
              >
                {rank}
              </div>
            )}

            {/* Hover overlay: scrim keeps review readable over busy posters */}
            <div className="absolute inset-0 flex flex-col justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
              <div className="bg-gradient-to-t from-black via-black/80 to-transparent px-4 pb-4 pt-16">
                <div className="space-y-2">
                  {(movie.totalPoints ?? 0) > 0 && (
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="bg-black/40 border-white/20 text-white"
                      >
                        <Star className="w-3 h-3 mr-1 fill-yellow-400 text-yellow-400" />
                        {movie.totalPoints} pts
                      </Badge>
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

        {/* Title Layer - Outside the poster for readability */}
        <div className="mt-3 px-1">
          <Link href={`/mam/movie/${movie.id}`} onClick={handleMovieClick}>
            <h3 className="font-bold text-sm tracking-tight truncate group-hover:text-primary transition-colors">
              {displayTitle}
            </h3>
          </Link>
          <div className="flex justify-between items-center mt-1">
            <span className="text-[11px] font-medium text-muted-foreground">
              {new Date(movie.releaseDate).getFullYear()}
            </span>
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
                <button className="flex -space-x-2 cursor-pointer outline-none group/avatars">
                  {movie.picks.slice(0, 3).map((pick) => (
                    <div
                      key={pick.id}
                      className="w-6 h-6 rounded-full border-2 border-background overflow-hidden shrink-0 group-hover/avatars:border-primary/50 transition-colors"
                    >
                      <ParticipantAvatar
                        participant={pick.participant}
                        size="sm"
                        className="w-full h-full"
                      />
                    </div>
                  ))}
                  {movie.picks.length > 3 && (
                    <div className="w-6 h-6 rounded-full border-2 border-background bg-zinc-800 flex items-center justify-center text-[8px] font-bold text-white shrink-0">
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
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
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
