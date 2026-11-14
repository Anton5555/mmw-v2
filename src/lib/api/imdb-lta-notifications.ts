import { prisma } from '@/lib/db';
import {
  escapeHtml,
  getLtaTelegramChatId,
  sendTelegramMessage,
} from '@/lib/utils/telegram';

export function formatWantToWatchMessage(input: {
  userName: string;
  title: string;
  year: number | null;
  otherNames: string[];
}): string {
  const year = input.year ? ` (${input.year})` : '';
  const head = `🍿 <b>${escapeHtml(input.userName)}</b> quiere ver <b>${escapeHtml(input.title)}</b>${year}`;
  if (input.otherNames.length === 0) return head;
  const others = input.otherNames.map(escapeHtml).join(', ');
  return `${head}, también la quieren ver ${others}`;
}

export function formatBatchAllRatedMessage(input: {
  userName: string;
  batchNumber: number;
  finishedCount: number;
  activeRaterCount: number;
}): string {
  const verb = input.finishedCount === 1 ? 'lo hizo' : 'lo hicieron';
  return `🎉 Feliciten a <b>${escapeHtml(input.userName)}</b> que vio y puntuó todas las películas del lote #${input.batchNumber} (solo ${input.finishedCount} de ${input.activeRaterCount} ${verb})`;
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: unknown }).code === 'P2002'
  );
}

async function claimNotification(key: string): Promise<boolean> {
  try {
    await prisma.imdbLtaNotification.create({ data: { key } });
    return true;
  } catch (error) {
    if (isUniqueViolation(error)) return false;
    throw error;
  }
}

async function releaseNotification(key: string): Promise<void> {
  await prisma.imdbLtaNotification.deleteMany({ where: { key } });
}

async function sendClaimed(
  key: string,
  message: string
): Promise<void> {
  const claimed = await claimNotification(key);
  if (!claimed) return;

  try {
    await sendTelegramMessage(message, { chatId: getLtaTelegramChatId() });
  } catch (error) {
    await releaseNotification(key);
    throw error;
  }
}

function movieYear(releaseDate: Date | null | undefined): number | null {
  if (!releaseDate) return null;
  try {
    return releaseDate.getFullYear();
  } catch {
    return null;
  }
}

export async function notifyWantToWatch(
  userId: string,
  movieId: number
): Promise<void> {
  const key = `want:${userId}:${movieId}`;

  const [user, movie, otherPins] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    }),
    prisma.movie.findUnique({
      where: { id: movieId },
      select: { title: true, releaseDate: true },
    }),
    prisma.imdbLtaSkip.findMany({
      where: {
        movieId,
        pinnedAt: { not: null },
        userId: { not: userId },
      },
      select: {
        userId: true,
        user: { select: { name: true } },
      },
      orderBy: { pinnedAt: 'asc' },
    }),
  ]);

  if (!user || !movie) return;

  const message = formatWantToWatchMessage({
    userName: user.name,
    title: movie.title,
    year: movieYear(movie.releaseDate),
    otherNames: otherPins.map((pin) => pin.user.name),
  });

  await sendClaimed(key, message);
}

function countUsersWhoRatedAll(
  ratings: Array<{ userId: string; movieId: number }>,
  movieIds: number[]
): number {
  const needed = movieIds.length;
  if (needed === 0) return 0;

  const ratedByUser = new Map<string, Set<number>>();
  for (const row of ratings) {
    let set = ratedByUser.get(row.userId);
    if (!set) {
      set = new Set();
      ratedByUser.set(row.userId, set);
    }
    set.add(row.movieId);
  }

  let finished = 0;
  for (const set of ratedByUser.values()) {
    if (movieIds.every((id) => set.has(id))) finished += 1;
  }
  return finished;
}

export async function notifyBatchAllRatedIfDone(
  userId: string,
  movieId: number
): Promise<void> {
  const open = await prisma.imdbLtaBatch.findFirst({
    where: { status: 'OPEN' },
    select: {
      id: true,
      number: true,
      movies: { select: { movieId: true } },
    },
  });

  if (!open) return;

  const movieIds = open.movies.map((m) => m.movieId);
  if (!movieIds.includes(movieId)) return;

  const myRatings = await prisma.imdbLtaRating.findMany({
    where: { userId, movieId: { in: movieIds } },
    select: { movieId: true },
  });
  const myRated = new Set(myRatings.map((r) => r.movieId));
  if (!movieIds.every((id) => myRated.has(id))) return;

  const key = `batch-all-rated:${open.id}:${userId}`;

  const [batchRatings, activeRaters, user] = await Promise.all([
    prisma.imdbLtaRating.findMany({
      where: { movieId: { in: movieIds } },
      select: { userId: true, movieId: true },
    }),
    prisma.imdbLtaRating.groupBy({ by: ['userId'] }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    }),
  ]);

  if (!user) return;

  const finishedCount = countUsersWhoRatedAll(batchRatings, movieIds);
  const activeRaterCount = activeRaters.length;

  const message = formatBatchAllRatedMessage({
    userName: user.name,
    batchNumber: open.number,
    finishedCount,
    activeRaterCount,
  });

  await sendClaimed(key, message);
}
