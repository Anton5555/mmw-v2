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
  getMovieTriviaDetails: vi.fn(),
}));

import {
  buildTriviaClues,
  formatTriviaClueMessage,
  formatTriviaScoreboard,
  formatTriviaSolvedMessage,
  formatTriviaStartCaption,
  revealNextImage,
  sendNextClue,
  solveTriviaGame,
} from './imdb-lta-trivia';

const activeGame = {
  id: 1,
  number: 3,
  movieId: 10,
  status: 'ACTIVE',
  backdropPath: '/frame.jpg',
  focusX: 0.5,
  focusY: 0.5,
  imageStep: 1,
  clueStep: 0,
  clues: {
    clues: [
      { key: 'year', label: 'Año', text: '1986' },
      { key: 'director', label: 'Dirección', text: 'John Hughes' },
    ],
  },
  rootMessageId: 99,
  winnerUserId: null,
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
  },
  winner: null,
  createdBy: { id: 'admin1', name: 'Admin' },
};

beforeEach(() => {
  vi.clearAllMocks();
  prisma.imdbLtaTriviaGame.findFirst.mockResolvedValue(activeGame);
  prisma.imdbLtaTriviaGame.updateMany.mockResolvedValue({ count: 1 });
  prisma.imdbLtaTriviaGame.update.mockResolvedValue(activeGame);
  prisma.imdbLtaTriviaGame.findUniqueOrThrow.mockResolvedValue({
    ...activeGame,
    imageStep: 2,
    clueStep: 1,
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

describe('buildTriviaClues', () => {
  it('builds the ladder and skips empty fields', () => {
    expect(
      buildTriviaClues({
        keywords: ['paris', 'cancer', 'waiting', 'singer', 'real time', 'extra'],
        year: 1962,
        countries: ['France'],
        music: [],
        cinematography: ['Jean Rabier'],
        editing: [],
        directors: ['Agnès Varda'],
      })
    ).toEqual([
      {
        key: 'keywords',
        label: 'Palabras clave',
        text: 'paris · cancer · waiting · singer · real time',
      },
      { key: 'year', label: 'Año', text: '1962' },
      { key: 'country', label: 'País', text: 'France' },
      {
        key: 'cinematography',
        label: 'Fotografía',
        text: 'Jean Rabier',
      },
      { key: 'director', label: 'Dirección', text: 'Agnès Varda' },
    ]);
  });
});

describe('format helpers', () => {
  it('formats start caption, clue and solved messages', () => {
    expect(formatTriviaStartCaption(4)).toContain('Trivia #4');
    expect(
      formatTriviaClueMessage(2, { key: 'year', label: 'Año', text: '1986' })
    ).toBe('Pista 2: <b>Año</b>\n1986');
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

describe('revealNextImage step claim', () => {
  it('claims the next step then posts a reply photo', async () => {
    await revealNextImage();
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
    await expect(revealNextImage()).rejects.toThrow('tg down');
    expect(prisma.imdbLtaTriviaGame.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { imageStep: 1 },
    });
  });

  it('rejects when another admin already claimed the step', async () => {
    prisma.imdbLtaTriviaGame.updateMany.mockResolvedValueOnce({ count: 0 });
    await expect(revealNextImage()).rejects.toThrow('Otro admin');
    expect(telegram.sendTelegramPhotoUpload).not.toHaveBeenCalled();
  });
});

describe('sendNextClue step claim', () => {
  it('claims the next clue then posts a reply text', async () => {
    await sendNextClue();
    expect(prisma.imdbLtaTriviaGame.updateMany).toHaveBeenCalledWith({
      where: { id: 1, status: 'ACTIVE', clueStep: 0 },
      data: { clueStep: 1 },
    });
    expect(telegram.sendTelegramMessage).toHaveBeenCalledWith(
      'Pista 1: <b>Año</b>\n1986',
      expect.objectContaining({ replyToMessageId: 99 })
    );
  });

  it('rolls back the clue step when Telegram fails', async () => {
    telegram.sendTelegramMessage.mockRejectedValueOnce(new Error('tg down'));
    await expect(sendNextClue()).rejects.toThrow('tg down');
    expect(prisma.imdbLtaTriviaGame.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { clueStep: 0 },
    });
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

    await solveTriviaGame('u1');

    const message = telegram.sendTelegramMessage.mock.calls.at(-1)?.[0] as string;
    expect(message).toContain('Lo adivinó <b>Juan</b>');
    expect(message).toContain('1. Juan — 2 aciertos');
    expect(message).toContain('2. Ana — 1 acierto');
  });
});
