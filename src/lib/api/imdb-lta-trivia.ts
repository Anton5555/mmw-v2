import {
  ImdbLtaTriviaStatus,
  type ImdbLtaTriviaGame,
  type Movie,
  type User,
} from '@generated/prisma/client';
import { prisma } from '@/lib/db';
import {
  getMovieBackdrops,
  getMovieById,
  getMovieTriviaDetails,
  type MovieTriviaDetails,
  type TMDBBackdrop,
} from '@/lib/tmdb';
import {
  escapeHtml,
  getLtaTelegramChatId,
  sendTelegramMessage,
  sendTelegramPhotoUpload,
} from '@/lib/utils/telegram';
import { TRIVIA_IMAGE_STEP_COUNT } from '@/lib/utils/trivia-image-constants';

async function loadTriviaImage() {
  return import('@/lib/utils/trivia-image');
}

export type TriviaClue = {
  key: string;
  label: string;
  text: string;
};

export type TriviaCluesSnapshot = {
  clues: TriviaClue[];
};

export type TriviaGameView = ImdbLtaTriviaGame & {
  movie: Pick<
    Movie,
    | 'id'
    | 'title'
    | 'originalTitle'
    | 'releaseDate'
    | 'posterUrl'
    | 'imdbId'
    | 'tmdbId'
  >;
  winner: Pick<User, 'id' | 'name'> | null;
  createdBy: Pick<User, 'id' | 'name'>;
  cluesSnapshot: TriviaCluesSnapshot;
};

export type TriviaScoreboardRow = {
  userId: string;
  name: string;
  wins: number;
};

export type TriviaWinnerOption = {
  userId: string;
  name: string;
};

const OPEN_STATUSES = [
  ImdbLtaTriviaStatus.DRAFT,
  ImdbLtaTriviaStatus.ACTIVE,
] as const;

const BACKDROP_CANDIDATE_CAP = 5;
const KEYWORD_CAP = 5;

const gameInclude = {
  movie: {
    select: {
      id: true,
      title: true,
      originalTitle: true,
      releaseDate: true,
      posterUrl: true,
      imdbId: true,
      tmdbId: true,
    },
  },
  winner: { select: { id: true, name: true } },
  createdBy: { select: { id: true, name: true } },
} as const;

function parseClues(raw: unknown): TriviaCluesSnapshot {
  let value = raw;
  if (typeof raw === 'string') {
    try {
      value = JSON.parse(raw) as unknown;
    } catch {
      return { clues: [] };
    }
  }
  if (
    typeof value === 'object' &&
    value !== null &&
    'clues' in value &&
    Array.isArray((value as TriviaCluesSnapshot).clues)
  ) {
    return value as TriviaCluesSnapshot;
  }
  return { clues: [] };
}

function serializeClues(snapshot: TriviaCluesSnapshot): string {
  return JSON.stringify(snapshot);
}

function toView(
  game: ImdbLtaTriviaGame & {
    movie: TriviaGameView['movie'];
    winner: TriviaGameView['winner'];
    createdBy: TriviaGameView['createdBy'];
  }
): TriviaGameView {
  return {
    ...game,
    cluesSnapshot: parseClues(game.clues),
  };
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: unknown }).code === 'P2002'
  );
}

export function buildTriviaClues(
  details: MovieTriviaDetails
): TriviaClue[] {
  const clues: TriviaClue[] = [];

  const keywords = details.keywords.slice(0, KEYWORD_CAP);
  if (keywords.length > 0) {
    clues.push({
      key: 'keywords',
      label: 'Palabras clave',
      text: keywords.join(' · '),
    });
  }
  if (details.year != null) {
    clues.push({
      key: 'year',
      label: 'Año',
      text: String(details.year),
    });
  }
  if (details.countries.length > 0) {
    clues.push({
      key: 'country',
      label: 'País',
      text: details.countries.join(', '),
    });
  }
  if (details.music.length > 0) {
    clues.push({
      key: 'music',
      label: 'Música',
      text: details.music.join(', '),
    });
  }
  if (details.cinematography.length > 0) {
    clues.push({
      key: 'cinematography',
      label: 'Fotografía',
      text: details.cinematography.join(', '),
    });
  }
  if (details.editing.length > 0) {
    clues.push({
      key: 'editing',
      label: 'Montaje',
      text: details.editing.join(', '),
    });
  }
  if (details.directors.length > 0) {
    clues.push({
      key: 'director',
      label: 'Dirección',
      text: details.directors.join(', '),
    });
  }

  return clues;
}

export function formatTriviaClueMessage(
  clueIndex: number,
  clue: TriviaClue
): string {
  return `Pista ${clueIndex}: <b>${escapeHtml(clue.label)}</b>\n${escapeHtml(clue.text)}`;
}

export function formatTriviaStartCaption(number: number): string {
  return `🎬 <b>Trivia #${number}</b>\n¿Qué película es?`;
}

export function formatTriviaSolvedMessage(input: {
  title: string;
  year: number | null;
  directors: string[];
  winnerName: string | null;
  winnerWins: number | null;
}): string {
  const year = input.year != null ? ` (${input.year})` : '';
  const director =
    input.directors.length > 0
      ? `, de ${escapeHtml(input.directors.join(', '))}`
      : '';
  const answer = `Era <b>${escapeHtml(input.title)}</b>${year}${director}`;

  if (!input.winnerName) {
    return `📭 Nadie la adivinó · ${answer}`;
  }

  const score =
    input.winnerWins != null
      ? ` · ${escapeHtml(input.winnerName)} lleva ${input.winnerWins}`
      : '';
  return `✅ Lo adivinó <b>${escapeHtml(input.winnerName)}</b> · ${answer}${score}`;
}

async function resolveTmdbId(movie: {
  tmdbId: number | null;
  imdbId: string;
}): Promise<number> {
  if (movie.tmdbId) return movie.tmdbId;
  const found = await getMovieById(movie.imdbId);
  if (!found?.id) {
    throw new Error('No se encontró la película en TMDB');
  }
  return found.id;
}

function pickBackdrop(backdrops: TMDBBackdrop[]): TMDBBackdrop {
  if (backdrops.length === 0) {
    throw new Error('Esta película no tiene fotogramas en TMDB');
  }
  const pool = backdrops.slice(0, BACKDROP_CANDIDATE_CAP);
  return pool[Math.floor(Math.random() * pool.length)]!;
}

function randomFocus(): { focusX: number; focusY: number } {
  // Bias toward the center so crops stay interesting.
  return {
    focusX: 0.3 + Math.random() * 0.4,
    focusY: 0.3 + Math.random() * 0.4,
  };
}

async function loadEligibleMovies() {
  return prisma.movie.findMany({
    where: {
      imdbLtaNominations: { some: {} },
      imdbLtaBatchMovies: { none: {} },
      imdbLtaTriviaGames: { none: {} },
    },
    select: {
      id: true,
      title: true,
      originalTitle: true,
      releaseDate: true,
      posterUrl: true,
      imdbId: true,
      tmdbId: true,
    },
  });
}

async function nextTriviaNumber(): Promise<number> {
  const last = await prisma.imdbLtaTriviaGame.findFirst({
    orderBy: { number: 'desc' },
    select: { number: true },
  });
  return (last?.number ?? 0) + 1;
}

async function buildDraftPayload(movie: {
  id: number;
  tmdbId: number | null;
  imdbId: string;
}) {
  const tmdbId = await resolveTmdbId(movie);
  const [backdrops, details] = await Promise.all([
    getMovieBackdrops(tmdbId),
    getMovieTriviaDetails(tmdbId),
  ]);
  if (!details) {
    throw new Error('No se pudieron cargar los datos de TMDB');
  }
  const backdrop = pickBackdrop(backdrops);
  const focus = randomFocus();
  const clues: TriviaCluesSnapshot = {
    clues: buildTriviaClues(details),
  };
  return {
    movieId: movie.id,
    backdropPath: backdrop.file_path,
    focusX: focus.focusX,
    focusY: focus.focusY,
    clues,
  };
}

async function getOpenGame() {
  return prisma.imdbLtaTriviaGame.findFirst({
    where: { status: { in: [...OPEN_STATUSES] } },
    include: gameInclude,
  });
}

export async function getCurrentTriviaGame(): Promise<TriviaGameView | null> {
  const game = await getOpenGame();
  return game ? toView(game) : null;
}

export async function createTriviaDraft(
  createdById: string
): Promise<TriviaGameView> {
  const existing = await getOpenGame();
  if (existing) {
    throw new Error('Ya hay una trivia en curso o en borrador');
  }

  const eligible = await loadEligibleMovies();
  if (eligible.length === 0) {
    throw new Error('No quedan películas sin lotear para la trivia');
  }

  // Try a few times in case a movie has no backdrops.
  const shuffled = [...eligible].sort(() => Math.random() - 0.5);
  let lastError: Error | null = null;

  for (const movie of shuffled.slice(0, 8)) {
    try {
      const payload = await buildDraftPayload(movie);
      const number = await nextTriviaNumber();
      const created = await prisma.imdbLtaTriviaGame.create({
        data: {
          number,
          movieId: payload.movieId,
          status: ImdbLtaTriviaStatus.DRAFT,
          backdropPath: payload.backdropPath,
          focusX: payload.focusX,
          focusY: payload.focusY,
          clues: serializeClues(payload.clues),
          createdById,
        },
        include: gameInclude,
      });
      return toView(created);
    } catch (error) {
      lastError =
        error instanceof Error ? error : new Error('Error al armar el borrador');
      if (isUniqueViolation(error)) {
        throw new Error('Ya hay una trivia en curso o en borrador');
      }
    }
  }

  throw lastError ?? new Error('No se pudo armar un borrador de trivia');
}

export async function discardTriviaDraft(): Promise<void> {
  const game = await getOpenGame();
  if (!game) return;
  if (game.status !== ImdbLtaTriviaStatus.DRAFT) {
    throw new Error('Solo se puede descartar un borrador');
  }
  await prisma.imdbLtaTriviaGame.delete({ where: { id: game.id } });
}

export async function rerollTriviaMovie(
  createdById: string
): Promise<TriviaGameView> {
  const game = await getOpenGame();
  if (!game || game.status !== ImdbLtaTriviaStatus.DRAFT) {
    throw new Error('No hay un borrador para cambiar de película');
  }

  await prisma.imdbLtaTriviaGame.delete({ where: { id: game.id } });
  return createTriviaDraft(createdById);
}

export async function rerollTriviaImage(): Promise<TriviaGameView> {
  const game = await getOpenGame();
  if (!game || game.status !== ImdbLtaTriviaStatus.DRAFT) {
    throw new Error('No hay un borrador para cambiar de imagen');
  }

  const tmdbId = await resolveTmdbId(game.movie);
  const backdrops = await getMovieBackdrops(tmdbId);
  const others = backdrops.filter((b) => b.file_path !== game.backdropPath);
  const pool = others.length > 0 ? others : backdrops;
  const backdrop = pickBackdrop(pool);
  const focus = randomFocus();

  const updated = await prisma.imdbLtaTriviaGame.update({
    where: { id: game.id },
    data: {
      backdropPath: backdrop.file_path,
      focusX: focus.focusX,
      focusY: focus.focusY,
    },
    include: gameInclude,
  });
  return toView(updated);
}

async function renderStepBuffer(
  game: Pick<ImdbLtaTriviaGame, 'backdropPath' | 'focusX' | 'focusY'>,
  step: number
): Promise<Buffer> {
  const { fetchTriviaBackdropBuffer, renderTriviaStep } =
    await loadTriviaImage();
  const source = await fetchTriviaBackdropBuffer(game.backdropPath);
  return renderTriviaStep(
    source,
    { focusX: game.focusX, focusY: game.focusY },
    step
  );
}

export async function startTriviaGame(): Promise<TriviaGameView> {
  const game = await getOpenGame();
  if (!game || game.status !== ImdbLtaTriviaStatus.DRAFT) {
    throw new Error('No hay un borrador para empezar');
  }

  const claimed = await prisma.imdbLtaTriviaGame.updateMany({
    where: {
      id: game.id,
      status: ImdbLtaTriviaStatus.DRAFT,
      imageStep: 0,
    },
    data: {
      status: ImdbLtaTriviaStatus.ACTIVE,
      imageStep: 1,
      startedAt: new Date(),
    },
  });
  if (claimed.count !== 1) {
    throw new Error('La trivia ya fue iniciada');
  }

  try {
    const photo = await renderStepBuffer(game, 1);
    const sent = await sendTelegramPhotoUpload(photo, {
      chatId: getLtaTelegramChatId(),
      caption: formatTriviaStartCaption(game.number),
    });
    const messageId = sent.result?.message_id;
    if (messageId == null) {
      throw new Error('Telegram no devolvió message_id');
    }

    const updated = await prisma.imdbLtaTriviaGame.update({
      where: { id: game.id },
      data: { rootMessageId: messageId },
      include: gameInclude,
    });
    return toView(updated);
  } catch (error) {
    await prisma.imdbLtaTriviaGame.update({
      where: { id: game.id },
      data: {
        status: ImdbLtaTriviaStatus.DRAFT,
        imageStep: 0,
        startedAt: null,
        rootMessageId: null,
      },
    });
    throw error;
  }
}

export async function revealNextImage(): Promise<TriviaGameView> {
  const game = await getOpenGame();
  if (!game || game.status !== ImdbLtaTriviaStatus.ACTIVE) {
    throw new Error('No hay una trivia activa');
  }
  if (game.rootMessageId == null) {
    throw new Error('Falta el mensaje raíz de Telegram');
  }
  if (game.imageStep >= TRIVIA_IMAGE_STEP_COUNT) {
    throw new Error('La imagen ya está completamente revelada');
  }

  const nextStep = game.imageStep + 1;
  const claimed = await prisma.imdbLtaTriviaGame.updateMany({
    where: {
      id: game.id,
      status: ImdbLtaTriviaStatus.ACTIVE,
      imageStep: game.imageStep,
    },
    data: { imageStep: nextStep },
  });
  if (claimed.count !== 1) {
    throw new Error('Otro admin ya reveló este paso');
  }

  try {
    const photo = await renderStepBuffer(game, nextStep);
    await sendTelegramPhotoUpload(photo, {
      chatId: getLtaTelegramChatId(),
      replyToMessageId: game.rootMessageId,
      caption: `Revelación ${nextStep}/${TRIVIA_IMAGE_STEP_COUNT}`,
    });
  } catch (error) {
    await prisma.imdbLtaTriviaGame.update({
      where: { id: game.id },
      data: { imageStep: game.imageStep },
    });
    throw error;
  }

  const updated = await prisma.imdbLtaTriviaGame.findUniqueOrThrow({
    where: { id: game.id },
    include: gameInclude,
  });
  return toView(updated);
}

export async function sendNextClue(): Promise<TriviaGameView> {
  const game = await getOpenGame();
  if (!game || game.status !== ImdbLtaTriviaStatus.ACTIVE) {
    throw new Error('No hay una trivia activa');
  }
  if (game.rootMessageId == null) {
    throw new Error('Falta el mensaje raíz de Telegram');
  }

  const snapshot = parseClues(game.clues);
  if (game.clueStep >= snapshot.clues.length) {
    throw new Error('No quedan más pistas');
  }

  const nextStep = game.clueStep + 1;
  const clue = snapshot.clues[nextStep - 1]!;
  const claimed = await prisma.imdbLtaTriviaGame.updateMany({
    where: {
      id: game.id,
      status: ImdbLtaTriviaStatus.ACTIVE,
      clueStep: game.clueStep,
    },
    data: { clueStep: nextStep },
  });
  if (claimed.count !== 1) {
    throw new Error('Otro admin ya envió esta pista');
  }

  try {
    await sendTelegramMessage(formatTriviaClueMessage(nextStep, clue), {
      chatId: getLtaTelegramChatId(),
      replyToMessageId: game.rootMessageId,
    });
  } catch (error) {
    await prisma.imdbLtaTriviaGame.update({
      where: { id: game.id },
      data: { clueStep: game.clueStep },
    });
    throw error;
  }

  const updated = await prisma.imdbLtaTriviaGame.findUniqueOrThrow({
    where: { id: game.id },
    include: gameInclude,
  });
  return toView(updated);
}

async function finishGame(input: {
  gameId: number;
  winnerUserId: string | null;
  status: typeof ImdbLtaTriviaStatus.SOLVED | typeof ImdbLtaTriviaStatus.ABANDONED;
}): Promise<TriviaGameView> {
  const game = await prisma.imdbLtaTriviaGame.findUnique({
    where: { id: input.gameId },
    include: gameInclude,
  });
  if (!game || game.status !== ImdbLtaTriviaStatus.ACTIVE) {
    throw new Error('No hay una trivia activa');
  }
  if (game.rootMessageId == null) {
    throw new Error('Falta el mensaje raíz de Telegram');
  }

  const claimed = await prisma.imdbLtaTriviaGame.updateMany({
    where: {
      id: game.id,
      status: ImdbLtaTriviaStatus.ACTIVE,
    },
    data: {
      status: input.status,
      winnerUserId: input.winnerUserId,
      finishedAt: new Date(),
      imageStep: Math.max(game.imageStep, TRIVIA_IMAGE_STEP_COUNT),
    },
  });
  if (claimed.count !== 1) {
    throw new Error('La trivia ya fue cerrada');
  }

  try {
    if (game.imageStep < TRIVIA_IMAGE_STEP_COUNT) {
      const photo = await renderStepBuffer(game, TRIVIA_IMAGE_STEP_COUNT);
      await sendTelegramPhotoUpload(photo, {
        chatId: getLtaTelegramChatId(),
        replyToMessageId: game.rootMessageId,
      });
    }

    const snapshot = parseClues(game.clues);
    const directors =
      snapshot.clues.find((c) => c.key === 'director')?.text.split(', ') ??
      [];
    const year =
      Number(
        snapshot.clues.find((c) => c.key === 'year')?.text ??
          game.movie.releaseDate.getUTCFullYear()
      ) || null;

    let winnerName: string | null = null;
    let winnerWins: number | null = null;
    if (input.winnerUserId) {
      const winner = await prisma.user.findUnique({
        where: { id: input.winnerUserId },
        select: { name: true },
      });
      winnerName = winner?.name ?? 'Alguien';
      winnerWins = await prisma.imdbLtaTriviaGame.count({
        where: {
          winnerUserId: input.winnerUserId,
          status: ImdbLtaTriviaStatus.SOLVED,
        },
      });
    }

    await sendTelegramMessage(
      formatTriviaSolvedMessage({
        title: game.movie.title,
        year,
        directors,
        winnerName,
        winnerWins,
      }),
      {
        chatId: getLtaTelegramChatId(),
        replyToMessageId: game.rootMessageId,
      }
    );
  } catch (error) {
    await prisma.imdbLtaTriviaGame.update({
      where: { id: game.id },
      data: {
        status: ImdbLtaTriviaStatus.ACTIVE,
        winnerUserId: null,
        finishedAt: null,
        imageStep: game.imageStep,
      },
    });
    throw error;
  }

  const updated = await prisma.imdbLtaTriviaGame.findUniqueOrThrow({
    where: { id: game.id },
    include: gameInclude,
  });
  return toView(updated);
}

export async function solveTriviaGame(
  winnerUserId: string
): Promise<TriviaGameView> {
  const winner = await prisma.user.findUnique({
    where: { id: winnerUserId },
    select: { id: true },
  });
  if (!winner) {
    throw new Error('Usuario ganador no encontrado');
  }

  const game = await getOpenGame();
  if (!game || game.status !== ImdbLtaTriviaStatus.ACTIVE) {
    throw new Error('No hay una trivia activa');
  }

  return finishGame({
    gameId: game.id,
    winnerUserId,
    status: ImdbLtaTriviaStatus.SOLVED,
  });
}

export async function abandonTriviaGame(): Promise<TriviaGameView> {
  const game = await getOpenGame();
  if (!game || game.status !== ImdbLtaTriviaStatus.ACTIVE) {
    throw new Error('No hay una trivia activa');
  }

  return finishGame({
    gameId: game.id,
    winnerUserId: null,
    status: ImdbLtaTriviaStatus.ABANDONED,
  });
}

export async function listTriviaScoreboard(): Promise<TriviaScoreboardRow[]> {
  const rows = await prisma.imdbLtaTriviaGame.groupBy({
    by: ['winnerUserId'],
    where: {
      status: ImdbLtaTriviaStatus.SOLVED,
      winnerUserId: { not: null },
    },
    _count: { _all: true },
  });

  const userIds = rows
    .map((r) => r.winnerUserId)
    .filter((id): id is string => id != null);
  if (userIds.length === 0) return [];

  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true },
  });
  const nameById = new Map(users.map((u) => [u.id, u.name]));

  return rows
    .filter((r) => r.winnerUserId != null)
    .map((r) => ({
      userId: r.winnerUserId!,
      name: nameById.get(r.winnerUserId!) ?? 'Usuario',
      wins: r._count._all,
    }))
    .toSorted((a, b) => b.wins - a.wins || a.name.localeCompare(b.name));
}

export async function listTriviaWinnerOptions(): Promise<TriviaWinnerOption[]> {
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { imdbLtaNominations: { some: {} } },
        { imdbLtaRatings: { some: {} } },
      ],
    },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });
  return users.map((u) => ({ userId: u.id, name: u.name }));
}

export async function getTriviaGameById(
  gameId: number
): Promise<TriviaGameView | null> {
  const game = await prisma.imdbLtaTriviaGame.findUnique({
    where: { id: gameId },
    include: gameInclude,
  });
  return game ? toView(game) : null;
}
