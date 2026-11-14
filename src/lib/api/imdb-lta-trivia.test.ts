import { beforeEach, describe, expect, it, vi } from 'vitest';

const prisma = vi.hoisted(() => ({
  imdbLtaTriviaGame: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    findUniqueOrThrow: vi.fn(),
    updateMany: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
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
  formatTriviaSolvedMessage,
  formatTriviaStartCaption,
  revealNextImage,
  sendNextClue,
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
    expect(
      formatTriviaSolvedMessage({
        title: 'Heat',
        year: 1995,
        directors: ['Michael Mann'],
        winnerName: 'Juan',
        winnerWins: 3,
      })
    ).toContain('Lo adivinó <b>Juan</b>');
    expect(
      formatTriviaSolvedMessage({
        title: 'Heat',
        year: 1995,
        directors: ['Michael Mann'],
        winnerName: null,
        winnerWins: null,
      })
    ).toContain('Nadie la adivinó');
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
