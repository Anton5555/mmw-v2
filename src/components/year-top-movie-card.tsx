'use client';

import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { InfoPopover } from '@/components/ui/info-popover';
import { ParticipantAvatar, getParticipantDisplayName } from './participant-avatar';
import { Film, Star } from 'lucide-react';
import type { YearTopMovieWithPicks } from '@/lib/validations/year-top';
import { useFilmStrip } from '@/lib/contexts/film-strip-context';
import { YearTopPickType } from '../../generated/prisma/enums';

interface YearTopMovieCardProps {
  movie: YearTopMovieWithPicks;
  totalPoints?: number;
  pickType?: YearTopPickType | 'BEST_AND_WORST';
}

export function YearTopMovieCard({ movie, totalPoints, pickType }: YearTopMovieCardProps) {
  const { triggerStrip } = useFilmStrip();

  const displayTitle =
    movie.originalLanguage === 'es' ? movie.originalTitle : movie.title;

  const handleMovieClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    triggerStrip(displayTitle, `/year-tops/movie/${movie.id}`);
  };

  // For BEST_AND_WORST, group picks by pickType
  const isDuales = pickType === 'BEST_AND_WORST';
  const top10Picks = isDuales
    ? movie.picks.filter((pick) => pick.pickType === YearTopPickType.TOP_10)
    : [];
  const worst3Picks = isDuales
    ? movie.picks.filter((pick) => pick.pickType === YearTopPickType.WORST_3)
    : [];

  return (
    <div className="relative group">
      <div
        className={cn(
          'relative overflow-hidden border-0 bg-transparent transition-all duration-300 ease-out',
          'group-hover:z-10'
        )}
      >
        {/* The Poster Layer */}
        <Link
          href={`/year-tops/movie/${movie.id}`}
          onClick={handleMovieClick}
          className="block"
        >
          <div className="aspect-[2/3] relative rounded-lg overflow-hidden shadow-lg">
            {movie.posterUrl ? (
              <Image
                src={movie.posterUrl.startsWith('http') ? movie.posterUrl : `https://image.tmdb.org/t/p/w500${movie.posterUrl}`}
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

            {/* Hover overlay: scrim keeps text readable over busy posters */}
            <div className="absolute inset-0 flex flex-col justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
              <div className="bg-gradient-to-t from-black via-black/80 to-transparent px-4 pb-4 pt-16">
                {(totalPoints ?? 0) > 0 && (
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="bg-black/40 border-white/20 text-white"
                    >
                      <Star className="w-3 h-3 mr-1 fill-yellow-400 text-yellow-400" />
                      {totalPoints} pts
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Link>

        {/* Title Layer - Outside the poster for readability */}
        <div className="mt-3 px-1">
          <Link
            href={`/year-tops/movie/${movie.id}`}
            onClick={handleMovieClick}
          >
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
                  isDuales && (top10Picks.length > 0 || worst3Picks.length > 0) ? (
                    <div className="space-y-2">
                      {top10Picks.length > 0 && (
                        <div>
                          <p className="font-bold mb-1 text-xs text-yellow-400">
                            Como mejor ({top10Picks.length})
                          </p>
                          <p className="text-[11px] leading-snug text-zinc-400">
                            {top10Picks
                              .map((pick) =>
                                getParticipantDisplayName(pick.participant)
                              )
                              .join(' • ')}
                          </p>
                        </div>
                      )}
                      {worst3Picks.length > 0 && (
                        <div>
                          <p className="font-bold mb-1 text-xs text-red-400">
                            Como peor ({worst3Picks.length})
                          </p>
                          <p className="text-[11px] leading-snug text-zinc-400">
                            {worst3Picks
                              .map((pick) =>
                                getParticipantDisplayName(pick.participant)
                              )
                              .join(' • ')}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      <p className="font-bold mb-1 text-xs text-white">
                        Participantes ({movie.picks.length})
                      </p>
                      <p className="text-[11px] leading-snug text-zinc-400">
                        {movie.picks
                          .map((pick) =>
                            getParticipantDisplayName(pick.participant)
                          )
                          .join(' • ')}
                      </p>
                    </>
                  )
                }
              >
                <button className="flex -space-x-2 cursor-pointer outline-none group/avatars">
                  {movie.picks.slice(0, 3).map((pick) => (
                    <div
                      key={pick.id}
                      className="w-6 h-6 rounded-full border-2 border-background overflow-hidden shrink-0 group-hover/avatars:border-primary/50 transition-colors"
                    >
                      <ParticipantAvatar
                        participant={{
                          id: pick.participant.id,
                          displayName: pick.participant.displayName,
                          slug: pick.participant.slug,
                          userId: pick.participant.userId ?? null,
                          user: pick.participant.user,
                        }}
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
    </div>
  );
}
