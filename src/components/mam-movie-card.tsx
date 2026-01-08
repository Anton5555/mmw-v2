'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { getParticipantDisplayName } from './participant-avatar';
import { Users, Film, Star } from 'lucide-react';
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
  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-yellow-500 text-white';
      case 2:
        return 'bg-gray-400 text-white';
      case 3:
        return 'bg-amber-500 text-white';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getCardStyle = (rank?: number) => {
    if (rank && rank <= 3) {
      return 'ring-2 ring-primary/20';
    }
    return '';
  };

  return (
    <Card
      className={`group hover:shadow-lg transition-all duration-300 ${getCardStyle(
        rank
      )}`}
    >
      <CardContent className="p-0">
        <div className="relative">
          {/* Rank Badge */}
          {rank && (
            <div className="absolute top-2 left-2 z-10">
              <Badge
                className={`px-2 py-1 font-bold text-xs ${getRankStyle(rank)}`}
              >
                #{rank}
              </Badge>
            </div>
          )}

          {/* Points Badge */}
          {movie.totalPoints !== undefined && movie.totalPoints > 0 && (
            <div className="absolute top-2 right-2 z-10">
              <Badge
                variant="secondary"
                className="bg-black/80 text-white border-0 px-2 py-1 text-xs font-semibold"
              >
                {movie.totalPoints}
              </Badge>
            </div>
          )}

          {/* 5-Point Top Pick Badge */}
          {showReview && userPick?.score === 5 && (
            <div className="absolute top-2 right-2 z-10">
              <Badge className="bg-yellow-500 text-white border-0 px-2 py-1 text-xs font-semibold flex items-center gap-1">
                <Star className="h-3 w-3 fill-white" />
                <span>Top Pick</span>
              </Badge>
            </div>
          )}

          {/* Movie Poster */}
          <div className="aspect-[2/3] relative overflow-hidden rounded-t-lg">
            <Link href={`/mam/movie/${movie.id}`}>
              {movie.posterUrl ? (
                <Image
                  src={`https://image.tmdb.org/t/p/w500${movie.posterUrl}`}
                  alt={movie.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <Film className="h-12 w-12 text-muted-foreground" />
                </div>
              )}
            </Link>
          </div>
        </div>

        {/* Movie Info */}
        <div className="p-2">
          <Link href={`/mam/movie/${movie.id}`}>
            <h3 className="font-semibold text-sm leading-tight mb-1 line-clamp-2 hover:text-primary transition-colors">
              {movie.originalLanguage === 'es'
                ? movie.originalTitle
                : movie.title}
            </h3>
          </Link>

          <div className="flex items-center flex-row justify-between">
            <span className="text-xs text-muted-foreground">
              {new Date(movie.releaseDate).getFullYear()}
            </span>

            {/* Participants - Compact version (only show if not showing user review) */}
            {!showReview && (
              <div className="flex items-center justify-end">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-0.5 cursor-pointer">
                        <Users className="h-3 w-3" />
                        <span className="text-xs text-muted-foreground">
                          {movie.totalPicks}
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent
                      side="top"
                      className="max-w-xs p-3 bg-popover text-popover-foreground border"
                    >
                      <div className="space-y-1.5">
                        <div className="text-xs font-semibold mb-2">
                          Participantes ({movie.picks.length})
                        </div>
                        {movie.picks.map((pick) => (
                          <div
                            key={pick.id}
                            className="flex items-center justify-between text-xs"
                          >
                            <span className="font-medium">
                              {getParticipantDisplayName(pick.participant)}
                            </span>
                            <span className="text-muted-foreground ml-2">
                              {pick.score}
                            </span>
                          </div>
                        ))}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}
          </div>

          {/* User Pick Score (when showing review mode) */}
          {showReview && userPick && (
            <div className="flex items-center justify-between mb-2">
              <Badge
                variant="secondary"
                className={`text-xs font-semibold ${
                  userPick.score === 5
                    ? 'bg-yellow-600 text-white'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {userPick.score} {userPick.score === 1 ? 'pt' : 'pts'}
              </Badge>
            </div>
          )}

          {/* Review Dialog Trigger */}
          {showReview && userPick?.review && (
            <div className="mt-2">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDialogOpen(true);
                }}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors w-full text-left"
              >
                <span>Mostrar reseña</span>
              </button>
            </div>
          )}
        </div>
      </CardContent>

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
    </Card>
  );
}
