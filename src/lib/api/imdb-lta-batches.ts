import { prisma } from '@/lib/db';
import { env } from '@/env';
import {
  ImdbLtaBatchStatus,
  ImdbLtaPhase,
  type ImdbLtaBatch,
  type Movie,
  type Prisma,
} from '@generated/prisma/client';
import {
  IMDB_LTA_BATCH_MAX_APPEARANCES,
  IMDB_LTA_BATCH_REQUEUE_CAP,
  IMDB_LTA_BATCH_SIZE,
  IMDB_LTA_MIN_RATINGS_TO_QUALIFY,
  IMDB_LTA_SKIP_REQUEUE_THRESHOLD,
} from '@/lib/validations/imdb-lta';
import {
  escapeHtml,
  getLtaTelegramChatId,
  sendTelegramAlbum,
  sendTelegramMessage,
  toTelegramPosterUrl,
} from '@/lib/utils/telegram';

const CONFIG_ID = 1;

async function getRatingPhase(): Promise<ImdbLtaPhase> {
  const config = await prisma.imdbLtaConfig.upsert({
    where: { id: CONFIG_ID },
    create: { id: CONFIG_ID, phase: ImdbLtaPhase.NOMINATION_OPEN },
    update: {},
  });
  return config.phase;
}

export type MovieBatchState = 'locked' | 'open' | 'released';

type Tx = Prisma.TransactionClient;

type CandidateRow = {
  movieId: number;
  title: string;
  nominationCount: number;
  ratingCount: number;
  appearanceCount: number;
  skipCount: number;
};

type BatchMovieCard = Pick<
  Movie,
  'id' | 'title' | 'originalTitle' | 'releaseDate' | 'posterUrl' | 'imdbId'
> & {
  position: number;
};

export type OpenBatchView = {
  batch: ImdbLtaBatch;
  movies: BatchMovieCard[];
};

export type RotateBatchResult = {
  rotated: boolean;
  reason?: string;
  closedBatchId?: number;
  closedBatchNumber?: number;
  openedBatchId?: number;
  openedBatchNumber?: number;
  openedMovieIds?: number[];
  queueEmpty?: boolean;
};

/**
 * Bulk map of movieId → locked | open | released for every nominated candidate.
 * A movie that never appeared in a batch is locked. One currently in the OPEN
 * batch is open. Anything that appeared in at least one CLOSED batch (and is
 * not in the open batch) is released.
 */
export async function loadMovieBatchStates(
  movieIds?: number[]
): Promise<Map<number, MovieBatchState>> {
  const states = new Map<number, MovieBatchState>();

  const nominations = await prisma.imdbLtaNomination.groupBy({
    by: ['movieId'],
    ...(movieIds ? { where: { movieId: { in: movieIds } } } : {}),
  });

  for (const row of nominations) {
    states.set(row.movieId, 'locked');
  }

  const batchMovies = await prisma.imdbLtaBatchMovie.findMany({
    where: movieIds ? { movieId: { in: movieIds } } : undefined,
    select: {
      movieId: true,
      batch: { select: { status: true } },
    },
  });

  for (const row of batchMovies) {
    if (row.batch.status === ImdbLtaBatchStatus.OPEN) {
      states.set(row.movieId, 'open');
    } else if (states.get(row.movieId) !== 'open') {
      states.set(row.movieId, 'released');
    }
  }

  return states;
}

export async function getMovieBatchState(
  movieId: number
): Promise<MovieBatchState> {
  const states = await loadMovieBatchStates([movieId]);
  return states.get(movieId) ?? 'locked';
}

export async function getOpenBatch(): Promise<OpenBatchView | null> {
  const batch = await prisma.imdbLtaBatch.findFirst({
    where: { status: ImdbLtaBatchStatus.OPEN },
    include: {
      movies: {
        orderBy: { position: 'asc' },
        include: {
          movie: {
            select: {
              id: true,
              title: true,
              originalTitle: true,
              releaseDate: true,
              posterUrl: true,
              imdbId: true,
            },
          },
        },
      },
    },
  });

  if (!batch) return null;

  return {
    batch,
    movies: batch.movies.map((row) => ({
      ...row.movie,
      position: row.position,
    })),
  };
}

async function loadCandidateRows(tx: Tx): Promise<CandidateRow[]> {
  const [nominationGroups, ratingGroups, appearanceGroups, skipGroups] =
    await Promise.all([
      tx.imdbLtaNomination.groupBy({
        by: ['movieId'],
        _count: { _all: true },
      }),
      tx.imdbLtaRating.groupBy({
        by: ['movieId'],
        _count: { _all: true },
      }),
      tx.imdbLtaBatchMovie.groupBy({
        by: ['movieId'],
        _count: { _all: true },
      }),
      tx.imdbLtaSkip.groupBy({
        by: ['movieId'],
        _count: { _all: true },
      }),
    ]);

  const movieIds = nominationGroups.map((g) => g.movieId);
  if (movieIds.length === 0) return [];

  const movies = await tx.movie.findMany({
    where: { id: { in: movieIds } },
    select: { id: true, title: true },
  });
  const titleById = new Map(movies.map((m) => [m.id, m.title]));
  const ratingById = new Map(
    ratingGroups.map((g) => [g.movieId, g._count._all])
  );
  const appearanceById = new Map(
    appearanceGroups.map((g) => [g.movieId, g._count._all])
  );
  const skipById = new Map(skipGroups.map((g) => [g.movieId, g._count._all]));

  return nominationGroups.map((g) => ({
    movieId: g.movieId,
    title: titleById.get(g.movieId) ?? '',
    nominationCount: g._count._all,
    ratingCount: ratingById.get(g.movieId) ?? 0,
    appearanceCount: appearanceById.get(g.movieId) ?? 0,
    skipCount: skipById.get(g.movieId) ?? 0,
  }));
}

function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

/**
 * Pure picker used by rotateBatch. Exported for unit tests.
 * Re-queued and never-batched movies stay on the same eligibility rules,
 * but which ones fill the batch — and the order they appear in — is random.
 */
export function pickNextBatchMovieIds(
  candidates: CandidateRow[],
  options: {
    activeRaterCount: number;
    size?: number;
    requeueCap?: number;
    maxAppearances?: number;
    skipThreshold?: number;
    random?: () => number;
  }
): number[] {
  const size = options.size ?? IMDB_LTA_BATCH_SIZE;
  const requeueCap = options.requeueCap ?? IMDB_LTA_BATCH_REQUEUE_CAP;
  const maxAppearances =
    options.maxAppearances ?? IMDB_LTA_BATCH_MAX_APPEARANCES;
  const skipThreshold =
    options.skipThreshold ?? IMDB_LTA_SKIP_REQUEUE_THRESHOLD;
  const activeRaterCount = Math.max(0, options.activeRaterCount);
  const random = options.random ?? Math.random;

  const neverBatched = shuffle(
    candidates.filter((c) => c.appearanceCount === 0),
    random
  );

  const requeue = shuffle(
    candidates.filter((c) => {
      if (c.appearanceCount === 0) return false;
      if (c.appearanceCount >= maxAppearances) return false;
      if (c.ratingCount >= IMDB_LTA_MIN_RATINGS_TO_QUALIFY) return false;
      if (
        activeRaterCount > 0 &&
        c.skipCount / activeRaterCount >= skipThreshold
      ) {
        return false;
      }
      return true;
    }),
    random
  );

  const picked: number[] = [];
  for (const row of requeue) {
    if (picked.length >= requeueCap) break;
    if (picked.length >= size) break;
    picked.push(row.movieId);
  }
  for (const row of neverBatched) {
    if (picked.length >= size) break;
    picked.push(row.movieId);
  }

  return shuffle(picked, random);
}

async function pickNextBatch(tx: Tx): Promise<number[]> {
  const [candidates, activeRaterCount] = await Promise.all([
    loadCandidateRows(tx),
    tx.imdbLtaRating
      .groupBy({ by: ['userId'] })
      .then((rows) => rows.length),
  ]);

  return pickNextBatchMovieIds(candidates, { activeRaterCount });
}

/**
 * Close the current open batch (if any) and open the next one.
 * Admin-only in practice — called from the hub "Rotar lote ahora" action.
 * There is no cron; rotation is always manual.
 */
export async function rotateBatch(): Promise<RotateBatchResult> {
  const phase = await getRatingPhase();
  if (phase !== ImdbLtaPhase.RATING_OPEN) {
    return {
      rotated: false,
      reason: `Phase is ${phase}; batches only rotate while RATING_OPEN`,
    };
  }

  return prisma.$transaction(async (tx) => {
    const open = await tx.imdbLtaBatch.findFirst({
      where: { status: ImdbLtaBatchStatus.OPEN },
    });

    const now = new Date();

    let closedBatchId: number | undefined;
    let closedBatchNumber: number | undefined;

    if (open) {
      await tx.imdbLtaBatch.update({
        where: { id: open.id },
        data: {
          status: ImdbLtaBatchStatus.CLOSED,
          closedAt: now,
        },
      });
      closedBatchId = open.id;
      closedBatchNumber = open.number;
    }

    const movieIds = await pickNextBatch(tx);
    if (movieIds.length === 0) {
      return {
        rotated: Boolean(closedBatchId),
        reason: 'No remaining candidates for a new batch',
        closedBatchId,
        closedBatchNumber,
        queueEmpty: true,
      };
    }

    const last = await tx.imdbLtaBatch.findFirst({
      orderBy: { number: 'desc' },
      select: { number: true },
    });
    const nextNumber = (last?.number ?? 0) + 1;

    const created = await tx.imdbLtaBatch.create({
      data: {
        number: nextNumber,
        status: ImdbLtaBatchStatus.OPEN,
        openedAt: now,
        movies: {
          create: movieIds.map((movieId, index) => ({
            movieId,
            position: index + 1,
          })),
        },
      },
    });

    return {
      rotated: true,
      closedBatchId,
      closedBatchNumber,
      openedBatchId: created.id,
      openedBatchNumber: created.number,
      openedMovieIds: movieIds,
    };
  });
}

type ClosedBatchStats = {
  movieId: number;
  title: string;
  year: number | null;
  ratingCount: number;
  averageScore: number | null;
  scoreSpread: number | null;
  qualified: boolean;
  requeued: boolean;
};

async function loadClosedBatchStats(
  batchId: number
): Promise<ClosedBatchStats[]> {
  const rows = await prisma.imdbLtaBatchMovie.findMany({
    where: { batchId },
    orderBy: { position: 'asc' },
    include: {
      movie: {
        select: {
          id: true,
          title: true,
          releaseDate: true,
          imdbLtaRatings: { select: { score: true } },
        },
      },
    },
  });

  return rows.map((row) => {
    const scores = row.movie.imdbLtaRatings.map((r) => r.score);
    const ratingCount = scores.length;
    const averageScore =
      ratingCount === 0
        ? null
        : scores.reduce((sum, s) => sum + s, 0) / ratingCount;
    const scoreSpread =
      ratingCount >= 3 ? Math.max(...scores) - Math.min(...scores) : null;
    const year = (() => {
      try {
        return row.movie.releaseDate.getFullYear();
      } catch {
        return null;
      }
    })();

    return {
      movieId: row.movie.id,
      title: row.movie.title,
      year,
      ratingCount,
      averageScore,
      scoreSpread,
      qualified: ratingCount >= IMDB_LTA_MIN_RATINGS_TO_QUALIFY,
      requeued:
        ratingCount < IMDB_LTA_MIN_RATINGS_TO_QUALIFY && ratingCount >= 0,
    };
  });
}

function formatClosedResultsMessage(
  batchNumber: number,
  stats: ClosedBatchStats[]
): string {
  const lines = stats.map((s) => {
    const avg =
      s.averageScore === null ? '—' : s.averageScore.toFixed(2);
    const flag = s.qualified
      ? '✅'
      : s.requeued
        ? '↩️'
        : '·';
    return `${flag} <b>${escapeHtml(s.title)}</b>${
      s.year ? ` (${s.year})` : ''
    }: ${avg} · ${s.ratingCount} voto${s.ratingCount === 1 ? '' : 's'}`;
  });

  const divisive = stats
    .filter((s) => s.scoreSpread !== null)
    .toSorted((a, b) => (b.scoreSpread ?? 0) - (a.scoreSpread ?? 0))[0];

  const qualifiedCount = stats.filter((s) => s.qualified).length;
  const requeueCount = stats.filter(
    (s) => !s.qualified && s.requeued
  ).length;

  let footer = `\n\n${qualifiedCount} con promedio${
    qualifiedCount === 1 ? '' : 's'
  } (≥${IMDB_LTA_MIN_RATINGS_TO_QUALIFY} votos).`;
  if (requeueCount > 0) {
    footer += ` ${requeueCount} vuelven a la cola.`;
  }
  if (divisive) {
    footer += `\n🔥 La más polémica: <b>${escapeHtml(divisive.title)}</b> (spread ${divisive.scoreSpread}).`;
  }

  return `📊 <b>Resultados · Lote #${batchNumber}</b>\n\n${lines.join(
    '\n'
  )}${footer}`;
}

function formatNewBatchCaption(
  batchNumber: number,
  movies: BatchMovieCard[]
): string {
  const list = movies
    .map(
      (m, i) =>
        `${i + 1}. ${escapeHtml(m.title)}${
          (() => {
            try {
              return ` (${m.releaseDate.getFullYear()})`;
            } catch {
              return '';
            }
          })()
        }`
    )
    .join('\n');

  return `🎬 <b>IMDB LTA · Lote #${batchNumber}</b>\nDura ~2 días hasta el próximo lote.\n\n${list}`;
}

async function announceClosedBatch(batchId: number, batchNumber: number) {
  const stats = await loadClosedBatchStats(batchId);
  if (stats.length === 0) return;

  await sendTelegramMessage(formatClosedResultsMessage(batchNumber, stats), {
    chatId: getLtaTelegramChatId(),
  });
}

async function announceOpenBatch(batch: OpenBatchView) {
  const chatId = getLtaTelegramChatId();
  const voteUrl = `${env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')}/imdb-lta/lote`;
  // Telegram inline URL buttons require https. Local http://localhost fails the API.
  const canUseUrlButton = voteUrl.startsWith('https://');
  const voteBody = canUseUrlButton
    ? `🗳️ <b>Votá el lote #${batch.batch.number}</b>\nTenés ~2 días antes de que salga el próximo lote (igual después podés revisar y cambiar puntajes).\n\nTip: abrilo en el navegador si Telegram te bloquea el login.`
    : `🗳️ <b>Votá el lote #${batch.batch.number}</b>\nTenés ~2 días antes de que salga el próximo lote.\n\nAbrí en esta máquina:\n<code>${escapeHtml(voteUrl)}</code>`;

  // Vote message first so a bad URL fails before we post the album.
  await sendTelegramMessage(voteBody, {
    chatId,
    ...(canUseUrlButton
      ? {
          replyMarkup: {
            inline_keyboard: [[{ text: 'Votar el lote', url: voteUrl }]],
          },
        }
      : {}),
  });

  const caption = formatNewBatchCaption(batch.batch.number, batch.movies);

  const photos = batch.movies
    .map((m) => {
      const url = toTelegramPosterUrl(m.posterUrl);
      return url ? { url, caption: undefined as string | undefined } : null;
    })
    .filter((p): p is { url: string; caption: string | undefined } =>
      Boolean(p)
    );

  if (photos.length > 0) {
    photos[0].caption = caption;
    await sendTelegramAlbum(photos, { chatId });
  } else {
    await sendTelegramMessage(caption, { chatId });
  }
}

/**
 * Posts Telegram announcements for any batch that has not been announced yet
 * (closed → results, open → album + vote button). Marks announcedAt only after
 * a successful post so a failed send retries on the next cron run.
 */
export async function announcePendingBatches(): Promise<{
  announced: number;
  errors: string[];
}> {
  const pending = await prisma.imdbLtaBatch.findMany({
    where: { announcedAt: null },
    orderBy: { number: 'asc' },
  });

  let announced = 0;
  const errors: string[] = [];

  for (const batch of pending) {
    try {
      if (batch.status === ImdbLtaBatchStatus.CLOSED) {
        await announceClosedBatch(batch.id, batch.number);
      } else {
        const openView = await getOpenBatch();
        if (!openView || openView.batch.id !== batch.id) {
          throw new Error(`Open batch #${batch.number} not found`);
        }
        await announceOpenBatch(openView);
      }

      await prisma.imdbLtaBatch.update({
        where: { id: batch.id },
        data: { announcedAt: new Date() },
      });
      announced += 1;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown Telegram error';
      errors.push(`batch #${batch.number}: ${message}`);
      // Stop so later batches keep announcedAt null and retry together.
      break;
    }
  }

  return { announced, errors };
}

export async function announceQueueEmpty(): Promise<void> {
  await sendTelegramMessage(
    '🏁 <b>IMDB LTA</b>\nCerramos el último lote. No quedan más películas para lotear. Seguí revisando puntajes en la web.',
    { chatId: getLtaTelegramChatId() }
  );
}
