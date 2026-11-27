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
  solveTriviaGame,
  startTriviaGame,
  type TriviaActor,
} from '@/lib/api/imdb-lta-trivia';

async function requireUser() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error('No autorizado');
  }

  return session;
}

async function requireAdmin() {
  const session = await requireUser();

  if (session.user.role !== 'admin') {
    throw new Error('Solo admins pueden manejar la trivia');
  }

  return session;
}

/**
 * Admins, or the member hosting the ACTIVE game. The API checks the host
 * against the game row, so the right ends when the game does.
 */
async function requireTriviaActor(): Promise<TriviaActor> {
  const session = await requireUser();
  return {
    userId: session.user.id,
    isAdmin: session.user.role === 'admin',
  };
}

function revalidateTrivia() {
  revalidatePath('/imdb-lta/admin/trivia');
  revalidatePath('/imdb-lta/admin');
  revalidatePath('/imdb-lta/trivia');
}

const startSchema = z.object({
  gameId: z.number().int().positive(),
  backdropPath: z.string().min(1),
  focusX: z.number().finite(),
  focusY: z.number().finite(),
  hostUserId: z.string().min(1).nullable().default(null),
});

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

export async function startTriviaGameAction(input: unknown) {
  await requireAdmin();
  const { hostUserId, ...expected } = startSchema.parse(input);
  const game = await startTriviaGame(expected, hostUserId);
  revalidateTrivia();
  return { gameId: game.id, rootMessageId: game.rootMessageId };
}

export async function revealNextImageAction() {
  const actor = await requireTriviaActor();
  const game = await revealNextImage(actor);
  revalidateTrivia();
  return { imageStep: game.imageStep };
}

export async function solveTriviaGameAction(input: unknown) {
  const actor = await requireTriviaActor();
  const { winnerUserId } = winnerSchema.parse(input);
  const game = await solveTriviaGame(winnerUserId, actor);
  revalidateTrivia();
  return { gameId: game.id, status: game.status };
}

export async function abandonTriviaGameAction() {
  const actor = await requireTriviaActor();
  const game = await abandonTriviaGame(actor);
  revalidateTrivia();
  return { gameId: game.id, status: game.status };
}
