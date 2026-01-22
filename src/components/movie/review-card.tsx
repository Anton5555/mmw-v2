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
