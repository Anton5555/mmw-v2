import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { DailyRecommendationData } from '@/lib/api/daily-recommendation';

interface DailySpotlightProps {
  recommendation: DailyRecommendationData;
}

export function DailySpotlight({ recommendation }: DailySpotlightProps) {
  const getInitials = (name: string) => {
    const words = name.trim().split(/\s+/).filter((word) => word.length > 0);
    if (words.length === 0) return '??';
    const firstLetter = words[0]?.[0]?.toUpperCase() || '?';
    if (words.length === 1) {
      const secondLetter = words[0]?.[1]?.toUpperCase() || firstLetter;
      return (firstLetter + secondLetter).slice(0, 2);
    }
    const lastLetter =
      words[words.length - 1]?.[0]?.toUpperCase() || firstLetter;
    return (firstLetter + lastLetter).slice(0, 2);
  };

  if (recommendation.type === 'movie') {
    const { movie, curator } = recommendation;
    const rank = movie.mamRank;

    return (
      <div className="relative aspect-video overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 group">
        <Image
          src={movie.posterUrl || '/placeholder-poster.jpg'}
          alt={movie.title}
          fill
          className="object-cover opacity-60"
          sizes="(max-width: 768px) 100vw, 66vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />

        <div className="absolute bottom-0 p-6 md:p-8 space-y-3">
          {curator && (
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8 border border-yellow-500">
                <AvatarImage
                  src={curator.image || undefined}
                  alt={curator.name}
                />
                <AvatarFallback className="bg-yellow-500/20 text-yellow-500 text-[10px] font-bold">
                  {getInitials(curator.name)}
                </AvatarFallback>
              </Avatar>
              <p className="text-xs text-zinc-400">
                Sugerencia de <span className="text-white">{curator.name}</span>
                {rank && (
                  <span className="ml-2 text-yellow-500">#{rank} MAM</span>
                )}
              </p>
            </div>
          )}
          <h3 className="text-3xl md:text-4xl font-bold tracking-tight text-white leading-tight">
            {movie.title}
          </h3>
          <Link href={`/mam/movie/${movie.id}`}>
            <Button className="bg-white text-black font-semibold rounded-lg px-5 hover:bg-zinc-100">
              Ver detalles
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (recommendation.type === 'list') {
    const { list, curator } = recommendation;

    return (
      <div className="relative aspect-video overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 group">
        <Image
          src={list.imgUrl || '/placeholder-list.jpg'}
          alt={list.name}
          fill
          className="object-cover opacity-60"
          sizes="(max-width: 768px) 100vw, 66vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />

        <div className="absolute bottom-0 p-6 md:p-8 space-y-3">
          {curator && (
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8 border border-yellow-500">
                <AvatarImage
                  src={curator.image || undefined}
                  alt={curator.name}
                />
                <AvatarFallback className="bg-yellow-500/20 text-yellow-500 text-[10px] font-bold">
                  {getInitials(curator.name)}
                </AvatarFallback>
              </Avatar>
              <p className="text-xs text-zinc-400">
                Lista de <span className="text-white">{curator.name}</span>
              </p>
            </div>
          )}
          <h3 className="text-3xl md:text-4xl font-bold tracking-tight text-white leading-tight">
            {list.name}
          </h3>
          {list.description && (
            <p className="max-w-md text-sm text-zinc-400 line-clamp-2">
              {list.description}
            </p>
          )}
          <Link href={`/lists/${list.id}`}>
            <Button className="bg-white text-black font-semibold rounded-lg px-5 hover:bg-zinc-100">
              Ver lista
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (recommendation.type === 'participant') {
    const { participant, curator } = recommendation;
    const picksCount = participant._count?.picks;

    return (
      <div className="relative aspect-video overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 group">
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 via-zinc-900 to-zinc-950" />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />

        <div className="absolute bottom-0 p-6 md:p-8 space-y-3">
          {curator && (
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8 border border-yellow-500">
                <AvatarImage
                  src={curator.image || undefined}
                  alt={curator.name}
                />
                <AvatarFallback className="bg-yellow-500/20 text-yellow-500 text-[10px] font-bold">
                  {getInitials(curator.name)}
                </AvatarFallback>
              </Avatar>
              <p className="text-xs text-zinc-400">
                Lista de <span className="text-white">{curator.name}</span>
              </p>
            </div>
          )}
          <h3 className="text-3xl md:text-4xl font-bold tracking-tight text-white leading-tight">
            {participant.displayName}
          </h3>
          {picksCount !== undefined && (
            <p className="max-w-md text-sm text-zinc-400">
              {picksCount} películas en su lista personal
            </p>
          )}
          <Link href={`/mam/participant/${participant.slug}`}>
            <Button className="bg-white text-black font-semibold rounded-lg px-5 hover:bg-zinc-100">
              Ver lista
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return null;
}
