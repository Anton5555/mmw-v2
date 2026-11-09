import { prisma } from '@/lib/db';
import { ImdbLtaPhase } from '@generated/prisma/client';
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
  IMDB_LTA_NOMINATION_DEADLINE_LABEL,
  isImdbLtaNominationDeadlinePassed,
  type ImdbLtaPhaseValue,
  type ImdbLtaRatingFilter,
} from '@/lib/validations/imdb-lta';
import {
  getOpenBatch,
  loadMovieBatchStates,
  type MovieBatchState,
} from '@/lib/api/imdb-lta-batches';

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
  // Atomic upsert: two concurrent first requests must not both try to insert the row.
  return prisma.imdbLtaConfig.upsert({
    where: { id: CONFIG_ID },
    create: { id: CONFIG_ID, phase: ImdbLtaPhase.NOMINATION_OPEN },
    update: {},
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
  if (isImdbLtaNominationDeadlinePassed()) {
    throw new Error(
      `El plazo de nominaciones terminó el ${IMDB_LTA_NOMINATION_DEADLINE_LABEL}. Ya no podés modificar tu lista.`
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
  /** locked = never batched; open = current batch; released = past batch. */
  batchState: MovieBatchState;
  userSkipped: boolean;
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
      'Los puntajes están cerrados. Ya no podés puntuar películas.'
    );
  }
}

/**
 * Shared-unlock eligibility (ignores phase — callers check phase separately).
 * Locked movies cannot be rated. Solo nominator cannot rate; shared nominators
 * and non-nominators can. Existing ratings are allowed (upsert / edit).
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

  const batchState = await getMovieBatchStateCached(movieId);
  if (batchState === 'locked') {
    return {
      allowed: false,
      reason: 'Esta película todavía no salió en un lote',
    };
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

async function getMovieBatchStateCached(
  movieId: number
): Promise<MovieBatchState> {
  const states = await loadMovieBatchStates([movieId]);
  return states.get(movieId) ?? 'locked';
}

async function loadCandidateStats(
  userId: string
): Promise<CandidateMovieStats[]> {
  const [
    movies,
    nominationGroups,
    ratingGroups,
    myNominations,
    myRatings,
    mySkips,
    batchStates,
  ] = await Promise.all([
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
    prisma.imdbLtaSkip.findMany({
      where: { userId },
      select: { movieId: true },
    }),
    loadMovieBatchStates(),
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
  const mySkipSet = new Set(mySkips.map((s) => s.movieId));

  return movies.map((movie) => {
    const rating = ratingByMovie.get(movie.id);
    const batchState = batchStates.get(movie.id) ?? 'locked';
    const hideAggregates = batchState === 'open';
    return {
      ...movie,
      nominationCount: nominationCountByMovie.get(movie.id) ?? 0,
      ratingCount: hideAggregates ? 0 : (rating?.count ?? 0),
      averageScore: hideAggregates ? null : (rating?.avg ?? null),
      userNominated: myNominationSet.has(movie.id),
      userScore: myScoreByMovie.get(movie.id) ?? null,
      batchState,
      userSkipped: mySkipSet.has(movie.id),
    };
  });
}

function isReleased(movie: CandidateMovieStats): boolean {
  return movie.batchState === 'released';
}

function isEligibleToRate(movie: CandidateMovieStats): boolean {
  if (movie.batchState === 'locked') return false;
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
      // Include open-batch scores so users can edit what they just voted.
      return (
        movie.userScore !== null &&
        (movie.batchState === 'released' || movie.batchState === 'open')
      );
    case 'needs_votes':
      // Closed batches only; open lote is voted in /lote.
      return (
        isReleased(movie) &&
        isEligibleToRate(movie) &&
        movie.ratingCount < IMDB_LTA_MIN_RATINGS_TO_QUALIFY
      );
    case 'enough_votes':
      return (
        isReleased(movie) &&
        isEligibleToRate(movie) &&
        movie.ratingCount >= IMDB_LTA_MIN_RATINGS_TO_QUALIFY
      );
    case 'not_seen':
      // Still rateable, including the open batch. Scoring clears the skip.
      return movie.userSkipped && isEligibleToRate(movie);
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
  // Open-batch scores first (what you just voted), then A–Z.
  if (a.batchState !== b.batchState) {
    if (a.batchState === 'open') return -1;
    if (b.batchState === 'open') return 1;
  }
  return a.title.localeCompare(b.title, 'es', { sensitivity: 'base' });
}

export async function listRateableCandidates(
  userId: string,
  options: { filter?: ImdbLtaRatingFilter; page?: number; limit?: number } = {}
): Promise<RateableListResult> {
  const filter = options.filter ?? 'needs_votes';
  const page = options.page ?? 1;
  const limit = options.limit ?? 30;

  const all = await loadCandidateStats(userId);
  const filtered = all
    .filter((m) => matchesRatingFilter(m, filter))
    .toSorted(
      filter === 'mine_done' || filter === 'not_seen'
        ? sortMineDone
        : sortForCoverage
    );

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const start = (page - 1) * limit;
  const movies = filtered.slice(start, start + limit);

  return {
    movies,
    pagination: { page, limit, total, totalPages },
  };
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

  const [rating] = await prisma.$transaction([
    prisma.imdbLtaRating.upsert({
      where: { userId_movieId: { userId, movieId } },
      create: { userId, movieId, score },
      update: { score },
    }),
    prisma.imdbLtaSkip.deleteMany({
      where: { userId, movieId },
    }),
  ]);

  return { id: rating.id, movieId, score: rating.score };
}

export async function markNotSeen(userId: string, movieId: number) {
  await assertRatingPhaseOpen();

  const batchState = await getMovieBatchStateCached(movieId);
  if (batchState === 'locked') {
    throw new Error('Esta película todavía no salió en un lote');
  }

  const nominationCount = await prisma.imdbLtaNomination.count({
    where: { movieId },
  });
  if (nominationCount === 0) {
    throw new Error('Esta película no es candidata de IMDB LTA');
  }

  await prisma.imdbLtaSkip.upsert({
    where: { userId_movieId: { userId, movieId } },
    create: { userId, movieId },
    update: {},
  });

  return { movieId, skipped: true as const };
}

export type OpenBatchDeck = {
  batch: {
    id: number;
    number: number;
    openedAt: Date;
  };
  /** Movies the user can still act on (not rated, not skipped, eligible). */
  deck: CandidateMovieStats[];
  /** Open-batch movies the user already rated or skipped. */
  doneCount: number;
  /** Open-batch movies marked "no vista" and not yet scored. */
  skippedCount: number;
  /** Open-batch movies locked by solo-nomination for this user. */
  ineligibleCount: number;
  totalInBatch: number;
};

/**
 * One-at-a-time voting deck for the current open batch.
 */
export async function listOpenBatchDeck(
  userId: string
): Promise<OpenBatchDeck | null> {
  const open = await getOpenBatch();
  if (!open) return null;

  const all = await loadCandidateStats(userId);
  const byId = new Map(all.map((m) => [m.id, m]));
  const batchMovies = open.movies
    .map((m) => byId.get(m.id))
    .filter((m): m is CandidateMovieStats => Boolean(m));

  const deck: CandidateMovieStats[] = [];
  let doneCount = 0;
  let skippedCount = 0;
  let ineligibleCount = 0;

  for (const movie of batchMovies) {
    if (movie.userScore !== null || movie.userSkipped) {
      doneCount += 1;
      if (movie.userSkipped && movie.userScore === null) skippedCount += 1;
      continue;
    }
    if (movie.userNominated && movie.nominationCount < 2) {
      ineligibleCount += 1;
      continue;
    }
    deck.push(movie);
  }

  return {
    batch: {
      id: open.batch.id,
      number: open.batch.number,
      openedAt: open.batch.openedAt,
    },
    deck,
    doneCount,
    skippedCount,
    ineligibleCount,
    totalInBatch: batchMovies.length,
  };
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

  const [movies, nominationGroups, ratingGroups, batchStates] =
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
      loadMovieBatchStates(),
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
      const batchState = batchStates.get(movie.id) ?? 'locked';
      // Locked and open-batch movies stay off the ranking until their batch closes.
      if (batchState !== 'released') return null;

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

// ---------------------------------------------------------------------------
// Admin — live rating snapshot (who scored what)
// ---------------------------------------------------------------------------

function compareEs(a: string, b: string) {
  return a.localeCompare(b, 'es', { sensitivity: 'base' });
}

const adminMovieSelect = {
  id: true,
  title: true,
  originalTitle: true,
  posterUrl: true,
  imdbId: true,
} as const;

export type AdminRatingVote = {
  userId: string;
  name: string;
  score: number;
  createdAt: Date;
};

export type AdminRatingMovie = {
  id: number;
  title: string;
  originalTitle: string;
  posterUrl: string;
  imdbId: string;
  ratingCount: number;
  averageScore: number | null;
  votes: AdminRatingVote[];
};

export type AdminRatingPersonMovie = {
  movieId: number;
  title: string;
  originalTitle: string;
  posterUrl: string;
  score: number;
  createdAt: Date;
};

export type AdminRatingPerson = {
  userId: string;
  name: string;
  ratingCount: number;
  averageScore: number;
  ratings: AdminRatingPersonMovie[];
};

export type AdminRatingSnapshot = {
  movieCount: number;
  totalRatings: number;
  voterCount: number;
  movies: AdminRatingMovie[];
  people: AdminRatingPerson[];
};

/**
 * Every nominated or rated movie, with each score attached.
 * Call only from admin-gated UI. The public ranking stays aggregated.
 */
export async function listAdminRatingSnapshot(): Promise<AdminRatingSnapshot> {
  const [nominations, ratings] = await Promise.all([
    prisma.imdbLtaNomination.findMany({
      select: {
        movieId: true,
        movie: { select: adminMovieSelect },
      },
    }),
    prisma.imdbLtaRating.findMany({
      select: {
        userId: true,
        movieId: true,
        score: true,
        createdAt: true,
        user: { select: { name: true } },
        movie: { select: adminMovieSelect },
      },
    }),
  ]);

  const movieById = new Map<number, (typeof nominations)[number]['movie']>();
  for (const nomination of nominations) {
    movieById.set(nomination.movie.id, nomination.movie);
  }
  for (const rating of ratings) {
    movieById.set(rating.movie.id, rating.movie);
  }

  const votesByMovie = new Map<number, AdminRatingVote[]>();
  const ratingsByUser = new Map<
    string,
    { name: string; ratings: AdminRatingPersonMovie[] }
  >();

  for (const rating of ratings) {
    const movieVotes = votesByMovie.get(rating.movieId) ?? [];
    movieVotes.push({
      userId: rating.userId,
      name: rating.user.name,
      score: rating.score,
      createdAt: rating.createdAt,
    });
    votesByMovie.set(rating.movieId, movieVotes);

    const person = ratingsByUser.get(rating.userId) ?? {
      name: rating.user.name,
      ratings: [],
    };
    person.ratings.push({
      movieId: rating.movieId,
      title: rating.movie.title,
      originalTitle: rating.movie.originalTitle,
      posterUrl: rating.movie.posterUrl,
      score: rating.score,
      createdAt: rating.createdAt,
    });
    ratingsByUser.set(rating.userId, person);
  }

  const movieIds = new Set<number>([
    ...nominations.map((nomination) => nomination.movieId),
    ...ratings.map((rating) => rating.movieId),
  ]);

  const movies = [...movieIds]
    .flatMap((movieId) => {
      const movie = movieById.get(movieId);
      if (!movie) return [];
      const votes = (votesByMovie.get(movieId) ?? []).toSorted((a, b) => {
        if (a.score !== b.score) return b.score - a.score;
        return compareEs(a.name, b.name);
      });
      const ratingCount = votes.length;
      const averageScore =
        ratingCount === 0
          ? null
          : votes.reduce((sum, vote) => sum + vote.score, 0) / ratingCount;
      return [{ ...movie, ratingCount, averageScore, votes }];
    })
    .toSorted((a, b) => {
      const aRated = a.ratingCount > 0;
      const bRated = b.ratingCount > 0;
      if (aRated !== bRated) return aRated ? -1 : 1;
      if (a.averageScore !== b.averageScore) {
        return (b.averageScore ?? 0) - (a.averageScore ?? 0);
      }
      if (a.ratingCount !== b.ratingCount) return b.ratingCount - a.ratingCount;
      return compareEs(a.title, b.title);
    });

  const people = [...ratingsByUser.entries()]
    .map(([userId, person]) => {
      const personRatings = person.ratings.toSorted((a, b) => {
        if (a.score !== b.score) return b.score - a.score;
        return compareEs(a.title, b.title);
      });
      const ratingCount = personRatings.length;
      return {
        userId,
        name: person.name,
        ratingCount,
        averageScore:
          personRatings.reduce((sum, rating) => sum + rating.score, 0) /
          ratingCount,
        ratings: personRatings,
      };
    })
    .toSorted((a, b) => {
      if (a.averageScore !== b.averageScore) {
        return b.averageScore - a.averageScore;
      }
      if (a.ratingCount !== b.ratingCount) return b.ratingCount - a.ratingCount;
      return compareEs(a.name, b.name);
    });

  return {
    movieCount: movies.length,
    totalRatings: ratings.length,
    voterCount: people.length,
    movies,
    people,
  };
}
