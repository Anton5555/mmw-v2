import { prisma } from '@/lib/db';
import {
  yearTopMovieQuerySchema,
  type YearTopMovieQuery,
  type YearTopMovieWithPicks,
} from '@/lib/validations/year-top';
import { Prisma, YearTopPickType } from '@prisma/client';

/**
 * Get all YearTop participants for a specific year
 */
export async function getYearTopParticipants(year: number) {
  'use cache';
  return await prisma.yearTopParticipant.findMany({
    where: {
      year,
    },
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
 * Get YearTop participant by userId and year
 * Returns null if participant not found
 */
export async function getUserYearTopParticipant(userId: string, year: number) {
  return await prisma.yearTopParticipant.findFirst({
    where: {
      userId,
      year,
    },
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
 * Get movies with YearTop picks and filtering
 * Uses cached YearTopMovieStats.totalPoints for efficient sorting
 */
export async function getYearTopMovies(query: YearTopMovieQuery) {
  'use cache';
  try {
    // Validate the query parameters
    const validatedQuery = yearTopMovieQuerySchema.parse(query);

    const { year, pickType, title, imdb, participants, page, limit } = validatedQuery;

    const skip = (page - 1) * limit;

    // Parse participants filter - handle both array and string for backward compatibility
    const participantSlugs = Array.isArray(participants)
      ? participants.filter(Boolean)
      : participants
      ? participants
          .split(',')
          .map((slug) => slug.trim())
          .filter(Boolean)
      : [];

    // Build the where clause for movie filters (excluding the stats filter since we're already in YearTopMovieStats)
    const movieWhereClause: Prisma.MovieWhereInput = {
      ...(participantSlugs.length > 0 && {
        yearTopPicks: {
          some: {
            year,
            pickType,
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

    // Get total count for pagination - count movies that have stats for this year/pickType
    const totalCount = await prisma.yearTopMovieStats.count({
      where: {
        year,
        pickType,
        totalPoints: { gt: 0 },
        ...(Object.keys(movieWhereClause).length > 0 && {
          movie: movieWhereClause,
        }),
      },
    });

    // Get paginated movies - need to join with stats for sorting
    // First get all movies with stats for this year/pickType, sorted
    const statsWithMovies = await prisma.yearTopMovieStats.findMany({
      where: {
        year,
        pickType,
        totalPoints: { gt: 0 },
        ...(Object.keys(movieWhereClause).length > 0 && {
          movie: movieWhereClause,
        }),
      },
    include: {
      movie: {
        include: {
          yearTopPicks: {
            where: {
              year,
              pickType,
            },
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
          },
        },
      },
    },
    orderBy: [
      { totalPoints: 'desc' },
      { movie: { title: 'asc' } },
    ],
    skip,
    take: limit,
  });

    // Map to expected format
    const paginatedMovies = statsWithMovies.map((stat) => ({
      ...stat.movie,
      picks: stat.movie.yearTopPicks,
      totalPoints: stat.totalPoints,
    })) as YearTopMovieWithPicks[];

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
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/2e18f9f4-c531-49f1-a287-81c7c4a40995',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'year-top.ts:185',message:'getYearTopMovies error',data:{error:error instanceof Error?error.message:String(error),stack:error instanceof Error?error.stack:undefined},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    console.error('Error in getYearTopMovies:', error);
    throw error;
  }
}

/**
 * Get a specific movie with all its YearTop picks for a year and pickType
 */
export async function getYearTopMovieById(
  movieId: number,
  year: number,
  pickType: YearTopPickType
) {
  const movie = await prisma.movie.findUnique({
    where: { id: movieId },
    include: {
      yearTopPicks: {
        where: {
          year,
          pickType,
        },
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
          createdAt: 'desc',
        },
      },
      yearTopStats: {
        where: {
          year,
          pickType,
        },
        select: {
          totalPoints: true,
        },
      },
    },
  });

  if (!movie) {
    return null;
  }

  const stats = movie.yearTopStats[0];

  return {
    ...movie,
    picks: movie.yearTopPicks,
    totalPoints: stats?.totalPoints ?? 0,
  } as YearTopMovieWithPicks;
}

/**
 * Get all YearTop stats for a specific movie across all years and pick types
 * Returns an array of stats grouped by year and pickType
 */
export async function getYearTopStatsForMovie(movieId: number) {
  // Get all stats for this movie
  const stats = await prisma.yearTopMovieStats.findMany({
    where: {
      movieId,
      totalPoints: { gt: 0 },
    },
    orderBy: [
      { year: 'desc' },
      { pickType: 'asc' },
    ],
  });

  if (stats.length === 0) {
    return [];
  }

  // Get all picks for this movie in one query, grouped by year and pickType
  const allPicks = await prisma.yearTopPick.findMany({
    where: {
      movieId,
      OR: stats.map((stat) => ({
        AND: [
          { year: stat.year },
          { pickType: stat.pickType },
        ],
      })),
    },
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
      createdAt: 'desc',
    },
  });

  // Group picks by year and pickType
  const picksByYearAndType = allPicks.reduce(
    (acc, pick) => {
      const key = `${pick.year}-${pick.pickType}`;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(pick);
      return acc;
    },
    {} as Record<string, typeof allPicks>
  );

  // Map stats to include picks
  return stats.map((stat) => {
    const key = `${stat.year}-${stat.pickType}`;
    const picks = picksByYearAndType[key] || [];

    return {
      year: stat.year,
      pickType: stat.pickType,
      totalPoints: stat.totalPoints,
      picksCount: picks.length,
      picks,
    };
  });
}

/**
 * Get movies with picks for a specific user, filtered by year and pickType
 * Returns paginated movies with user's pick data
 */
export async function getUserYearTopPicks(
  userId: string,
  year: number,
  pickType: YearTopPickType,
  query: Omit<YearTopMovieQuery, 'year' | 'pickType'>
) {
  // Validate the query parameters
  const validatedQuery = yearTopMovieQuerySchema.parse({
    ...query,
    year,
    pickType,
  });

  const { title, imdb, page, limit } = validatedQuery;

  const skip = (page - 1) * limit;

  // First, find the participant for this user and year
  const participant = await prisma.yearTopParticipant.findFirst({
    where: {
      userId,
      year,
    },
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
    yearTopPicks: {
      some: {
        participantId: participant.id,
        year,
        pickType,
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
      yearTopPicks: {
        where: {
          participantId: participant.id,
          year,
          pickType,
        },
        select: {
          id: true,
          participantId: true,
          year: true,
          pickType: true,
          isTopPosition: true,
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
      { releaseDate: 'desc' },
      { title: 'asc' },
    ],
    skip,
    take: limit,
  });

  // Map to expected format, keeping the user's pick data
  const mappedMovies = movies.map((movie) => ({
    ...movie,
    picks: movie.yearTopPicks,
    totalPoints: undefined, // For user list, we don't need community stats
  })) as YearTopMovieWithPicks[];

  // Sort movies: isTopPosition picks first, then others
  // Within each group, sort by release date (newest first), then by title
  const paginatedMovies = mappedMovies.sort((a, b) => {
    const isTopA = a.picks[0]?.isTopPosition ?? false;
    const isTopB = b.picks[0]?.isTopPosition ?? false;

    // First sort by isTopPosition (true first)
    if (isTopA !== isTopB) {
      return isTopB ? 1 : -1; // true comes before false
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
