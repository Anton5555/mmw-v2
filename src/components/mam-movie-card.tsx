import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ParticipantAvatar } from './participant-avatar';
import { Users, Film } from 'lucide-react';
import type { MamMovieWithPicks } from '@/lib/validations/mam';

interface MamMovieCardProps {
  movie: MamMovieWithPicks;
  rank?: number;
}

export function MamMovieCard({ movie, rank }: MamMovieCardProps) {
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

          <div className="text-xs text-muted-foreground mb-2">
            {new Date(movie.releaseDate).getFullYear()}
          </div>

          {/* Participants - Compact version */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <div className="flex -space-x-0.5">
                {movie.picks.slice(0, 3).map((pick) => (
                  <Link
                    key={pick.id}
                    href={`/mam/participants/${pick.participant.slug}`}
                    title={`${pick.participant.displayName} - ${pick.score}/5`}
                  >
                    <ParticipantAvatar
                      participant={pick.participant}
                      size="sm"
                      className="h-5 w-5 text-xs border border-background"
                    />
                  </Link>
                ))}
              </div>
              {movie.picks.length > 3 && (
                <span className="text-xs text-muted-foreground ml-1">
                  +{movie.picks.length - 3}
                </span>
              )}
            </div>
            <div className="flex items-center gap-0.5">
              <Users className="h-3 w-3" />
              <span className="text-xs text-muted-foreground">
                {movie.totalPicks}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
