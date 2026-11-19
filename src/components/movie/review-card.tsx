'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  ParticipantAvatar,
  getParticipantDisplayName,
} from '../participant-avatar';
import type { MamMovieWithPicks } from '@/lib/validations/mam';
import { GlassCard } from '../ui/glass-card';

interface ReviewCardProps {
  pick: MamMovieWithPicks['picks'][0];
  isTopChoice?: boolean;
  isSpecialMention?: boolean;
  expandedReviews: Set<number>;
  setExpandedReviews: React.Dispatch<React.SetStateAction<Set<number>>>;
}

export function ReviewCard({
  pick,
  isTopChoice,
  isSpecialMention,
  expandedReviews,
  setExpandedReviews,
}: ReviewCardProps) {
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
        // A yellow rule on the left marks the participant's #1 pick.
        isTopChoice && 'shadow-[inset_3px_0_0_hsl(var(--primary))]'
      )}
    >
      <div className="p-5">
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
                <p className="text-sm font-semibold text-foreground">
                  {getParticipantDisplayName(pick.participant)}
                </p>
              </Link>
              {isTopChoice && (
                <span className="text-xs text-primary">
                  Favorito de la lista
                </span>
              )}
              {isSpecialMention && (
                <span className="text-xs text-muted-foreground">
                  Mención especial
                </span>
              )}
            </div>
          </div>
          <div
            className={cn(
              'shrink-0 px-2 py-1 font-display text-base font-bold tabular-nums leading-none',
              isTopChoice
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-foreground'
            )}
          >
            {isSpecialMention ? (
              'Especial'
            ) : (
              <>
                {pick.score} pt{pick.score > 1 ? 's' : ''}
              </>
            )}
          </div>
        </div>

        {pick.review && (
          <div className="mt-4 space-y-2">
            <p
              className={cn(
                'max-w-prose text-sm leading-relaxed text-foreground/85',
                !isExpanded && 'line-clamp-2'
              )}
            >
              {pick.review}
            </p>
            <button
              onClick={toggle}
              className="text-xs font-semibold text-muted-foreground underline-offset-4 transition-colors hover:text-primary hover:underline"
            >
              {isExpanded ? 'Ver menos' : 'Leer reseña completa'}
            </button>
          </div>
        )}
      </div>
    </GlassCard>
  );
}
