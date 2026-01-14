'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  ParticipantAvatar,
  getParticipantDisplayName,
} from './participant-avatar';
import type { MamMovieWithPicks } from '@/lib/validations/mam';
import {
  Crown,
  Medal,
  Award,
  ChevronDown,
  ChevronUp,
  Star,
  Calendar,
  Film,
  Users,
  ExternalLink,
} from 'lucide-react';

interface MamMovieDetailProps {
  movie: MamMovieWithPicks;
  rank?: number;
  director?: string;
  genre?: string;
}

export function MamMovieDetail({
  movie,
  rank,
  director,
  genre,
}: MamMovieDetailProps) {
  // Use rank from prop or fallback to movie.rank
  const displayRank = rank ?? movie.rank;

  const [expandedReviews, setExpandedReviews] = useState<Set<number>>(
    new Set()
  );
  const [showGroupedVoters, setShowGroupedVoters] = useState(false);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-6 w-6 text-yellow-400" />;
      case 2:
        return <Medal className="h-6 w-6 text-gray-300" />;
      case 3:
        return <Award className="h-6 w-6 text-amber-500" />;
      default:
        return null;
    }
  };

  const getRankBadgeStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-linear-to-br from-yellow-400 to-yellow-600 text-white shadow-lg';
      case 2:
        return 'bg-linear-to-br from-gray-300 to-gray-500 text-white shadow-lg';
      case 3:
        return 'bg-linear-to-br from-amber-400 to-amber-600 text-white shadow-lg';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const toggleReview = (pickId: number) => {
    const newExpanded = new Set(expandedReviews);
    if (newExpanded.has(pickId)) {
      newExpanded.delete(pickId);
    } else {
      newExpanded.add(pickId);
    }
    setExpandedReviews(newExpanded);
  };

  const topChoicePicks = movie.picks.filter((pick) => pick.score === 5);
  const regularPicks = movie.picks.filter((pick) => pick.score === 1);
  const regularPicksWithReviews = regularPicks.filter((pick) => pick.review);
  const regularPicksWithoutReviews = regularPicks.filter(
    (pick) => !pick.review
  );

  const displayTitle =
    movie.originalLanguage === 'es' ? movie.originalTitle : movie.title;
  const releaseYear = new Date(movie.releaseDate).getFullYear();

  return (
    <div className="container mx-auto px-4 pb-8 pt-4">
      {/* Hero Section */}
      <div className="grid md:grid-cols-[300px_1fr] gap-8 mb-8">
        {/* Poster */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative"
        >
          <div className="aspect-2/3 relative overflow-hidden rounded-lg shadow-xl ring-2 ring-border">
            {movie.posterUrl ? (
              <Image
                src={`https://image.tmdb.org/t/p/w500${movie.posterUrl}`}
                alt={displayTitle}
                fill
                className="object-cover"
                sizes="300px"
                priority
              />
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center">
                <Film className="h-16 w-16 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Rank Badge on Poster */}
          {displayRank && (
            <div className="absolute -top-3 -right-3">
              <Badge
                className={`px-4 py-2 font-bold text-xl flex items-center gap-2 ${getRankBadgeStyle(
                  displayRank
                )}`}
              >
                {getRankIcon(displayRank)}#{displayRank}
              </Badge>
            </div>
          )}
        </motion.div>

        {/* Movie Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="space-y-6"
        >
          {/* Title and Basic Info */}
          <div>
            <h1 className="text-3xl md:text-4xl font-bold mb-4 text-balance">
              {displayTitle}
            </h1>

            <div className="flex flex-wrap gap-4 text-muted-foreground">
              {releaseYear && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>{releaseYear}</span>
                </div>
              )}
              {genre && (
                <div className="flex items-center gap-2">
                  <Film className="h-4 w-4" />
                  <span>{genre}</span>
                </div>
              )}
              {movie.imdbId && (
                <a
                  href={`https://www.imdb.com/title/${movie.imdbId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 hover:text-foreground transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>IMDB</span>
                </a>
              )}
              {movie.letterboxdUrl && (
                <a
                  href={movie.letterboxdUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 hover:text-foreground transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>Letterboxd</span>
                </a>
              )}
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="p-4">
                <p className="text-muted-foreground text-xs mb-1">
                  Puntos totales
                </p>
                <p className="text-3xl font-bold">{movie.totalPoints ?? 0}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <p className="text-muted-foreground text-xs mb-1">Votado por</p>
                <p className="text-3xl font-bold">{movie.totalPicks ?? 0}</p>
              </CardContent>
            </Card>
          </div>

          {/* Director */}
          {director && (
            <div>
              <p className="text-muted-foreground text-sm mb-1">Director</p>
              <p className="text-lg">{director}</p>
            </div>
          )}

          {/* Original Title if different */}
          {movie.originalLanguage !== 'es' &&
            movie.originalTitle !== movie.title && (
              <div>
                <p className="text-muted-foreground text-sm mb-1">
                  Título original
                </p>
                <p className="text-lg">{movie.originalTitle}</p>
              </div>
            )}
        </motion.div>
      </div>

      <Separator className="my-8" />

      {/* Picks Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <Star className="h-6 w-6 text-yellow-400" />
          Votos y Reseñas
        </h2>

        <div className="space-y-3">
          {/* Top Choice Picks (5 points) */}
          {topChoicePicks.map((pick, index) => (
            <motion.div
              key={pick.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.05 * index }}
            >
              <Card className="hover:bg-accent/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <Link href={`/mam?participants=${pick.participant.slug}`}>
                      <ParticipantAvatar
                        participant={pick.participant}
                        size="md"
                      />
                    </Link>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-4 mb-2">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/mam?participants=${pick.participant.slug}`}
                            className="hover:underline"
                          >
                            <h3 className="font-semibold">
                              {getParticipantDisplayName(pick.participant)}
                            </h3>
                          </Link>
                          <Badge className="bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-500/30">
                            Top Choice
                          </Badge>
                        </div>

                        <Badge className="bg-yellow-600 text-white text-lg font-bold px-3 py-1">
                          5 pts
                        </Badge>
                      </div>

                      {pick.review && (
                        <div className="mt-3">
                          <button
                            onClick={() => toggleReview(pick.id)}
                            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
                          >
                            {expandedReviews.has(pick.id) ? (
                              <>
                                <ChevronUp className="h-4 w-4" />
                                Ocultar reseña
                              </>
                            ) : (
                              <>
                                <ChevronDown className="h-4 w-4" />
                                Mostrar reseña
                              </>
                            )}
                          </button>

                          <AnimatePresence>
                            {expandedReviews.has(pick.id) && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3 }}
                                className="overflow-hidden"
                              >
                                <div className="bg-muted rounded-lg p-4 border">
                                  <p className="leading-relaxed text-pretty">
                                    {pick.review}
                                  </p>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}

                      {!pick.review && (
                        <p className="text-muted-foreground text-sm italic mt-2">
                          Sin reseña
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}

          {/* Regular Picks with Reviews (1 point) */}
          {regularPicksWithReviews.map((pick, index) => (
            <motion.div
              key={pick.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                duration: 0.3,
                delay: 0.05 * (topChoicePicks.length + index),
              }}
            >
              <Card className="hover:bg-accent/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <Link href={`/mam?participants=${pick.participant.slug}`}>
                      <ParticipantAvatar
                        participant={pick.participant}
                        size="md"
                      />
                    </Link>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-4 mb-2">
                        <div>
                          <Link
                            href={`/mam?participants=${pick.participant.slug}`}
                            className="hover:underline"
                          >
                            <h3 className="font-semibold">
                              {getParticipantDisplayName(pick.participant)}
                            </h3>
                          </Link>
                        </div>

                        <Badge
                          variant="secondary"
                          className="text-lg font-bold px-3 py-1"
                        >
                          1 pt
                        </Badge>
                      </div>

                      <div className="mt-3">
                        <button
                          onClick={() => toggleReview(pick.id)}
                          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
                        >
                          {expandedReviews.has(pick.id) ? (
                            <>
                              <ChevronUp className="h-4 w-4" />
                              Ocultar reseña
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-4 w-4" />
                              Mostrar reseña
                            </>
                          )}
                        </button>

                        <AnimatePresence>
                          {expandedReviews.has(pick.id) && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3 }}
                              className="overflow-hidden"
                            >
                              <div className="bg-muted rounded-lg p-4 border">
                                <p className="leading-relaxed text-pretty">
                                  {pick.review}
                                </p>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}

          {/* Grouped Regular Picks without Reviews */}
          {regularPicksWithoutReviews.length > 0 && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                duration: 0.3,
                delay:
                  0.05 *
                  (topChoicePicks.length + regularPicksWithReviews.length),
              }}
            >
              <Card className="hover:bg-accent/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex items-center justify-center h-8 w-8 rounded-full bg-muted">
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-4 mb-3">
                        <div>
                          <h3 className="font-semibold">
                            {regularPicksWithoutReviews.length}{' '}
                            {regularPicksWithoutReviews.length === 1
                              ? 'Persona'
                              : 'Personas'}
                          </h3>
                          <p className="text-muted-foreground text-sm">
                            Dieron 1 punto cada uno, sin reseña
                          </p>
                        </div>

                        <Badge
                          variant="secondary"
                          className="text-lg font-bold px-3 py-1"
                        >
                          {regularPicksWithoutReviews.length} pt
                          {regularPicksWithoutReviews.length !== 1 ? 's' : ''}
                        </Badge>
                      </div>

                      <button
                        onClick={() => setShowGroupedVoters(!showGroupedVoters)}
                        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
                      >
                        {showGroupedVoters ? (
                          <>
                            <ChevronUp className="h-4 w-4" />
                            Ocultar votantes
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-4 w-4" />
                            Mostrar votantes
                          </>
                        )}
                      </button>

                      <AnimatePresence>
                        {showGroupedVoters && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="overflow-hidden"
                          >
                            <div className="bg-muted rounded-lg p-4 border">
                              <div className="flex flex-wrap gap-3">
                                {regularPicksWithoutReviews.map((pick) => (
                                  <Link
                                    key={pick.id}
                                    href={`/mam?participants=${pick.participant.slug}`}
                                    className="flex items-center gap-2 hover:bg-background rounded-md p-1 transition-colors"
                                  >
                                    <ParticipantAvatar
                                      participant={pick.participant}
                                      size="sm"
                                    />
                                    <span className="text-sm">
                                      {getParticipantDisplayName(
                                        pick.participant
                                      )}
                                    </span>
                                  </Link>
                                ))}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>

        {/* Empty State */}
        {movie.picks.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">
                No hay votos registrados para esta película.
              </p>
            </CardContent>
          </Card>
        )}
      </motion.div>
    </div>
  );
}
