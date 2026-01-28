import { prisma } from '@/lib/db';
import type {
  OscarCategory,
  OscarEdition,
  UserBallot,
} from '@/lib/validations/oscars';

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
  editionId: number,
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
  editionId: number,
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

export type CategoryPredictionStats = {
  id: number;
  name: string;
  slug: string;
  order: number;
  winnerId: number | null;
  winner: {
    nomineeId: number;
    nomineeName: string;
    filmTitle: string | null;
  } | null;
  topPicks: {
    nomineeId: number;
    nomineeName: string;
    filmTitle: string | null;
    count: number;
    percentage: number;
  }[];
  totalVotes: number;
};

/**
 * Get prediction stats: top 3 picks per category for an edition
 */
export async function getOscarPredictionStats(
  editionId: number,
): Promise<CategoryPredictionStats[]> {
  const [categories, picks] = await Promise.all([
    prisma.oscarCategory.findMany({
      where: { editionId },
      select: {
        id: true,
        name: true,
        slug: true,
        order: true,
        winnerId: true,
      },
      orderBy: { order: 'asc' },
    }),
    prisma.oscarPick.findMany({
      where: { ballot: { editionId } },
      select: {
        categoryId: true,
        nomineeId: true,
        nominee: {
          select: { id: true, name: true, filmTitle: true },
        },
      },
    }),
  ]);

  const winnerIds = categories
    .map((c) => c.winnerId)
    .filter((id): id is number => id != null);
  const winnerNominees =
    winnerIds.length > 0
      ? await prisma.oscarNominee.findMany({
          where: { id: { in: winnerIds } },
          select: { id: true, name: true, filmTitle: true },
        })
      : [];
  const winnerByNomineeId = new Map(
    winnerNominees.map((n) => [
      n.id,
      { nomineeId: n.id, nomineeName: n.name, filmTitle: n.filmTitle },
    ]),
  );

  const countsByCategory = new Map<
    number,
    Map<number, { name: string; filmTitle: string | null; count: number }>
  >();

  for (const p of picks) {
    let counts = countsByCategory.get(p.categoryId);
    if (!counts) {
      counts = new Map();
      countsByCategory.set(p.categoryId, counts);
    }
    const prev = counts.get(p.nomineeId);
    if (prev) prev.count += 1;
    else
      counts.set(p.nomineeId, {
        name: p.nominee.name,
        filmTitle: p.nominee.filmTitle,
        count: 1,
      });
  }

  const result: CategoryPredictionStats[] = categories.map((cat) => {
    const counts = countsByCategory.get(cat.id) ?? new Map();
    const entries = Array.from(counts.entries())
      .map(([nomineeId, v]) => ({ nomineeId, ...v }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
    const totalVotes = Array.from(counts.values()).reduce(
      (sum, v) => sum + v.count,
      0,
    );
    const winner =
      cat.winnerId != null
        ? (winnerByNomineeId.get(cat.winnerId) ?? null)
        : null;

    return {
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      order: cat.order,
      winnerId: cat.winnerId,
      winner,
      totalVotes,
      topPicks: entries.map((e) => ({
        nomineeId: e.nomineeId,
        nomineeName: e.name,
        filmTitle: e.filmTitle,
        count: e.count,
        percentage:
          totalVotes > 0 ? Math.round((e.count / totalVotes) * 100) : 0,
      })),
    };
  });

  return result;
}

export type LeaderboardEntry = {
  rank: number;
  userId: string;
  userName: string;
  userImage: string | null;
  score: number;
  submittedAt: Date;
  isWinner: boolean;
};

/**
 * Get leaderboard for an edition: all participants ordered by score
 */
export async function getOscarLeaderboard(
  editionId: number,
): Promise<LeaderboardEntry[]> {
  const ballots = await prisma.oscarBallot.findMany({
    where: { editionId },
    include: {
      user: { select: { id: true, name: true, image: true } },
    },
    orderBy: [
      { score: { sort: 'desc', nulls: 'last' } },
      { submittedAt: 'asc' },
    ],
  });

  const maxScore =
    ballots.length > 0
      ? Math.max(...ballots.map((b) => b.score ?? -1), -1)
      : -1;

  const result: LeaderboardEntry[] = [];
  let currentRank = 1;

  for (let i = 0; i < ballots.length; i++) {
    const b = ballots[i];
    const s = b.score ?? 0;
    if (i > 0 && s < (ballots[i - 1].score ?? -1)) {
      currentRank = i + 1;
    }

    result.push({
      rank: currentRank,
      userId: b.user.id,
      userName: b.user.name ?? 'Usuario',
      userImage: b.user.image ?? null,
      score: s,
      submittedAt: b.submittedAt,
      isWinner: maxScore >= 0 && s === maxScore,
    });
  }

  return result;
}

/**
 * Check if user has already submitted a ballot for an edition
 */
export async function hasUserVoted(
  userId: string,
  editionId: number,
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
