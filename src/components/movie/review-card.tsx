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
        isTopChoice && 'border-yellow-500/30',
        isSpecialMention && 'border-yellow-500/20'
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
                <p className="font-medium text-sm text-white">
                  {getParticipantDisplayName(pick.participant)}
                </p>
              </Link>
              {isTopChoice && (
                <span className="text-xs text-yellow-500">
                  Favorito de la lista
                </span>
              )}
              {isSpecialMention && (
                <span className="text-xs text-zinc-400">
                  Mención especial
                </span>
              )}
            </div>
          </div>
          <div
            className={cn(
              'rounded-md px-2.5 py-1 text-sm font-medium',
              isTopChoice
                ? 'bg-yellow-500 text-black'
                : isSpecialMention
                  ? 'bg-zinc-800 text-zinc-300 border border-white/10'
                  : 'bg-zinc-800 text-white'
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
          <div className="mt-4 space-y-2 border-t border-white/10 pt-4">
            <p
              className={cn(
                'text-zinc-300 leading-relaxed text-sm',
                !isExpanded && 'line-clamp-2'
              )}
            >
              {pick.review}
            </p>
            <button
              onClick={toggle}
              className="text-xs text-zinc-500 hover:text-white transition-colors"
            >
              {isExpanded ? 'Ver menos' : 'Leer reseña completa'}
            </button>
          </div>
        )}
      </div>
    </GlassCard>
  );
}
