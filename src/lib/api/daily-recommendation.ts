import { prisma } from '@/lib/db';
import { normalizeDateToUTC } from '@/lib/utils/daily-recommendation';
import type { Movie, List, MamParticipant } from '@prisma/client';

export type DailyRecommendationData =
  | {
      type: 'movie';
      movie: Movie;
      curator?: { name: string; image?: string | null };
    }
  | {
      type: 'list';
      list: List;
      curator: { name: string; image?: string | null };
    }
  | {
      type: 'participant';
      participant: MamParticipant & {
        user: { name: string; image: string | null } | null;
        _count?: { picks: number };
      };
      curator: { name: string; image?: string | null };
    };

/**
 * Get the daily recommendation for a specific date (defaults to today)
 */
export async function getDailyRecommendation(
  date?: Date
): Promise<DailyRecommendationData | null> {
  'use cache';
  const targetDate = date || new Date();
  const normalizedDate = normalizeDateToUTC(targetDate);

  const recommendation = await prisma.dailyRecommendation.findUnique({
    where: { date: normalizedDate },
    include: {
      movie: true,
      list: true,
      participant: {
        include: {
          user: {
            select: {
              name: true,
              image: true,
            },
          },
          _count: {
            select: {
              picks: {
                where: {
                  isSpecialMention: false,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!recommendation) {
    return null;
  }

  const curator = recommendation.curatorName
    ? {
        name: recommendation.curatorName,
        image: recommendation.curatorImage || undefined,
      }
    : undefined;

  switch (recommendation.type) {
    case 'movie':
      if (!recommendation.movie) {
        return null;
      }
      return {
        type: 'movie',
        movie: recommendation.movie,
        curator,
      };

    case 'list':
      if (!recommendation.list) {
        return null;
      }
      // For lists, we need to get the user who created it
      const listCreator = await prisma.user.findUnique({
        where: { id: recommendation.list.createdBy },
        select: { name: true, image: true },
      });
      return {
        type: 'list',
        list: recommendation.list,
        curator: curator || {
          name: listCreator?.name || 'Comunidad',
          image: listCreator?.image || undefined,
        },
      };

    case 'participant':
      if (!recommendation.participant) {
        return null;
      }
      return {
        type: 'participant',
        participant: recommendation.participant,
        curator: curator || {
          name: recommendation.participant.displayName,
          image: recommendation.participant.user?.image || undefined,
        },
      };

    default:
      return null;
  }
}
