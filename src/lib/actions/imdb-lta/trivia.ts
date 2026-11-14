'use server';

import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import {
  abandonTriviaGame,
  createTriviaDraft,
  discardTriviaDraft,
  rerollTriviaImage,
  rerollTriviaMovie,
  revealNextImage,
  sendNextClue,
  solveTriviaGame,
  startTriviaGame,
} from '@/lib/api/imdb-lta-trivia';

async function requireAdmin() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error('No autorizado');
  }

  if (session.user.role !== 'admin') {
    throw new Error('Solo admins pueden manejar la trivia');
  }

  return session;
}

function revalidateTrivia() {
  revalidatePath('/imdb-lta/admin/trivia');
  revalidatePath('/imdb-lta/admin');
}

const winnerSchema = z.object({
  winnerUserId: z.string().min(1),
});

export async function createTriviaDraftAction() {
  const session = await requireAdmin();
  const game = await createTriviaDraft(session.user.id);
  revalidateTrivia();
  return { gameId: game.id, number: game.number };
}

export async function discardTriviaDraftAction() {
  await requireAdmin();
  await discardTriviaDraft();
  revalidateTrivia();
  return { ok: true as const };
}

export async function rerollTriviaMovieAction() {
  const session = await requireAdmin();
  const game = await rerollTriviaMovie(session.user.id);
  revalidateTrivia();
  return { gameId: game.id, number: game.number };
}

export async function rerollTriviaImageAction() {
  await requireAdmin();
  const game = await rerollTriviaImage();
  revalidateTrivia();
  return { gameId: game.id };
}

export async function startTriviaGameAction() {
  await requireAdmin();
  const game = await startTriviaGame();
  revalidateTrivia();
  return { gameId: game.id, rootMessageId: game.rootMessageId };
}

export async function revealNextImageAction() {
  await requireAdmin();
  const game = await revealNextImage();
  revalidateTrivia();
  return { imageStep: game.imageStep };
}

export async function sendNextClueAction() {
  await requireAdmin();
  const game = await sendNextClue();
  revalidateTrivia();
  return { clueStep: game.clueStep };
}

export async function solveTriviaGameAction(input: unknown) {
  await requireAdmin();
  const { winnerUserId } = winnerSchema.parse(input);
  const game = await solveTriviaGame(winnerUserId);
  revalidateTrivia();
  return { gameId: game.id, status: game.status };
}

export async function abandonTriviaGameAction() {
  await requireAdmin();
  const game = await abandonTriviaGame();
  revalidateTrivia();
  return { gameId: game.id, status: game.status };
}
