'use client';

import Image from 'next/image';
import { Calendar, Film } from 'lucide-react';
import ReactCountryFlag from 'react-country-flag';
import { cn } from '@/lib/utils';
import { GlassButton } from '../ui/glass-button';
import type { MamMovieWithPicks } from '@/lib/validations/mam';

interface MovieHeroProps {
  movie: MamMovieWithPicks;
  rank?: number;
  director?: string;
  genre?: string;
  /** Compact layout for the details sheet (no viewport-height hero). */
  compact?: boolean;
}

export function MovieHero({
  movie,
  rank,
  director,
  genre,
  compact = false,
}: MovieHeroProps) {
  const displayTitle =
    movie.originalLanguage === 'es' ? movie.originalTitle : movie.title;
  const releaseYear = new Date(movie.releaseDate).getFullYear();
  const displayRank = rank ?? movie.rank;
  const countryCodes = movie.countryCodes ?? [];

  return (
    <div
      className={cn(
        'relative w-full overflow-hidden border-b border-border',
        // Full page: tuck under the breadcrumb trail
        !compact && '-mt-11 flex min-h-[50svh] items-end md:min-h-[60svh]'
      )}
    >
      <Image
        src={`https://image.tmdb.org/t/p/original${movie.posterUrl}`}
        alt={displayTitle}
        fill
        priority
        className="scale-110 object-cover opacity-20 blur-2xl"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
      {!compact && (
        <div className="absolute inset-x-0 top-0 h-28 bg-linear-to-b from-background/90 to-transparent" />
      )}

      {/* Content Overlay */}
      <div
        className={cn(
          compact ? 'relative pb-6 pt-6' : 'relative w-full pb-12 pt-20'
        )}
      >
        <div
          className={cn(
            compact ? 'px-4' : 'container mx-auto px-4'
          )}
        >
          <div
            className={cn(
              'grid gap-8',
              compact ? 'grid-cols-[88px_1fr] gap-4 sm:grid-cols-[110px_1fr]' : 'md:grid-cols-[300px_1fr]'
            )}
          >
            {/* Floating Poster */}
            <div
              className={cn('relative', compact ? 'self-start' : 'hidden md:block')}
            >
              <div className="aspect-[2/3] overflow-hidden rounded-sm ring-1 ring-border">
                <Image
                  src={`https://image.tmdb.org/t/p/w500${movie.posterUrl}`}
                  alt={displayTitle}
                  fill
                  className="object-cover"
                  sizes={compact ? '(max-width: 640px) 88px, 110px' : '300px'}
                />
              </div>
              {displayRank && (
                <div
                  className={cn(
                    'absolute left-0 top-0 flex items-center justify-center bg-primary px-2 font-display font-bold tabular-nums text-primary-foreground',
                    compact ? 'h-8 min-w-8' : 'h-12 min-w-12'
                  )}
                >
                  <span className={compact ? 'text-base' : 'text-2xl'}>
                    #{displayRank}
                  </span>
                </div>
              )}
            </div>

            {/* Header Info */}
            <div className={cn('flex flex-col justify-end', compact ? 'space-y-4' : 'space-y-6')}>
              <div className="space-y-2">
                <h1
                  className={cn(
                    'text-balance font-bold leading-[0.95]',
                    compact
                      ? 'text-2xl'
                      : 'text-3xl sm:text-4xl md:text-5xl xl:text-6xl'
                  )}
                >
                  {displayTitle}
                </h1>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground sm:gap-x-4">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" /> {releaseYear}
                  </span>
                  <span aria-hidden className="hidden h-3 w-px bg-border sm:block" />
                  <span className="flex items-center gap-1.5">
                    <Film className="h-4 w-4" /> {genre || 'Cine'}
                  </span>
                  {countryCodes.length > 0 && (
                    <>
                      <span aria-hidden className="hidden h-3 w-px bg-border sm:block" />
                      <span className="flex items-center gap-1">
                        {countryCodes.map((code) => (
                          <ReactCountryFlag
                            key={code}
                            countryCode={code}
                            svg
                            className="rounded-[2px] shadow-sm"
                            style={{
                              width: '1.1rem',
                              height: '0.8rem',
                            }}
                            aria-label={code}
                          />
                        ))}
                      </span>
                    </>
                  )}
                  {director && (
                    <>
                      <span aria-hidden className="hidden h-3 w-px bg-border sm:block" />
                      <span className="text-foreground">
                        Dirigido por {director}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* External Links as Glass Buttons */}
              <div className="flex flex-wrap gap-3">
                {movie.letterboxdUrl && (
                  <GlassButton
                    href={movie.letterboxdUrl}
                    variant="compact"
                    showExternalIcon
                  >
                    Letterboxd
                  </GlassButton>
                )}
                {movie.imdbId && (
                  <GlassButton
                    href={`https://imdb.com/title/${movie.imdbId}`}
                    variant="compact"
                    showExternalIcon
                  >
                    IMDB
                  </GlassButton>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
