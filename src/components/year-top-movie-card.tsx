'use client';

import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ParticipantAvatar } from './participant-avatar';
import { Film, Star } from 'lucide-react';
import type { YearTopMovieWithPicks } from '@/lib/validations/year-top';
import { useFilmStrip } from '@/lib/contexts/film-strip-context';

interface YearTopMovieCardProps {
  movie: YearTopMovieWithPicks;
  totalPoints?: number;
}

export function YearTopMovieCard({ movie, totalPoints }: YearTopMovieCardProps) {
  const { triggerStrip } = useFilmStrip();

  const displayTitle =
    movie.originalLanguage === 'es' ? movie.originalTitle : movie.title;

  const handleMovieClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    triggerStrip(displayTitle, `/year-tops/movie/${movie.id}`);
  };

  return (
    <div className="relative group">
      <div
        className={cn(
          'relative overflow-hidden border-0 bg-transparent transition-all duration-500 ease-out',
          'group-hover:z-30 group-hover:-translate-y-2 group-hover:scale-[1.05]'
        )}
      >
        {/* The Poster Layer */}
        <Link
          href={`/year-tops/movie/${movie.id}`}
          onClick={handleMovieClick}
          className="block"
        >
          <div className="aspect-[2/3] relative rounded-xl overflow-hidden shadow-2xl">
            {movie.posterUrl ? (
              <Image
                src={movie.posterUrl.startsWith('http') ? movie.posterUrl : `https://image.tmdb.org/t/p/w500${movie.posterUrl}`}
                alt={displayTitle}
                fill
                className="object-cover transition-all duration-700 group-hover:brightness-50 group-hover:scale-110"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
              />
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center">
                <Film className="h-12 w-12 text-muted-foreground" />
              </div>
            )}

            {/* Hover Overlay: Reveal metadata */}
            <div className="absolute inset-0 flex flex-col justify-end p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
              <div className="space-y-2 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                {(totalPoints ?? 0) > 0 && (
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="bg-white/10 backdrop-blur-md border-white/20 text-white"
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
            <div className="flex -space-x-2">
              {movie.picks.slice(0, 3).map((pick, i) => (
                <div
                  key={pick.id}
                  className="w-6 h-6 rounded-full border-2 border-background overflow-hidden shrink-0"
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
            </div>
          </div>
        </div>
      </div>

      {/* Background Glow Effect */}
      <div
        className={cn(
          'absolute inset-0 -z-10 bg-gradient-to-br opacity-0',
          'group-hover:opacity-15 blur-2xl transition-opacity duration-500 rounded-full',
          'from-zinc-700 to-zinc-900',
          'shadow-black/20'
        )}
      />
    </div>
  );
}
