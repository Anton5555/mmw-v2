import { beforeEach, describe, expect, it, vi } from 'vitest';

const prisma = vi.hoisted(() => ({
  imdbLtaTriviaGame: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    findUniqueOrThrow: vi.fn(),
    updateMany: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
    groupBy: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },
}));

const telegram = vi.hoisted(() => ({
  sendTelegramMessage: vi.fn(),
  sendTelegramPhotoUpload: vi.fn(),
}));

vi.mock('@/lib/db', () => ({ prisma }));

vi.mock('@/lib/utils/telegram', () => ({
  escapeHtml: (text: string) =>
    text
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;'),
  getLtaTelegramChatId: () => 'chat-lta',
  sendTelegramMessage: telegram.sendTelegramMessage,
  sendTelegramPhotoUpload: telegram.sendTelegramPhotoUpload,
}));

vi.mock('@/lib/utils/trivia-image-constants', async () => {
  const actual = await vi.importActual<
    typeof import('@/lib/utils/trivia-image-constants')
  >('@/lib/utils/trivia-image-constants');
  return actual;
});

vi.mock('@/lib/utils/trivia-image', () => ({
  TRIVIA_IMAGE_STEP_COUNT: 5,
  fetchTriviaBackdropBuffer: vi.fn(async () => Buffer.from('src')),
  renderTriviaStep: vi.fn(async () => Buffer.from('jpeg')),
}));

vi.mock('@/lib/tmdb', () => ({
  getMovieBackdrops: vi.fn(),
  getMovieById: vi.fn(),
}));

import {
  abandonTriviaGame,
  canRunTriviaGame,
  formatTriviaScoreboard,
  formatTriviaSolvedMessage,
  formatTriviaStartCaption,
  revealNextImage,
  solveTriviaGame,
  startTriviaGame,
} from './imdb-lta-trivia';
import { renderTriviaStep } from '@/lib/utils/trivia-image';

const activeGame = {
  id: 1,
  number: 3,
  movieId: 10,
  status: 'ACTIVE',
  backdropPath: '/frame.jpg',
  focusX: 0.5,
  focusY: 0.5,
  imageStep: 1,
  rootMessageId: 99,
  winnerUserId: null,
  hostUserId: null as string | null,
  createdById: 'admin1',
  createdAt: new Date(),
  startedAt: new Date(),
  finishedAt: null,
  movie: {
    id: 10,
    title: 'Ferris',
    originalTitle: 'Ferris',
    releaseDate: new Date('1986-06-11'),
    posterUrl: '/p.jpg',
    imdbId: 'tt0091042',
    tmdbId: 9377,
    directors: [{ director: { name: 'John Hughes' } }],
  },
  winner: null,
  createdBy: { id: 'admin1', name: 'Admin' },
};

const ADMIN_ACTOR = { userId: 'admin1', isAdmin: true };

beforeEach(() => {
  vi.clearAllMocks();
  prisma.imdbLtaTriviaGame.findFirst.mockResolvedValue(activeGame);
  prisma.imdbLtaTriviaGame.updateMany.mockResolvedValue({ count: 1 });
  prisma.imdbLtaTriviaGame.update.mockResolvedValue(activeGame);
  prisma.imdbLtaTriviaGame.findUniqueOrThrow.mockResolvedValue({
    ...activeGame,
    imageStep: 2,
  });
  telegram.sendTelegramPhotoUpload.mockResolvedValue({
    ok: true,
    result: { message_id: 100 },
  });
  telegram.sendTelegramMessage.mockResolvedValue({
    ok: true,
    result: { message_id: 101 },
  });
});

describe('format helpers', () => {
  it('formats start caption, and solved messages', () => {
    expect(formatTriviaStartCaption(4)).toContain('Trivia #4');
    const solved = formatTriviaSolvedMessage({
      title: 'Heat',
      year: 1995,
      directors: ['Michael Mann'],
      winnerName: 'Juan',
      winnerWins: 3,
      scoreboard: [
        { name: 'Juan', wins: 3 },
        { name: 'Ana & Co', wins: 1 },
      ],
    });
    expect(solved).toContain('Lo adivinó <b>Juan</b>');
    expect(solved).toContain('<b>Marcador</b>');
    expect(solved).toContain('1. Juan — 3 aciertos');
    expect(solved).toContain('2. Ana &amp; Co — 1 acierto');
    const abandoned = formatTriviaSolvedMessage({
      title: 'Heat',
      year: 1995,
      directors: ['Michael Mann'],
      winnerName: null,
      winnerWins: null,
      scoreboard: [{ name: 'Juan', wins: 3 }],
    });
    expect(abandoned).toContain('Nadie la adivinó');
    expect(abandoned).not.toContain('Marcador');
  });

  it('formats an empty scoreboard as nothing', () => {
    expect(formatTriviaScoreboard([])).toBe('');
  });
});

describe('startTriviaGame preview guard', () => {
  const draftGame = {
    ...activeGame,
    status: 'DRAFT',
    imageStep: 0,
    rootMessageId: null,
    startedAt: null,
    focusX: 0.42,
    focusY: 0.61,
  };
  const previewed = {
    gameId: 1,
    backdropPath: '/frame.jpg',
    focusX: 0.42,
    focusY: 0.61,
  };

  beforeEach(() => {
    prisma.imdbLtaTriviaGame.findFirst.mockResolvedValue(draftGame);
  });

  it('claims with the previewed crop and renders that crop', async () => {
    await startTriviaGame(previewed);
    expect(prisma.imdbLtaTriviaGame.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 1,
          status: 'DRAFT',
          imageStep: 0,
          backdropPath: '/frame.jpg',
          focusX: { gte: 0.42 - 1e-9, lte: 0.42 + 1e-9 },
          focusY: { gte: 0.61 - 1e-9, lte: 0.61 + 1e-9 },
        },
        data: expect.objectContaining({ hostUserId: null }),
      })
    );
    expect(renderTriviaStep).toHaveBeenCalledWith(
      expect.any(Buffer),
      { focusX: 0.42, focusY: 0.61 },
      1
    );
  });

  it.each([
    ['focus moved', { focusX: 0.5 }],
    ['other still', { backdropPath: '/other.jpg' }],
    ['other draft', { gameId: 2 }],
  ])('refuses to send when the %s', async (_label, change) => {
    await expect(
      startTriviaGame({ ...previewed, ...change })
    ).rejects.toThrow('El borrador cambió');
    expect(prisma.imdbLtaTriviaGame.updateMany).not.toHaveBeenCalled();
    expect(telegram.sendTelegramPhotoUpload).not.toHaveBeenCalled();
  });

  it('accepts a focus Postgres rounded to 15 digits', async () => {
    // Production returns float8 with extra_float_digits = 0.
    prisma.imdbLtaTriviaGame.findFirst.mockResolvedValue({
      ...draftGame,
      focusX: 0.48372615234567812,
    });
    await startTriviaGame({ ...previewed, focusX: 0.483726152345678 });
    expect(prisma.imdbLtaTriviaGame.updateMany).toHaveBeenCalled();
    expect(telegram.sendTelegramPhotoUpload).toHaveBeenCalled();
  });

  it('saves the host picked at start', async () => {
    prisma.user.findUnique.mockResolvedValueOnce({ id: 'host1' });
    await startTriviaGame(previewed, 'host1');
    expect(prisma.imdbLtaTriviaGame.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ hostUserId: 'host1' }),
      })
    );
  });

  it('refuses an unknown host before claiming', async () => {
    prisma.user.findUnique.mockResolvedValueOnce(null);
    await expect(startTriviaGame(previewed, 'ghost')).rejects.toThrow(
      'conducir'
    );
    expect(prisma.imdbLtaTriviaGame.updateMany).not.toHaveBeenCalled();
  });

  it('clears the host when Telegram fails on start', async () => {
    prisma.user.findUnique.mockResolvedValueOnce({ id: 'host1' });
    telegram.sendTelegramPhotoUpload.mockRejectedValueOnce(new Error('tg down'));
    await expect(startTriviaGame(previewed, 'host1')).rejects.toThrow('tg down');
    expect(prisma.imdbLtaTriviaGame.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: expect.objectContaining({ status: 'DRAFT', hostUserId: null }),
    });
  });

  it('refuses when a reroll lands between the read and the claim', async () => {
    prisma.imdbLtaTriviaGame.updateMany.mockResolvedValueOnce({ count: 0 });
    await expect(startTriviaGame(previewed)).rejects.toThrow(
      'El borrador cambió'
    );
    expect(telegram.sendTelegramPhotoUpload).not.toHaveBeenCalled();
  });
});

describe('revealNextImage step claim', () => {
  it('claims the next step then posts a reply photo', async () => {
    await revealNextImage(ADMIN_ACTOR);
    expect(prisma.imdbLtaTriviaGame.updateMany).toHaveBeenCalledWith({
      where: { id: 1, status: 'ACTIVE', imageStep: 1 },
      data: { imageStep: 2 },
    });
    expect(telegram.sendTelegramPhotoUpload).toHaveBeenCalledWith(
      expect.any(Buffer),
      expect.objectContaining({
        replyToMessageId: 99,
        chatId: 'chat-lta',
      })
    );
  });

  it('rolls back the step when Telegram fails', async () => {
    telegram.sendTelegramPhotoUpload.mockRejectedValueOnce(new Error('tg down'));
    await expect(revealNextImage(ADMIN_ACTOR)).rejects.toThrow('tg down');
    expect(prisma.imdbLtaTriviaGame.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { imageStep: 1 },
    });
  });

  it('rejects when someone already claimed the step', async () => {
    prisma.imdbLtaTriviaGame.updateMany.mockResolvedValueOnce({ count: 0 });
    await expect(revealNextImage(ADMIN_ACTOR)).rejects.toThrow('Alguien ya');
    expect(telegram.sendTelegramPhotoUpload).not.toHaveBeenCalled();
  });
});

describe('solveTriviaGame', () => {
  it('includes the current scoreboard in the winner message', async () => {
    const finishedGame = { ...activeGame, status: 'SOLVED', imageStep: 5 };
    prisma.imdbLtaTriviaGame.findUnique.mockResolvedValue({
      ...activeGame,
      imageStep: 5,
    });
    prisma.imdbLtaTriviaGame.findUniqueOrThrow.mockResolvedValue(finishedGame);
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', name: 'Juan' });
    prisma.imdbLtaTriviaGame.count.mockResolvedValue(2);
    prisma.imdbLtaTriviaGame.groupBy.mockResolvedValue([
      { winnerUserId: 'u1', _count: { _all: 2 } },
      { winnerUserId: 'u2', _count: { _all: 1 } },
    ]);
    prisma.user.findMany.mockResolvedValue([
      { id: 'u1', name: 'Juan' },
      { id: 'u2', name: 'Ana' },
    ]);

    await solveTriviaGame('u1', ADMIN_ACTOR);

    const message = telegram.sendTelegramMessage.mock.calls.at(-1)?.[0] as string;
    expect(message).toContain('Lo adivinó <b>Juan</b>');
    // Year and director come from the movie row, not from a clue list.
    expect(message).toContain('Era <b>Ferris</b> (1986), de John Hughes');
    expect(message).toContain('1. Juan — 2 aciertos');
    expect(message).toContain('2. Ana — 1 acierto');
  });
});

describe('trivia host permission', () => {
  const HOST = { userId: 'host1', isAdmin: false };
  const OTHER = { userId: 'u9', isAdmin: false };
  const hostedGame = { ...activeGame, hostUserId: 'host1' };

  it('lets the host run only their ACTIVE game', () => {
    expect(canRunTriviaGame(hostedGame as never, HOST)).toBe(true);
    expect(canRunTriviaGame(hostedGame as never, OTHER)).toBe(false);
    expect(
      canRunTriviaGame({ status: 'SOLVED', hostUserId: 'host1' } as never, HOST)
    ).toBe(false);
    expect(
      canRunTriviaGame({ status: 'DRAFT', hostUserId: 'host1' } as never, HOST)
    ).toBe(false);
    expect(canRunTriviaGame(activeGame as never, HOST)).toBe(false);
  });

  it('lets the host reveal the next image', async () => {
    prisma.imdbLtaTriviaGame.findFirst.mockResolvedValue(hostedGame);
    await revealNextImage(HOST);
    expect(prisma.imdbLtaTriviaGame.updateMany).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['revealNextImage', () => revealNextImage(OTHER)],
    ['solveTriviaGame', () => solveTriviaGame('u2', OTHER)],
    ['abandonTriviaGame', () => abandonTriviaGame(OTHER)],
  ] as const)('%s refuses a member who is not the host', async (_n, run) => {
    prisma.imdbLtaTriviaGame.findFirst.mockResolvedValue(hostedGame);
    prisma.user.findUnique.mockResolvedValue({ id: 'u2' });
    await expect(run()).rejects.toThrow('No estás conduciendo');
    expect(prisma.imdbLtaTriviaGame.updateMany).not.toHaveBeenCalled();
    expect(telegram.sendTelegramMessage).not.toHaveBeenCalled();
    expect(telegram.sendTelegramPhotoUpload).not.toHaveBeenCalled();
  });

  it('refuses the host as winner', async () => {
    prisma.imdbLtaTriviaGame.findFirst.mockResolvedValue(hostedGame);
    prisma.user.findUnique.mockResolvedValue({ id: 'host1' });
    await expect(solveTriviaGame('host1', HOST)).rejects.toThrow(
      'no puede ganarla'
    );
    expect(prisma.imdbLtaTriviaGame.updateMany).not.toHaveBeenCalled();
  });
});
