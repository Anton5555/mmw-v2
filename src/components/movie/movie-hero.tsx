'use client';

import Image from 'next/image';
import { motion } from 'motion/react';
import { Calendar, Film } from 'lucide-react';
import ReactCountryFlag from 'react-country-flag';
import { GlassButton } from '../ui/glass-button';
import type { MamMovieWithPicks } from '@/lib/validations/mam';

interface MovieHeroProps {
  movie: MamMovieWithPicks;
  rank?: number;
  director?: string;
  genre?: string;
}

export function MovieHero({
  movie,
  rank,
  director,
  genre,
}: MovieHeroProps) {
  const displayTitle =
    movie.originalLanguage === 'es' ? movie.originalTitle : movie.title;
  const releaseYear = new Date(movie.releaseDate).getFullYear();
  const displayRank = rank ?? movie.rank;
  const countryCodes = movie.countryCodes ?? [];

  return (
    <div className="relative h-[50vh] w-full overflow-hidden border-b border-white/5 md:h-[60vh]">
      <Image
        src={`https://image.tmdb.org/t/p/original${movie.posterUrl}`}
        alt={displayTitle}
        fill
        priority
        className="object-cover opacity-30 blur-2xl transition-transform duration-1000 scale-110"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/60 to-transparent" />

      {/* Content Overlay */}
      <div className="absolute inset-0 flex items-end pb-12">
        <div className="container mx-auto px-4 md:px-8">
          <div className="grid gap-8 md:grid-cols-[300px_1fr]">
            {/* Floating Poster */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative hidden md:block"
            >
              <div className="aspect-[2/3] overflow-hidden rounded-2xl border border-white/10 shadow-2xl shadow-black/50 ring-1 ring-white/10">
                <Image
                  src={`https://image.tmdb.org/t/p/w500${movie.posterUrl}`}
                  alt={displayTitle}
                  fill
                  className="object-cover"
                  sizes="300px"
                />
              </div>
              {displayRank && (
                <div className="absolute -right-4 -top-4 flex h-16 w-16 items-center justify-center rounded-full bg-linear-to-br from-yellow-400 to-yellow-600 font-black text-white shadow-xl ring-4 ring-[#0a0a0a]">
                  <span className="text-2xl">#{displayRank}</span>
                </div>
              )}
            </motion.div>

            {/* Header Info */}
            <div className="flex flex-col justify-end space-y-6">
              <div className="space-y-2">
                <h1 className="text-4xl font-black uppercase tracking-tighter md:text-6xl lg:text-7xl">
                  {displayTitle}
                </h1>
                <div className="flex flex-wrap items-center gap-4 text-sm font-medium tracking-wide text-white/60">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" /> {releaseYear}
                  </span>
                  <span className="h-1 w-1 rounded-full bg-white/20" />
                  <span className="flex items-center gap-1.5">
                    <Film className="h-4 w-4" /> {genre || 'Cine'}
                  </span>
                  {countryCodes.length > 0 && (
                    <>
                      <span className="h-1 w-1 rounded-full bg-white/20" />
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
                      <span className="h-1 w-1 rounded-full bg-white/20" />
                      <span className="text-white">
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
