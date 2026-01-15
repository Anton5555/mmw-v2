'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import {
  ParticipantAvatar,
  getParticipantDisplayName,
} from './participant-avatar';
import type { MamMovieWithPicks } from '@/lib/validations/mam';
import { Calendar, Film, ChevronRight } from 'lucide-react';
import type { List as ListType } from '@/lib/validations/generated';
import { GlassButton } from './ui/glass-button';
import { GlassCard } from './ui/glass-card';

interface MamMovieDetailProps {
  movie: MamMovieWithPicks;
  rank?: number;
  director?: string;
  genre?: string;
  otherLists?: ListType[];
}

export function MamMovieDetail({
  movie,
  rank,
  director,
  genre,
  otherLists = [],
}: MamMovieDetailProps) {
  const [expandedReviews, setExpandedReviews] = useState<Set<number>>(
    new Set()
  );

  const displayTitle =
    movie.originalLanguage === 'es' ? movie.originalTitle : movie.title;
  const releaseYear = new Date(movie.releaseDate).getFullYear();
  const displayRank = rank ?? movie.rank;

  // Logic for grouping picks
  const specialMentions = movie.picks.filter((pick) => pick.isSpecialMention);
  const regularPicks = movie.picks.filter((pick) => !pick.isSpecialMention);
  const topChoicePicks = regularPicks.filter((pick) => pick.score === 5);
  const regularPicksWithReviews = regularPicks.filter(
    (pick) => pick.score === 1 && pick.review
  );
  const regularPicksWithoutReviews = regularPicks.filter(
    (pick) => pick.score === 1 && !pick.review
  );

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* 1. Cinematic Backdrop */}
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

      {/* 2. Stats Section */}
      <section className="container mx-auto px-4 py-12 md:px-8">
        <div className="grid gap-12 lg:grid-cols-[1fr_350px]">
          {/* Main Content: Reviews */}
          <div className="space-y-8">
            <h2 className="text-2xl font-black uppercase tracking-widest text-white/40">
              Votos y Reseñas
            </h2>

            <div className="space-y-4">
              {/* Top Choice Section with specialized styling */}
              {topChoicePicks.map((pick) => (
                <ReviewCard
                  key={pick.id}
                  pick={pick}
                  isTopChoice
                  expandedReviews={expandedReviews}
                  setExpandedReviews={setExpandedReviews}
                />
              ))}

              {/* Regular Picks with Reviews */}
              {regularPicksWithReviews.map((pick) => (
                <ReviewCard
                  key={pick.id}
                  pick={pick}
                  expandedReviews={expandedReviews}
                  setExpandedReviews={setExpandedReviews}
                />
              ))}

              {/* Grouped Voters (Simplified) */}
              {regularPicksWithoutReviews.length > 0 && (
                <GlassCard variant="review" className="p-6 text-center">
                  <p className="text-sm font-medium text-white/40">
                    <span className="text-white">
                      {regularPicksWithoutReviews.length} personas
                    </span>{' '}
                    más votaron esta película sin dejar reseña.
                  </p>
                </GlassCard>
              )}

              {/* Special Mentions Section */}
              {specialMentions.length > 0 && (
                <>
                  <h3 className="text-xl font-black uppercase tracking-widest text-white/40 mt-12 mb-4">
                    Menciones Especiales
                  </h3>
                  {specialMentions.map((pick) => (
                    <ReviewCard
                      key={pick.id}
                      pick={pick}
                      isSpecialMention
                      expandedReviews={expandedReviews}
                      setExpandedReviews={setExpandedReviews}
                    />
                  ))}
                </>
              )}

              {/* Empty State */}
              {movie.picks.length === 0 && (
                <GlassCard variant="review" className="p-8 text-center">
                  <p className="text-white/40">
                    No hay votos registrados para esta película.
                  </p>
                </GlassCard>
              )}
            </div>
          </div>

          {/* Sidebar: Metadata & Lists */}
          <aside className="space-y-8">
            <GlassCard variant="stats">
              <h3 className="mb-4 text-xs font-black uppercase tracking-[0.2em] text-white/40">
                Estadísticas
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {(movie.totalPoints ?? 0) > 0 && (
                  <div>
                    <p className="text-3xl font-black">
                      {movie.totalPoints}
                    </p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                      Puntos Totales
                    </p>
                  </div>
                )}
                <div className={cn((movie.totalPoints ?? 0) > 0 ? '' : 'col-span-2')}>
                  <p className="text-3xl font-black">{movie.totalPicks ?? 0}</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                    Votantes
                  </p>
                </div>
              </div>
            </GlassCard>

            {otherLists.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white/40">
                  También en Listas
                </h3>
                <div className="grid gap-2">
                  {otherLists.map((list) => (
                    <Link
                      key={list.id}
                      href={`/lists/${list.id}`}
                      className="group flex items-center justify-between rounded-lg border border-white/5 bg-white/5 px-4 py-3 transition-all hover:bg-white/10"
                    >
                      <span className="text-sm font-bold group-hover:text-primary">
                        {list.name}
                      </span>
                      <ChevronRight className="h-4 w-4 text-white/20 transition-transform group-hover:translate-x-1" />
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </section>
    </div>
  );
}

// Sub-component for Cleaner Review Cards
function ReviewCard({
  pick,
  isTopChoice,
  isSpecialMention,
  expandedReviews,
  setExpandedReviews,
}: {
  pick: MamMovieWithPicks['picks'][0];
  isTopChoice?: boolean;
  isSpecialMention?: boolean;
  expandedReviews: Set<number>;
  setExpandedReviews: React.Dispatch<React.SetStateAction<Set<number>>>;
}) {
  const isExpanded = expandedReviews.has(pick.id);
  const toggle = () => {
    const next = new Set(expandedReviews);
    if (isExpanded) {
      next.delete(pick.id);
    } else {
      next.add(pick.id);
    }
    setExpandedReviews(next);
  };

  return (
    <GlassCard
      variant="review"
      className={cn(
        isTopChoice && 'border-yellow-500/20 bg-yellow-500/[0.02]',
        isSpecialMention &&
          'border-purple-500/30 bg-gradient-to-br from-purple-500/[0.05] to-blue-500/[0.05]'
      )}
    >
      <div className="p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href={`/mam?participants=${pick.participant.slug}`}>
              <ParticipantAvatar participant={pick.participant} size="md" />
            </Link>
            <div>
              <Link
                href={`/mam?participants=${pick.participant.slug}`}
                className="hover:underline"
              >
                <p className="font-black text-sm uppercase tracking-wider">
                  {getParticipantDisplayName(pick.participant)}
                </p>
              </Link>
              {isTopChoice && (
                <span className="text-[10px] font-bold text-yellow-500 uppercase tracking-widest">
                  Favorito de la lista
                </span>
              )}
              {isSpecialMention && (
                <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">
                  ⭐ Mención Especial
                </span>
              )}
            </div>
          </div>
          <div
            className={cn(
              'rounded-lg px-3 py-1 text-sm font-black',
              isTopChoice
                ? 'bg-yellow-500 text-black'
                : isSpecialMention
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                  : 'bg-white/10 text-white'
            )}
          >
            {isSpecialMention ? (
              'ESPECIAL'
            ) : (
              <>
                {pick.score} PT{pick.score > 1 ? 'S' : ''}
              </>
            )}
          </div>
        </div>

        {pick.review && (
          <div className="mt-4 space-y-3 border-t border-white/5 pt-4">
            <p
              className={cn(
                'text-gray-300 leading-relaxed',
                !isExpanded && 'line-clamp-2'
              )}
            >
              {pick.review}
            </p>
            <button
              onClick={toggle}
              className="text-xs font-bold uppercase tracking-widest text-white/40 hover:text-white transition-colors"
            >
              {isExpanded ? 'Ver menos' : 'Leer reseña completa'}
            </button>
          </div>
        )}
      </div>
    </GlassCard>
  );
}
