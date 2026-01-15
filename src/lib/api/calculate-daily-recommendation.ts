import { prisma } from '@/lib/db';
import {
  getDateSeed,
  getDailyContentType,
  selectFromArray,
  normalizeDateToUTC,
} from '@/lib/utils/daily-recommendation';

/**
 * Calculate and save the daily recommendation for a given date
 * This is used by the cron job to pre-calculate recommendations
 */
export async function calculateAndSaveDailyRecommendation(
  date: Date
): Promise<{ success: boolean; type?: string; error?: string }> {
  try {
    const normalizedDate = normalizeDateToUTC(date);
    const seed = getDateSeed(date);
    const contentType = getDailyContentType(seed);

    let recommendationData: {
      type: string;
      movieId?: number;
      listId?: number;
      participantId?: number;
      curatorName?: string;
      curatorImage?: string | null;
    };

    switch (contentType) {
      case 'movie': {
        // Get MAM Top 100 movies
        const topMovies = await prisma.movie.findMany({
          where: {
            mamRank: { not: null, lte: 100 },
          },
          orderBy: { mamRank: 'asc' },
        });

        if (topMovies.length === 0) {
          return { success: false, error: 'No top 100 movies found' };
        }

        const selectedMovie = selectFromArray(topMovies, seed);

        // Get a top review/quote for the movie
        const topPick = await prisma.mamPick.findFirst({
          where: {
            movieId: selectedMovie.id,
            review: { not: null },
            isSpecialMention: false,
          },
          include: {
            participant: {
              include: {
                user: {
                  select: {
                    name: true,
                    image: true,
                  },
                },
              },
            },
          },
          orderBy: { score: 'desc' },
        });

        recommendationData = {
          type: 'movie',
          movieId: selectedMovie.id,
          curatorName: topPick?.participant.user?.name || topPick?.participant.displayName,
          curatorImage: topPick?.participant.user?.image || null,
        };
        break;
      }

      case 'list': {
        // Get all lists
        const lists = await prisma.list.findMany({
          orderBy: { createdAt: 'desc' },
        });

        if (lists.length === 0) {
          return { success: false, error: 'No lists found' };
        }

        const selectedList = selectFromArray(lists, seed);

        // Get the creator's info
        const creator = await prisma.user.findUnique({
          where: { id: selectedList.createdBy },
          select: { name: true, image: true },
        });

        recommendationData = {
          type: 'list',
          listId: selectedList.id,
          curatorName: creator?.name || 'Comunidad',
          curatorImage: creator?.image || null,
        };
        break;
      }

      case 'participant': {
        // Get participants with picks
        const participants = await prisma.mamParticipant.findMany({
          where: {
            picks: {
              some: {
                isSpecialMention: false,
              },
            },
          },
          include: {
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
        });

        if (participants.length === 0) {
          return { success: false, error: 'No participants with picks found' };
        }

        const selectedParticipant = selectFromArray(participants, seed);

        recommendationData = {
          type: 'participant',
          participantId: selectedParticipant.id,
          curatorName: selectedParticipant.displayName,
          curatorImage: selectedParticipant.userId
            ? (
                await prisma.user.findUnique({
                  where: { id: selectedParticipant.userId },
                  select: { image: true },
                })
              )?.image || null
            : null,
        };
        break;
      }
    }

    // Upsert the recommendation (idempotent)
    await prisma.dailyRecommendation.upsert({
      where: { date: normalizedDate },
      create: {
        date: normalizedDate,
        type: recommendationData.type,
        movieId: recommendationData.movieId,
        listId: recommendationData.listId,
        participantId: recommendationData.participantId,
        curatorName: recommendationData.curatorName,
        curatorImage: recommendationData.curatorImage,
      },
      update: {
        type: recommendationData.type,
        movieId: recommendationData.movieId,
        listId: recommendationData.listId,
        participantId: recommendationData.participantId,
        curatorName: recommendationData.curatorName,
        curatorImage: recommendationData.curatorImage,
      },
    });

    return { success: true, type: contentType };
  } catch (error) {
    console.error('Error calculating daily recommendation:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
