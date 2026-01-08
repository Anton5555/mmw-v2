import { prisma } from '@/lib/db';
import {
  mamMovieQuerySchema,
  type MamMovieQuery,
  type MamMovieWithPicks,
} from '@/lib/validations/mam';
import { Prisma } from '@prisma/client';

/**
 * Get all MAM participants
 */
export async function getMamParticipants() {
  return await prisma.mamParticipant.findMany({
    include: {
      user: {
        select: {
          image: true,
          name: true,
        },
      },
    },
    orderBy: {
      displayName: 'asc',
    },
  });
}

/**
 * Get MAM participant by slug
 */
export async function getMamParticipantBySlug(slug: string) {
  return await prisma.mamParticipant.findUnique({
    where: { slug },
    include: {
      user: {
        select: {
          image: true,
          name: true,
        },
      },
      picks: {
        include: {
          movie: true,
        },
        orderBy: {
          score: 'desc',
        },
      },
    },
  });
}

/**
 * Get movies with MAM picks and filtering
 * Uses cached mamAverageScore and mamTotalPicks for efficient sorting
 */
export async function getMamMovies(query: MamMovieQuery) {
  // Validate the query parameters
  const validatedQuery = mamMovieQuerySchema.parse(query);

  const { title, imdb, participants, page, limit } = validatedQuery;

  const skip = (page - 1) * limit;

  // Parse participants filter (comma-separated slugs)
  const participantSlugs = participants
    ? participants
        .split(',')
        .map((slug) => slug.trim())
        .filter(Boolean)
    : [];

  // Build the where clause
  const whereClause: Prisma.MovieWhereInput = {
    mamTotalPicks: { gt: 0 }, // Only movies with picks
    ...(participantSlugs.length > 0 && {
      mamPicks: {
        some: {
          participant: {
            slug: {
              in: participantSlugs,
            },
          },
        },
      },
    }),
    ...(title && {
      OR: [
        { title: { contains: title, mode: 'insensitive' } },
        { originalTitle: { contains: title, mode: 'insensitive' } },
      ],
    }),
    ...(imdb && {
      imdbId: { contains: imdb, mode: 'insensitive' },
    }),
  };

  // Get total count for pagination
  const totalCount = await prisma.movie.count({
    where: whereClause,
  });

  // Get paginated movies using cached scores for sorting
  const movies = await prisma.movie.findMany({
    where: whereClause,
    include: {
      mamPicks: {
        include: {
          participant: {
            include: {
              user: {
                select: {
                  image: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: {
          score: 'desc',
        },
      },
    },
    orderBy: [
      { mamTotalPoints: 'desc' },
      { mamTotalPicks: 'desc' },
      { title: 'asc' },
    ],
    skip,
    take: limit,
  });

  // Map to expected format using cached values
  const paginatedMovies = movies.map((movie) => ({
    ...movie,
    picks: movie.mamPicks,
    averageScore: movie.mamAverageScore,
    totalPicks: movie.mamTotalPicks,
    totalPoints: movie.mamTotalPoints,
    rank: movie.mamRank ?? undefined,
  })) as MamMovieWithPicks[];

  const totalPages = Math.ceil(totalCount / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  return {
    movies: paginatedMovies,
    pagination: {
      page,
      limit,
      totalCount,
      totalPages,
      hasNextPage,
      hasPrevPage,
    },
  };
}

/**
 * Get a specific movie with all its MAM picks
 * Uses cached mamAverageScore and mamTotalPicks
 */
export async function getMamMovieById(movieId: number) {
  const movie = await prisma.movie.findUnique({
    where: { id: movieId },
    include: {
      mamPicks: {
        include: {
          participant: {
            include: {
              user: {
                select: {
                  image: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: [{ score: 'desc' }, { createdAt: 'asc' }],
      },
    },
  });

  if (!movie) {
    return null;
  }

  return {
    ...movie,
    picks: movie.mamPicks,
    averageScore: movie.mamAverageScore,
    totalPicks: movie.mamTotalPicks,
    totalPoints: movie.mamTotalPoints,
    rank: movie.mamRank ?? undefined,
  } as MamMovieWithPicks;
}

/**
 * Get MAM participant by userId
 * Returns null if participant not found
 */
export async function getUserMamParticipant(userId: string) {
  return await prisma.mamParticipant.findUnique({
    where: { userId },
    include: {
      _count: {
        select: {
          picks: true,
        },
      },
    },
  });
}

/**
 * Get movies with picks for a specific user, including their reviews
 * Returns paginated movies with user's pick data (score, review)
 */
export async function getUserMamPicks(userId: string, query: MamMovieQuery) {
  // Validate the query parameters
  const validatedQuery = mamMovieQuerySchema.parse(query);

  const { title, imdb, page, limit } = validatedQuery;

  const skip = (page - 1) * limit;

  // First, find the participant for this user
  const participant = await prisma.mamParticipant.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!participant) {
    return {
      movies: [],
      pagination: {
        page,
        limit,
        totalCount: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPrevPage: false,
      },
    };
  }

  // Build the where clause for movies that have picks from this participant
  const whereClause: Prisma.MovieWhereInput = {
    mamPicks: {
      some: {
        participantId: participant.id,
      },
    },
    ...(title && {
      OR: [
        { title: { contains: title, mode: 'insensitive' } },
        { originalTitle: { contains: title, mode: 'insensitive' } },
      ],
    }),
    ...(imdb && {
      imdbId: { contains: imdb, mode: 'insensitive' },
    }),
  };

  // Get total count for pagination
  const totalCount = await prisma.movie.count({
    where: whereClause,
  });

  // Get paginated movies with user's pick data
  const movies = await prisma.movie.findMany({
    where: whereClause,
    include: {
      mamPicks: {
        where: {
          participantId: participant.id,
        },
        select: {
          id: true,
          participantId: true,
          score: true,
          review: true,
          createdAt: true,
          participant: {
            include: {
              user: {
                select: {
                  image: true,
                  name: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: [
      { releaseDate: 'desc' }, // Order by release date, most recent first
      { title: 'asc' },
    ],
    skip,
    take: limit,
  });

  // Map to expected format, keeping the user's pick data
  const mappedMovies = movies.map((movie) => ({
    ...movie,
    picks: movie.mamPicks.map((pick) => ({
      ...pick,
      participantId: pick.participantId,
    })),
    // For user list, we don't need community stats
    averageScore: undefined,
    totalPicks: undefined,
    totalPoints: undefined,
    rank: undefined,
  })) as MamMovieWithPicks[];

  // Sort movies: 5-point picks first, then 1-point picks
  // Within each score group, sort by release date (newest first), then by title
  const paginatedMovies = mappedMovies.sort((a, b) => {
    const scoreA = a.picks[0]?.score ?? 0;
    const scoreB = b.picks[0]?.score ?? 0;

    // First sort by score (5 points first, then 1 point)
    if (scoreA !== scoreB) {
      return scoreB - scoreA; // Descending: 5 comes before 1
    }

    // Then by release date (newest first)
    const dateA = new Date(a.releaseDate).getTime();
    const dateB = new Date(b.releaseDate).getTime();
    if (dateA !== dateB) {
      return dateB - dateA; // Descending: newer dates first
    }

    // Finally by title alphabetically
    return a.title.localeCompare(b.title);
  });

  const totalPages = Math.ceil(totalCount / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  return {
    movies: paginatedMovies,
    pagination: {
      page,
      limit,
      totalCount,
      totalPages,
      hasNextPage,
      hasPrevPage,
    },
  };
}

/**
 * Get MAM statistics
 * Uses cached mamAverageScore and mamTotalPicks for top movies
 */
export async function getMamStats() {
  const [
    totalMovies,
    totalParticipants,
    totalPicks,
    averageScoreResult,
    topScoredMovies,
  ] = await Promise.all([
    prisma.movie.count({
      where: {
        mamTotalPicks: { gt: 0 },
      },
    }),
    prisma.mamParticipant.count(),
    prisma.mamPick.count(),
    prisma.mamPick.aggregate({
      _avg: {
        score: true,
      },
    }),
    prisma.movie.findMany({
      where: {
        mamTotalPicks: { gt: 0 },
      },
      include: {
        mamPicks: {
          include: {
            participant: {
              include: {
                user: {
                  select: {
                    image: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: [{ mamTotalPoints: 'desc' }, { mamTotalPicks: 'desc' }],
      take: 5,
    }),
  ]);

  // Map to expected format using cached values
  const moviesWithAverages = topScoredMovies.map((movie) => ({
    ...movie,
    averageScore: movie.mamAverageScore,
    totalPicks: movie.mamTotalPicks,
    totalPoints: movie.mamTotalPoints,
  }));

  return {
    totalMovies,
    totalParticipants,
    totalPicks,
    overallAverageScore: averageScoreResult._avg.score
      ? Math.round(averageScoreResult._avg.score * 100) / 100
      : 0,
    topScoredMovies: moviesWithAverages,
  };
}
