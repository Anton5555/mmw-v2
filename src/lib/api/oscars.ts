import { prisma } from '@/lib/db';
import type { OscarCategory, OscarEdition, UserBallot } from '@/lib/validations/oscars';

/**
 * Get the active Oscar edition (the one currently accepting votes)
 */
export async function getActiveEdition(): Promise<OscarEdition | null> {
  'use cache';
  const edition = await prisma.oscarEdition.findFirst({
    where: {
      isActive: true,
    },
    orderBy: {
      year: 'desc',
    },
  });

  if (!edition) {
    return null;
  }

  return {
    id: edition.id,
    year: edition.year,
    ceremonyDate: edition.ceremonyDate,
    isActive: edition.isActive,
    resultsReleased: edition.resultsReleased,
  };
}

/**
 * Get all categories with nominees for an edition
 */
export async function getOscarCategories(
  editionId: number
): Promise<OscarCategory[]> {
  'use cache';
  const categories = await prisma.oscarCategory.findMany({
    where: {
      editionId,
    },
    include: {
      nominees: {
        include: {
          movie: {
            select: {
              id: true,
              title: true,
              posterUrl: true,
              imdbId: true,
            },
          },
        },
        orderBy: {
          id: 'asc',
        },
      },
    },
    orderBy: {
      order: 'asc',
    },
  });

  return categories.map((category) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    order: category.order,
    winnerId: category.winnerId,
    nominees: category.nominees.map((nominee) => ({
      id: nominee.id,
      name: nominee.name,
      filmTitle: nominee.filmTitle,
      imdbId: nominee.imdbId,
      filmImdbId: nominee.filmImdbId,
      movieId: nominee.movieId,
      movie: nominee.movie
        ? {
            id: nominee.movie.id,
            title: nominee.movie.title,
            posterUrl: nominee.movie.posterUrl,
            imdbId: nominee.movie.imdbId,
          }
        : null,
    })),
  }));
}

/**
 * Get user's ballot for an edition
 */
export async function getUserBallot(
  userId: string,
  editionId: number
): Promise<UserBallot | null> {
  const ballot = await prisma.oscarBallot.findUnique({
    where: {
      userId_editionId: {
        userId,
        editionId,
      },
    },
    include: {
      picks: {
        include: {
          nominee: {
            include: {
              movie: {
                select: {
                  id: true,
                  title: true,
                  posterUrl: true,
                  imdbId: true,
                },
              },
            },
          },
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
              order: true,
            },
          },
        },
        orderBy: {
          category: {
            order: 'asc',
          },
        },
      },
    },
  });

  if (!ballot) {
    return null;
  }

  return {
    id: ballot.id,
    submittedAt: ballot.submittedAt,
    score: ballot.score,
    picks: ballot.picks.map((pick) => ({
      id: pick.id,
      categoryId: pick.categoryId,
      nomineeId: pick.nomineeId,
      nominee: {
        id: pick.nominee.id,
        name: pick.nominee.name,
        filmTitle: pick.nominee.filmTitle,
        movie: pick.nominee.movie
          ? {
              id: pick.nominee.movie.id,
              title: pick.nominee.movie.title,
              posterUrl: pick.nominee.movie.posterUrl,
              imdbId: pick.nominee.movie.imdbId,
            }
          : null,
      },
      category: {
        id: pick.category.id,
        name: pick.category.name,
        slug: pick.category.slug,
        order: pick.category.order,
      },
    })),
  };
}

/**
 * Check if user has already submitted a ballot for an edition
 */
export async function hasUserVoted(
  userId: string,
  editionId: number
): Promise<boolean> {
  const ballot = await prisma.oscarBallot.findUnique({
    where: {
      userId_editionId: {
        userId,
        editionId,
      },
    },
    select: {
      id: true,
    },
  });

  return ballot !== null;
}
