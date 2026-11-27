import { revalidatePath } from 'next/cache';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  createTriviaDraft: vi.fn(),
  discardTriviaDraft: vi.fn(),
  rerollTriviaMovie: vi.fn(),
  rerollTriviaImage: vi.fn(),
  startTriviaGame: vi.fn(),
  revealNextImage: vi.fn(),
  solveTriviaGame: vi.fn(),
  abandonTriviaGame: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  auth: { api: { getSession: mocks.getSession } },
}));
vi.mock('next/headers', () => ({
  headers: vi.fn(async () => new Headers()),
}));
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));
vi.mock('@/lib/api/imdb-lta-trivia', () => ({
  createTriviaDraft: mocks.createTriviaDraft,
  discardTriviaDraft: mocks.discardTriviaDraft,
  rerollTriviaMovie: mocks.rerollTriviaMovie,
  rerollTriviaImage: mocks.rerollTriviaImage,
  startTriviaGame: mocks.startTriviaGame,
  revealNextImage: mocks.revealNextImage,
  solveTriviaGame: mocks.solveTriviaGame,
  abandonTriviaGame: mocks.abandonTriviaGame,
}));

import {
  abandonTriviaGameAction,
  createTriviaDraftAction,
  revealNextImageAction,
  solveTriviaGameAction,
  startTriviaGameAction,
} from './trivia';

const USER = { user: { id: 'u1', role: 'user' } };
const ADMIN = { user: { id: 'admin1', role: 'admin' } };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getSession.mockResolvedValue(ADMIN);
  mocks.createTriviaDraft.mockResolvedValue({ id: 1, number: 1 });
  mocks.startTriviaGame.mockResolvedValue({ id: 1, rootMessageId: 9 });
  mocks.solveTriviaGame.mockResolvedValue({ id: 1, status: 'SOLVED' });
  mocks.abandonTriviaGame.mockResolvedValue({ id: 1, status: 'ABANDONED' });
});

describe('trivia actions admin guard', () => {
  it.each([
    ['createTriviaDraftAction', () => createTriviaDraftAction()],
    [
      'startTriviaGameAction',
      () =>
        startTriviaGameAction({
          gameId: 1,
          backdropPath: '/frame.jpg',
          focusX: 0.4,
          focusY: 0.6,
        }),
    ],
  ] as const)('%s rejects non-admins', async (_name, run) => {
    mocks.getSession.mockResolvedValue(USER);
    await expect(run()).rejects.toThrow('Solo admins');
    expect(mocks.createTriviaDraft).not.toHaveBeenCalled();
    expect(mocks.startTriviaGame).not.toHaveBeenCalled();
    expect(mocks.solveTriviaGame).not.toHaveBeenCalled();
    expect(mocks.abandonTriviaGame).not.toHaveBeenCalled();
  });

  it('passes members through to the host check in the API', async () => {
    mocks.getSession.mockResolvedValue(USER);
    mocks.revealNextImage.mockResolvedValue({ imageStep: 2 });
    const member = { userId: 'u1', isAdmin: false };
    await revealNextImageAction();
    await solveTriviaGameAction({ winnerUserId: 'u2' });
    await abandonTriviaGameAction();
    expect(mocks.revealNextImage).toHaveBeenCalledWith(member);
    expect(mocks.solveTriviaGame).toHaveBeenCalledWith('u2', member);
    expect(mocks.abandonTriviaGame).toHaveBeenCalledWith(member);
    expect(revalidatePath).toHaveBeenCalledWith('/imdb-lta/trivia');
  });

  it('starts with the picked host', async () => {
    await startTriviaGameAction({
      gameId: 1,
      backdropPath: '/frame.jpg',
      focusX: 0.4,
      focusY: 0.6,
      hostUserId: 'u2',
    });
    expect(mocks.startTriviaGame).toHaveBeenCalledWith(
      { gameId: 1, backdropPath: '/frame.jpg', focusX: 0.4, focusY: 0.6 },
      'u2'
    );
  });

  it('rejects unauthenticated host actions', async () => {
    mocks.getSession.mockResolvedValue(null);
    await expect(revealNextImageAction()).rejects.toThrow('No autorizado');
    expect(mocks.revealNextImage).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated callers', async () => {
    mocks.getSession.mockResolvedValue(null);
    await expect(createTriviaDraftAction()).rejects.toThrow('No autorizado');
  });

  it('creates a draft for admins and revalidates', async () => {
    await expect(createTriviaDraftAction()).resolves.toEqual({
      gameId: 1,
      number: 1,
    });
    expect(mocks.createTriviaDraft).toHaveBeenCalledWith('admin1');
    expect(revalidatePath).toHaveBeenCalledWith('/imdb-lta/admin/trivia');
  });

  it('validates the winner id', async () => {
    await expect(solveTriviaGameAction({})).rejects.toThrow();
    expect(mocks.solveTriviaGame).not.toHaveBeenCalled();
  });
});
