'use client';

import Image from 'next/image';
import Link from 'next/link';
import { InfoPopover } from '@/components/ui/info-popover';
import { ParticipantAvatar, getParticipantDisplayName } from './participant-avatar';
import { Film, Star } from 'lucide-react';
import type { YearTopMovieWithPicks } from '@/lib/validations/year-top';
import { YearTopPickType } from '@generated/prisma/enums';

interface YearTopMovieCardProps {
  movie: YearTopMovieWithPicks;
  totalPoints?: number;
  pickType?: YearTopPickType | 'BEST_AND_WORST';
}

export function YearTopMovieCard({ movie, totalPoints, pickType }: YearTopMovieCardProps) {
  const displayTitle =
    movie.originalLanguage === 'es' ? movie.originalTitle : movie.title;

  // For BEST_AND_WORST, group picks by pickType
  const isDuales = pickType === 'BEST_AND_WORST';
  const top10Picks = isDuales
    ? movie.picks.filter((pick) => pick.pickType === YearTopPickType.TOP_10)
    : [];
  const worst3Picks = isDuales
    ? movie.picks.filter((pick) => pick.pickType === YearTopPickType.WORST_3)
    : [];

  return (
    <div className="group relative flex h-full flex-col">
      <div className="relative flex h-full flex-col overflow-hidden rounded-sm bg-card ring-1 ring-border transition-shadow duration-200 group-hover:z-10 group-hover:ring-primary/70">
        {/* The Poster Layer */}
        <Link
          href={`/year-tops/movie/${movie.id}`}
          className="block"
        >
          <div className="aspect-[2/3] relative overflow-hidden bg-background">
            {movie.posterUrl ? (
              <Image
                src={movie.posterUrl.startsWith('http') ? movie.posterUrl : `https://image.tmdb.org/t/p/w500${movie.posterUrl}`}
                alt={displayTitle}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
              />
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center">
                <Film className="h-12 w-12 text-muted-foreground" />
              </div>
            )}

            {/* Hover overlay: scrim keeps text readable over busy posters */}
            <div className="absolute inset-0 flex flex-col justify-end opacity-0 group-hover:opacity-100 [@media(hover:none)]:hidden transition-opacity duration-300 pointer-events-none">
              <div className="bg-gradient-to-t from-background via-background/85 to-transparent px-4 pb-4 pt-16">
                {(totalPoints ?? 0) > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 bg-primary px-1.5 py-0.5 text-xs font-bold text-primary-foreground">
                      <Star className="size-3 fill-current" />
                      {totalPoints} pts
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Link>

        {/* Caption: year and voters sit on top (visually), title under them; any spare height falls below */}
        <div className="flex flex-1 flex-col-reverse justify-end gap-1.5 border-t border-border px-3 pb-3 pt-2.5">
          <Link
            href={`/year-tops/movie/${movie.id}`}
            >
            <h3 className="line-clamp-2 text-balance text-sm font-semibold leading-snug text-foreground transition-colors group-hover:text-primary">
              {displayTitle}
            </h3>
          </Link>
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <span className="text-xs tabular-nums text-muted-foreground">
              {new Date(movie.releaseDate).getFullYear()}
            </span>
              {(totalPoints ?? 0) > 0 && (
                <span className="hidden items-center gap-0.5 bg-primary px-1 text-[11px] font-bold tabular-nums text-primary-foreground [@media(hover:none)]:inline-flex">
                  <Star className="size-2.5 fill-current" aria-hidden />
                  {totalPoints} pts
                </span>
              )}
            </div>
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
    </div>
  );
}
