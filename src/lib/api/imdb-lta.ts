import { prisma } from '@/lib/db';
import { ImdbLtaPhase } from '@prisma/client';
import {
  findMovieByImdbId,
  findOrCreateMovieByImdbId,
  searchInternalMoviesByName,
  type MovieCardData,
} from '@/lib/api/movies';
import {
  IMDB_ID_REGEX,
  IMDB_LTA_MAX_NOMINATIONS,
  IMDB_LTA_MIN_NOMINATIONS,
  IMDB_LTA_MIN_RATINGS_TO_QUALIFY,
  type ImdbLtaPhaseValue,
  type ImdbLtaRatingFilter,
} from '@/lib/validations/imdb-lta';

const CONFIG_ID = 1;

export type NominationMovie = MovieCardData & {
  nominationId: number;
  nominatedAt: Date;
};

export type MyNominationList = {
  id: number | null;
  submittedAt: Date | null;
  movies: NominationMovie[];
  count: number;
};

export type LookupMovieResult =
  | { status: 'found'; movie: MovieCardData }
  | { status: 'multiple'; movies: MovieCardData[] }
  | { status: 'need_imdb_id'; message: string }
  | { status: 'not_found'; message: string };

async function getOrCreateConfig() {
  const existing = await prisma.imdbLtaConfig.findUnique({
    where: { id: CONFIG_ID },
  });
  if (existing) {
    return existing;
  }
  return prisma.imdbLtaConfig.create({
    data: { id: CONFIG_ID, phase: ImdbLtaPhase.NOMINATION_OPEN },
  });
}

export async function getImdbLtaPhase(): Promise<ImdbLtaPhase> {
  const config = await getOrCreateConfig();
  return config.phase;
}

export async function assertNominationPhaseOpen(): Promise<void> {
  const phase = await getImdbLtaPhase();
  if (phase !== ImdbLtaPhase.NOMINATION_OPEN) {
    throw new Error(
      'Las nominaciones están cerradas. Ya no podés modificar tu lista.'
    );
  }
}

export async function getMyNominationList(
  userId: string
): Promise<MyNominationList> {
  const list = await prisma.imdbLtaNominationList.findUnique({
    where: { userId },
    include: {
      nominations: {
        include: {
          movie: {
            select: {
              id: true,
              title: true,
              originalTitle: true,
              originalLanguage: true,
              releaseDate: true,
              posterUrl: true,
              imdbId: true,
              tmdbId: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!list) {
    return { id: null, submittedAt: null, movies: [], count: 0 };
  }

  const movies: NominationMovie[] = list.nominations.map((n) => ({
    ...n.movie,
    nominationId: n.id,
    nominatedAt: n.createdAt,
  }));

  const submittedAt = await unsubmitIfBelowMinimum(
    list.id,
    movies.length,
    list.submittedAt
  );

  return {
    id: list.id,
    submittedAt,
    movies,
    count: movies.length,
  };
}

async function ensureNominationList(userId: string) {
  return prisma.imdbLtaNominationList.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });
}

/** Guardar is only valid while the list still has 25–50 films. */
async function unsubmitIfBelowMinimum(
  listId: number,
  count: number,
  submittedAt: Date | null
) {
  if (!submittedAt || count >= IMDB_LTA_MIN_NOMINATIONS) {
    return submittedAt;
  }

  await prisma.imdbLtaNominationList.update({
    where: { id: listId },
    data: { submittedAt: null },
  });

  return null;
}

/**
 * Lookup movie: internal DB first (by IMDb ID or name).
 * TMDB only when an IMDb ID is provided and missing internally.
 * Never searches TMDB by name.
 */
export async function lookupMovie(query: string): Promise<LookupMovieResult> {
  const trimmed = query.trim();

  if (IMDB_ID_REGEX.test(trimmed)) {
    const internal = await findMovieByImdbId(trimmed);
    if (internal) {
      return { status: 'found', movie: internal };
    }

    try {
      const movie = await findOrCreateMovieByImdbId(trimmed);
      return { status: 'found', movie };
    } catch {
      return {
        status: 'not_found',
        message: `No se encontró la película con ID de IMDb ${trimmed}. Verificá el ID e intentá de nuevo.`,
      };
    }
  }

  const matches = await searchInternalMoviesByName(trimmed);

  if (matches.length === 0) {
    return {
      status: 'need_imdb_id',
      message:
        'No encontramos esta película en nuestra base. Ingresá el ID de IMDb para buscarla.',
    };
  }

  if (matches.length === 1) {
    return { status: 'found', movie: matches[0]! };
  }

  // Exact title/originalTitle match (case-insensitive) collapses to a single result
  const exact = matches.filter(
    (m) =>
      m.title.toLowerCase() === trimmed.toLowerCase() ||
      m.originalTitle.toLowerCase() === trimmed.toLowerCase()
  );
  if (exact.length === 1) {
    return { status: 'found', movie: exact[0]! };
  }

  return { status: 'multiple', movies: matches };
}

export async function addNomination(userId: string, movieId: number) {
  await assertNominationPhaseOpen();

  const movie = await prisma.movie.findUnique({
    where: { id: movieId },
    select: {
      id: true,
      title: true,
      originalTitle: true,
      originalLanguage: true,
      releaseDate: true,
      posterUrl: true,
      imdbId: true,
      tmdbId: true,
    },
  });

  if (!movie) {
    throw new Error('Película no encontrada');
  }

  const list = await ensureNominationList(userId);

  const currentCount = await prisma.imdbLtaNomination.count({
    where: { listId: list.id },
  });

  if (currentCount >= IMDB_LTA_MAX_NOMINATIONS) {
    throw new Error(
      `Ya alcanzaste el máximo de ${IMDB_LTA_MAX_NOMINATIONS} películas`
    );
  }

  try {
    const nomination = await prisma.imdbLtaNomination.create({
      data: {
        listId: list.id,
        userId,
        movieId,
      },
    });

    return {
      nominationId: nomination.id,
      movie: {
        ...movie,
        nominationId: nomination.id,
        nominatedAt: nomination.createdAt,
      } satisfies NominationMovie,
      count: currentCount + 1,
    };
  } catch (error: unknown) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'P2002'
    ) {
      throw new Error('Esta película ya está en tu lista');
    }
    throw error;
  }
}

export async function removeNomination(userId: string, movieId: number) {
  await assertNominationPhaseOpen();

  const nomination = await prisma.imdbLtaNomination.findUnique({
    where: {
      userId_movieId: { userId, movieId },
    },
  });

  if (!nomination) {
    throw new Error('Esta película no está en tu lista');
  }

  await prisma.imdbLtaNomination.delete({
    where: { id: nomination.id },
  });

  const [count, list] = await Promise.all([
    prisma.imdbLtaNomination.count({
      where: { userId },
    }),
    prisma.imdbLtaNominationList.findUnique({
      where: { userId },
      select: { id: true, submittedAt: true },
    }),
  ]);

  const submittedAt = list
    ? await unsubmitIfBelowMinimum(list.id, count, list.submittedAt)
    : null;

  return { count, submittedAt };
}

export async function submitNominations(userId: string) {
  await assertNominationPhaseOpen();

  const list = await ensureNominationList(userId);

  const count = await prisma.imdbLtaNomination.count({
    where: { listId: list.id },
  });

  if (count < IMDB_LTA_MIN_NOMINATIONS) {
    throw new Error(
      `Necesitás al menos ${IMDB_LTA_MIN_NOMINATIONS} películas para guardar tu lista (tenés ${count})`
    );
  }

  if (count > IMDB_LTA_MAX_NOMINATIONS) {
    throw new Error(
      `Tu lista no puede tener más de ${IMDB_LTA_MAX_NOMINATIONS} películas`
    );
  }

  const updated = await prisma.imdbLtaNominationList.update({
    where: { id: list.id },
    data: { submittedAt: new Date() },
  });

  return {
    submittedAt: updated.submittedAt,
    count,
  };
}

/**
 * Admin-only phase update. Used for verification / future admin page.
 */
export async function updateImdbLtaPhase(phase: ImdbLtaPhaseValue) {
  await getOrCreateConfig();
  return prisma.imdbLtaConfig.update({
    where: { id: CONFIG_ID },
    data: { phase: phase as ImdbLtaPhase },
  });
}

// ---------------------------------------------------------------------------
// Admin — live nomination snapshot (includes non-submitted lists)
// ---------------------------------------------------------------------------

export type AdminNominationParticipant = {
  userId: string;
  name: string;
  nominationCount: number;
  submittedAt: Date | null;
};

export type AdminNominatedMovie = {
  id: number;
  title: string;
  originalTitle: string;
  posterUrl: string;
  imdbId: string;
  nominationCount: number;
  nominators: string[];
};

export type AdminNominationSnapshot = {
  uniqueMovies: number;
  totalNominations: number;
  listCount: number;
  submittedListCount: number;
  participants: AdminNominationParticipant[];
  movies: AdminNominatedMovie[];
};

/**
 * All nomination rows currently in DB — including drafts that never hit Guardar.
 * Call only from admin-gated UI.
 */
export async function listAdminNominationSnapshot(): Promise<AdminNominationSnapshot> {
  const [lists, nominations] = await Promise.all([
    prisma.imdbLtaNominationList.findMany({
      select: {
        userId: true,
        submittedAt: true,
        user: { select: { name: true } },
        _count: { select: { nominations: true } },
      },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.imdbLtaNomination.findMany({
      select: {
        movieId: true,
        user: { select: { name: true } },
        movie: {
          select: {
            id: true,
            title: true,
            originalTitle: true,
            posterUrl: true,
            imdbId: true,
          },
        },
      },
    }),
  ]);

  const participants: AdminNominationParticipant[] = lists
    .map((list) => ({
      userId: list.userId,
      name: list.user.name,
      nominationCount: list._count.nominations,
      submittedAt: list.submittedAt,
    }))
    .toSorted((a, b) => b.nominationCount - a.nominationCount);

  const byMovie = new Map<
    number,
    {
      movie: {
        id: number;
        title: string;
        originalTitle: string;
        posterUrl: string;
        imdbId: string;
      };
      nominators: string[];
    }
  >();

  for (const n of nominations) {
    const existing = byMovie.get(n.movieId);
    if (existing) {
      existing.nominators.push(n.user.name);
    } else {
      byMovie.set(n.movieId, {
        movie: n.movie,
        nominators: [n.user.name],
      });
    }
  }

  const movies: AdminNominatedMovie[] = [...byMovie.values()]
    .map(({ movie, nominators }) => ({
      id: movie.id,
      title: movie.title,
      originalTitle: movie.originalTitle,
      posterUrl: movie.posterUrl,
      imdbId: movie.imdbId,
      nominationCount: nominators.length,
      nominators: nominators.toSorted((a, b) =>
        a.localeCompare(b, 'es', { sensitivity: 'base' })
      ),
    }))
    .toSorted((a, b) => {
      if (a.nominationCount !== b.nominationCount) {
        return b.nominationCount - a.nominationCount;
      }
      return a.title.localeCompare(b.title, 'es', { sensitivity: 'base' });
    });

  return {
    uniqueMovies: movies.length,
    totalNominations: nominations.length,
    listCount: lists.length,
    submittedListCount: lists.filter((l) => l.submittedAt).length,
    participants,
    movies,
  };
}

// ---------------------------------------------------------------------------
// Phase 2 — Ratings
// ---------------------------------------------------------------------------

export type CandidateMovieStats = MovieCardData & {
  nominationCount: number;
  ratingCount: number;
  averageScore: number | null;
  userNominated: boolean;
  userScore: number | null;
};

export type RateableListResult = {
  movies: CandidateMovieStats[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

const movieCardSelect = {
  id: true,
  title: true,
  originalTitle: true,
  originalLanguage: true,
  releaseDate: true,
  posterUrl: true,
  imdbId: true,
  tmdbId: true,
} as const;

export async function assertRatingPhaseOpen(): Promise<void> {
  const phase = await getImdbLtaPhase();
  if (phase !== ImdbLtaPhase.RATING_OPEN) {
    throw new Error(
      'Las puntuaciones están cerradas. Ya no podés puntuar películas.'
    );
  }
}

/**
 * Shared-unlock eligibility (ignores phase — callers check phase separately).
 * Solo nominator cannot rate; shared nominators and non-nominators can.
 */
export async function canUserRateMovie(
  userId: string,
  movieId: number
): Promise<{ allowed: boolean; reason?: string }> {
  const nominationCount = await prisma.imdbLtaNomination.count({
    where: { movieId },
  });

  if (nominationCount === 0) {
    return {
      allowed: false,
      reason: 'Esta película no es candidata de IMDB LTA',
    };
  }

  const existingRating = await prisma.imdbLtaRating.findUnique({
    where: { userId_movieId: { userId, movieId } },
    select: { id: true },
  });

  if (existingRating) {
    return { allowed: false, reason: 'Ya puntuaste esta película' };
  }

  const userNomination = await prisma.imdbLtaNomination.findUnique({
    where: { userId_movieId: { userId, movieId } },
    select: { id: true },
  });

  if (userNomination && nominationCount < 2) {
    return {
      allowed: false,
      reason:
        'Solo vos nominaste esta película. No podés puntuarla hasta que otra persona también la nominé.',
    };
  }

  return { allowed: true };
}

async function loadCandidateStats(
  userId: string
): Promise<CandidateMovieStats[]> {
  const [movies, nominationGroups, ratingGroups, myNominations, myRatings] =
    await Promise.all([
      prisma.movie.findMany({
        where: { imdbLtaNominations: { some: {} } },
        select: movieCardSelect,
      }),
      prisma.imdbLtaNomination.groupBy({
        by: ['movieId'],
        _count: { _all: true },
      }),
      prisma.imdbLtaRating.groupBy({
        by: ['movieId'],
        _count: { _all: true },
        _avg: { score: true },
      }),
      prisma.imdbLtaNomination.findMany({
        where: { userId },
        select: { movieId: true },
      }),
      prisma.imdbLtaRating.findMany({
        where: { userId },
        select: { movieId: true, score: true },
      }),
    ]);

  const nominationCountByMovie = new Map(
    nominationGroups.map((g) => [g.movieId, g._count._all])
  );
  const ratingByMovie = new Map(
    ratingGroups.map((g) => [
      g.movieId,
      { count: g._count._all, avg: g._avg.score },
    ])
  );
  const myNominationSet = new Set(myNominations.map((n) => n.movieId));
  const myScoreByMovie = new Map(myRatings.map((r) => [r.movieId, r.score]));

  return movies.map((movie) => {
    const rating = ratingByMovie.get(movie.id);
    return {
      ...movie,
      nominationCount: nominationCountByMovie.get(movie.id) ?? 0,
      ratingCount: rating?.count ?? 0,
      averageScore: rating?.avg ?? null,
      userNominated: myNominationSet.has(movie.id),
      userScore: myScoreByMovie.get(movie.id) ?? null,
    };
  });
}

function isEligibleToRate(movie: CandidateMovieStats): boolean {
  if (movie.userScore !== null) return false;
  if (movie.nominationCount === 0) return false;
  if (movie.userNominated && movie.nominationCount < 2) return false;
  return true;
}

function matchesRatingFilter(
  movie: CandidateMovieStats,
  filter: ImdbLtaRatingFilter
): boolean {
  switch (filter) {
    case 'mine_done':
      return movie.userScore !== null;
    case 'unrated':
      return isEligibleToRate(movie);
    case 'no_scores':
      return isEligibleToRate(movie) && movie.ratingCount === 0;
    case 'low':
      return (
        isEligibleToRate(movie) &&
        movie.ratingCount >= 0 &&
        movie.ratingCount <= 2
      );
    case 'close':
      return (
        isEligibleToRate(movie) &&
        movie.ratingCount >= 3 &&
        movie.ratingCount <= 4
      );
    case 'qualified':
      return (
        isEligibleToRate(movie) &&
        movie.ratingCount >= IMDB_LTA_MIN_RATINGS_TO_QUALIFY
      );
    default:
      return false;
  }
}

function sortForCoverage(a: CandidateMovieStats, b: CandidateMovieStats) {
  if (a.ratingCount !== b.ratingCount) {
    return a.ratingCount - b.ratingCount;
  }
  return a.title.localeCompare(b.title, 'es', { sensitivity: 'base' });
}

function sortMineDone(a: CandidateMovieStats, b: CandidateMovieStats) {
  return a.title.localeCompare(b.title, 'es', { sensitivity: 'base' });
}

export async function listRateableCandidates(
  userId: string,
  options: { filter?: ImdbLtaRatingFilter; page?: number; limit?: number } = {}
): Promise<RateableListResult> {
  const filter = options.filter ?? 'unrated';
  const page = options.page ?? 1;
  const limit = options.limit ?? 30;

  const all = await loadCandidateStats(userId);
  const filtered = all
    .filter((m) => matchesRatingFilter(m, filter))
    .toSorted(filter === 'mine_done' ? sortMineDone : sortForCoverage);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const start = (page - 1) * limit;
  const movies = filtered.slice(start, start + limit);

  return {
    movies,
    pagination: { page, limit, total, totalPages },
  };
}

/**
 * Destacadas sin tu puntaje — UX discovery only; does not affect ranking.
 */
export async function listHighlightUnrated(
  userId: string,
  limit = 12
): Promise<CandidateMovieStats[]> {
  const all = await loadCandidateStats(userId);
  return all
    .filter((m) => isEligibleToRate(m) && m.ratingCount >= 1)
    .toSorted((a, b) => {
      const avgA = a.averageScore ?? 0;
      const avgB = b.averageScore ?? 0;
      if (avgA !== avgB) return avgB - avgA;
      if (a.ratingCount !== b.ratingCount) return b.ratingCount - a.ratingCount;
      return a.title.localeCompare(b.title, 'es', { sensitivity: 'base' });
    })
    .slice(0, limit);
}

export async function submitRating(
  userId: string,
  movieId: number,
  score: number
) {
  await assertRatingPhaseOpen();

  const eligibility = await canUserRateMovie(userId, movieId);
  if (!eligibility.allowed) {
    throw new Error(eligibility.reason ?? 'No podés puntuar esta película');
  }

  try {
    const rating = await prisma.imdbLtaRating.create({
      data: { userId, movieId, score },
    });
    return { id: rating.id, movieId, score: rating.score };
  } catch (error: unknown) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'P2002'
    ) {
      throw new Error('Ya puntuaste esta película');
    }
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Phase 3 — Ranking
// ---------------------------------------------------------------------------

export type RankingMovie = MovieCardData & {
  rank: number;
  ratingCount: number;
  averageScore: number;
  nominationCount: number;
};

export async function listOfficialRanking(): Promise<{
  movies: RankingMovie[];
  isFinal: boolean;
  phase: ImdbLtaPhase;
}> {
  const phase = await getImdbLtaPhase();
  const isFinal = phase === ImdbLtaPhase.RATING_CLOSED;

  const [movies, nominationGroups, ratingGroups] = await Promise.all([
    prisma.movie.findMany({
      where: { imdbLtaNominations: { some: {} } },
      select: movieCardSelect,
    }),
    prisma.imdbLtaNomination.groupBy({
      by: ['movieId'],
      _count: { _all: true },
    }),
    prisma.imdbLtaRating.groupBy({
      by: ['movieId'],
      _count: { _all: true },
      _avg: { score: true },
    }),
  ]);

  const nominationCountByMovie = new Map(
    nominationGroups.map((g) => [g.movieId, g._count._all])
  );
  const ratingByMovie = new Map(
    ratingGroups.map((g) => [
      g.movieId,
      { count: g._count._all, avg: g._avg.score },
    ])
  );

  const qualified = movies
    .map((movie) => {
      const rating = ratingByMovie.get(movie.id);
      const ratingCount = rating?.count ?? 0;
      const averageScore = rating?.avg ?? null;
      if (
        ratingCount < IMDB_LTA_MIN_RATINGS_TO_QUALIFY ||
        averageScore === null
      ) {
        return null;
      }
      return {
        ...movie,
        ratingCount,
        averageScore,
        nominationCount: nominationCountByMovie.get(movie.id) ?? 0,
      };
    })
    .filter((m): m is NonNullable<typeof m> => m !== null)
    .toSorted((a, b) => {
      if (a.averageScore !== b.averageScore) {
        return b.averageScore - a.averageScore;
      }
      if (a.ratingCount !== b.ratingCount) {
        return b.ratingCount - a.ratingCount;
      }
      return a.title.localeCompare(b.title, 'es', { sensitivity: 'base' });
    })
    .map((movie, index) => ({
      ...movie,
      rank: index + 1,
    }));

  return { movies: qualified, isFinal, phase };
}
