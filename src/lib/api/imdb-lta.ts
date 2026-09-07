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
  type ImdbLtaPhaseValue,
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
 * Admin-only phase update. No UI in Phase 1 — used for verification / future admin page.
 */
export async function updateImdbLtaPhase(phase: ImdbLtaPhaseValue) {
  await getOrCreateConfig();
  return prisma.imdbLtaConfig.update({
    where: { id: CONFIG_ID },
    data: { phase: phase as ImdbLtaPhase },
  });
}
