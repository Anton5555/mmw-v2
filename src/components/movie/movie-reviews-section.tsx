'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';
import { GlassCard } from '../ui/glass-card';
import { ChevronDown } from 'lucide-react';
import { ReviewCard } from './review-card';
import type { MamMovieWithPicks } from '@/lib/validations/mam';

interface MovieReviewsSectionProps {
  picks: MamMovieWithPicks['picks'];
}

export function MovieReviewsSection({ picks }: MovieReviewsSectionProps) {
  const [isFullyExpanded, setIsFullyExpanded] = useState(false);
  const [expandedReviews, setExpandedReviews] = useState<Set<number>>(
    new Set()
  );

  // Logic for grouping picks
  const specialMentions = picks.filter((pick) => pick.isSpecialMention);
  const regularPicks = picks.filter((pick) => !pick.isSpecialMention);
  const topChoicePicks = regularPicks.filter((pick) => pick.score === 5);
  const regularPicksWithReviews = regularPicks.filter(
    (pick) => pick.score === 1 && pick.review
  );
  const regularPicksWithoutReviews = regularPicks.filter(
    (pick) => pick.score === 1 && !pick.review
  );

  // Combine top choices and regular reviews for collapsible display
  const allReviewsWithContent = [...topChoicePicks, ...regularPicksWithReviews];
  const visibleReviews = isFullyExpanded
    ? allReviewsWithContent
    : allReviewsWithContent.slice(0, 3);

  const hasHiddenReviews = allReviewsWithContent.length > 3;
  const hiddenCount = allReviewsWithContent.length - 3;

  return (
    <div className="space-y-10">
      <div>
        <h2 className="text-sm font-black uppercase tracking-[0.3em] text-zinc-500 mb-8">
          Crítica de la Comunidad
        </h2>

        <div className="space-y-6">
          {/* Top Choice Section */}
          {visibleReviews
            .filter((pick) => pick.score === 5)
            .map((pick) => (
              <ReviewCard
                key={pick.id}
                pick={pick}
                isTopChoice
                expandedReviews={expandedReviews}
                setExpandedReviews={setExpandedReviews}
              />
            ))}

          {/* Regular Reviews */}
          {visibleReviews
            .filter((pick) => pick.score !== 5)
            .map((pick) => (
              <ReviewCard
                key={pick.id}
                pick={pick}
                expandedReviews={expandedReviews}
                setExpandedReviews={setExpandedReviews}
              />
            ))}
        </div>

        {hasHiddenReviews && (
          <div className="mt-8 flex justify-center">
            <Button
              variant="ghost"
              onClick={() => setIsFullyExpanded(!isFullyExpanded)}
              className="text-zinc-500 hover:text-white uppercase text-xs font-bold tracking-widest"
            >
              {isFullyExpanded
                ? 'Ver menos reseñas'
                : `Ver ${hiddenCount} reseñas más`}
              <ChevronDown
                className={cn(
                  'ml-2 h-4 w-4 transition-transform',
                  isFullyExpanded && 'rotate-180'
                )}
              />
            </Button>
          </div>
        )}

        {/* Quick Votes - Compact footer */}
        {regularPicksWithoutReviews.length > 0 && (
          <div className="pt-8 border-t border-white/5 mt-8">
            <p className="text-xs text-zinc-500 italic">
              Votado también por{' '}
              <span className="text-white">
                {regularPicksWithoutReviews
                  .map((v) => v.participant.displayName)
                  .join(', ')}
              </span>
            </p>
          </div>
        )}
      </div>

      {/* Special Mentions Section */}
      {specialMentions.length > 0 && (
        <div className="pt-8 border-t border-white/10">
          <h3 className="text-xl font-black uppercase tracking-widest text-white/40 mb-6">
            Menciones Especiales
          </h3>
          <div className="space-y-6">
            {specialMentions.map((pick) => (
              <ReviewCard
                key={pick.id}
                pick={pick}
                isSpecialMention
                expandedReviews={expandedReviews}
                setExpandedReviews={setExpandedReviews}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
