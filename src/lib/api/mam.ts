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
            select: {
              id: true,
              displayName: true,
              slug: true,
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
            select: {
              id: true,
              displayName: true,
              slug: true,
              userId: true,
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
              select: {
                displayName: true,
                slug: true,
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
