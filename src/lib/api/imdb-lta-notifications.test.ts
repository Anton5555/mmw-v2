import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({
  imdbLtaNotification: {
    create: vi.fn(),
    deleteMany: vi.fn(),
  },
  imdbLtaBatch: {
    findFirst: vi.fn(),
  },
  imdbLtaRating: {
    findMany: vi.fn(),
    groupBy: vi.fn(),
  },
  imdbLtaSkip: {
    findMany: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },
  movie: {
    findUnique: vi.fn(),
  },
}));

const telegram = vi.hoisted(() => ({
  sendTelegramMessage: vi.fn(),
  getLtaTelegramChatId: vi.fn(() => 'chat-lta'),
  escapeHtml: (text: string) =>
    text
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;'),
}));

vi.mock('@/lib/db', () => ({ prisma: db }));
vi.mock('@/lib/utils/telegram', () => telegram);

import {
  formatBatchAllRatedMessage,
  formatWantToWatchMessage,
  notifyBatchAllRatedIfDone,
  notifyWantToWatch,
} from './imdb-lta-notifications';

beforeEach(() => {
  vi.clearAllMocks();
  telegram.getLtaTelegramChatId.mockReturnValue('chat-lta');
  telegram.sendTelegramMessage.mockResolvedValue({ ok: true });
});

describe('formatWantToWatchMessage', () => {
  it('formats a pin with year and other watchers', () => {
    expect(
      formatWantToWatchMessage({
        userName: 'Juan',
        title: 'Stalker',
        year: 1979,
        otherNames: ['Ana', 'Leo'],
      })
    ).toBe(
      '🍿 <b>Juan</b> quiere ver <b>Stalker</b> (1979), también la quieren ver Ana, Leo'
    );
  });

  it('omits también when nobody else pinned it', () => {
    expect(
      formatWantToWatchMessage({
        userName: 'Juan',
        title: 'Stalker',
        year: 1979,
        otherNames: [],
      })
    ).toBe('🍿 <b>Juan</b> quiere ver <b>Stalker</b> (1979)');
  });

  it('omits year when unknown and escapes HTML', () => {
    expect(
      formatWantToWatchMessage({
        userName: 'A & B',
        title: 'C <D>',
        year: null,
        otherNames: ['E "F"'],
      })
    ).toBe(
      '🍿 <b>A &amp; B</b> quiere ver <b>C &lt;D&gt;</b>, también la quieren ver E &quot;F&quot;'
    );
  });
});

describe('formatBatchAllRatedMessage', () => {
  it('congratulates the user with N of M', () => {
    expect(
      formatBatchAllRatedMessage({
        userName: 'Juan',
        batchNumber: 5,
        finishedCount: 3,
        activeRaterCount: 12,
      })
    ).toBe(
      '🎉 Feliciten a <b>Juan</b> que vio y puntuó todas las películas del lote #5 (solo 3 de 12 lo hicieron)'
    );
  });

  it('uses singular lo hizo when finishedCount is 1', () => {
    expect(
      formatBatchAllRatedMessage({
        userName: 'Juan',
        batchNumber: 1,
        finishedCount: 1,
        activeRaterCount: 12,
      })
    ).toBe(
      '🎉 Feliciten a <b>Juan</b> que vio y puntuó todas las películas del lote #1 (solo 1 de 12 lo hizo)'
    );
  });
});

describe('notifyWantToWatch', () => {
  it('claims once, sends the message, and lists other watchers', async () => {
    db.imdbLtaNotification.create.mockResolvedValue({ id: 1 });
    db.user.findUnique.mockResolvedValue({ name: 'Juan' });
    db.movie.findUnique.mockResolvedValue({
      title: 'Stalker',
      releaseDate: new Date('1979-05-25T00:00:00.000Z'),
    });
    db.imdbLtaSkip.findMany.mockResolvedValue([
      { userId: 'u-ana', user: { name: 'Ana' } },
      { userId: 'u-leo', user: { name: 'Leo' } },
    ]);

    await notifyWantToWatch('u-juan', 42);

    expect(db.imdbLtaNotification.create).toHaveBeenCalledWith({
      data: { key: 'want:u-juan:42' },
    });
    expect(telegram.sendTelegramMessage).toHaveBeenCalledWith(
      '🍿 <b>Juan</b> quiere ver <b>Stalker</b> (1979), también la quieren ver Ana, Leo',
      { chatId: 'chat-lta' }
    );
  });

  it('does not send when the claim is a duplicate', async () => {
    db.imdbLtaNotification.create.mockRejectedValue({ code: 'P2002' });

    await notifyWantToWatch('u-juan', 42);

    expect(telegram.sendTelegramMessage).not.toHaveBeenCalled();
  });

  it('releases the claim when Telegram fails', async () => {
    db.imdbLtaNotification.create.mockResolvedValue({ id: 1 });
    db.user.findUnique.mockResolvedValue({ name: 'Juan' });
    db.movie.findUnique.mockResolvedValue({
      title: 'Stalker',
      releaseDate: new Date('1979-05-25T00:00:00.000Z'),
    });
    db.imdbLtaSkip.findMany.mockResolvedValue([]);
    telegram.sendTelegramMessage.mockRejectedValue(new Error('boom'));

    await expect(notifyWantToWatch('u-juan', 42)).rejects.toThrow('boom');

    expect(db.imdbLtaNotification.deleteMany).toHaveBeenCalledWith({
      where: { key: 'want:u-juan:42' },
    });
  });
});

describe('notifyBatchAllRatedIfDone', () => {
  const openBatch = {
    id: 10,
    number: 5,
    status: 'OPEN',
    movies: [
      { movieId: 1 },
      { movieId: 2 },
      { movieId: 3 },
    ],
  };

  it('no-ops when the movie is not in the open batch', async () => {
    db.imdbLtaBatch.findFirst.mockResolvedValue(openBatch);

    await notifyBatchAllRatedIfDone('u-juan', 99);

    expect(db.imdbLtaNotification.create).not.toHaveBeenCalled();
    expect(telegram.sendTelegramMessage).not.toHaveBeenCalled();
  });

  it('no-ops when the user still has unrated movies in the batch', async () => {
    db.imdbLtaBatch.findFirst.mockResolvedValue(openBatch);
    db.imdbLtaRating.findMany.mockResolvedValue([
      { movieId: 1 },
      { movieId: 2 },
    ]);

    await notifyBatchAllRatedIfDone('u-juan', 1);

    expect(db.imdbLtaNotification.create).not.toHaveBeenCalled();
  });

  it('congratulates when the user rated every movie in the open batch', async () => {
    db.imdbLtaBatch.findFirst.mockResolvedValue(openBatch);
    db.imdbLtaRating.findMany
      .mockResolvedValueOnce([
        { movieId: 1 },
        { movieId: 2 },
        { movieId: 3 },
      ])
      .mockResolvedValueOnce([
        { userId: 'u-juan', movieId: 1 },
        { userId: 'u-juan', movieId: 2 },
        { userId: 'u-juan', movieId: 3 },
        { userId: 'u-ana', movieId: 1 },
        { userId: 'u-ana', movieId: 2 },
        { userId: 'u-ana', movieId: 3 },
        { userId: 'u-leo', movieId: 1 },
      ]);
    db.imdbLtaRating.groupBy.mockResolvedValue([
      { userId: 'u-juan' },
      { userId: 'u-ana' },
      { userId: 'u-leo' },
      { userId: 'u-mia' },
    ]);
    db.user.findUnique.mockResolvedValue({ name: 'Juan' });
    db.imdbLtaNotification.create.mockResolvedValue({ id: 1 });

    await notifyBatchAllRatedIfDone('u-juan', 3);

    expect(db.imdbLtaNotification.create).toHaveBeenCalledWith({
      data: { key: 'batch-all-rated:10:u-juan' },
    });
    expect(telegram.sendTelegramMessage).toHaveBeenCalledWith(
      '🎉 Feliciten a <b>Juan</b> que vio y puntuó todas las películas del lote #5 (solo 2 de 4 lo hicieron)',
      { chatId: 'chat-lta' }
    );
  });

  it('does not send a duplicate congrats for the same batch', async () => {
    db.imdbLtaBatch.findFirst.mockResolvedValue(openBatch);
    db.imdbLtaRating.findMany
      .mockResolvedValueOnce([
        { movieId: 1 },
        { movieId: 2 },
        { movieId: 3 },
      ])
      .mockResolvedValueOnce([
        { userId: 'u-juan', movieId: 1 },
        { userId: 'u-juan', movieId: 2 },
        { userId: 'u-juan', movieId: 3 },
      ]);
    db.imdbLtaRating.groupBy.mockResolvedValue([{ userId: 'u-juan' }]);
    db.user.findUnique.mockResolvedValue({ name: 'Juan' });
    db.imdbLtaNotification.create.mockRejectedValue({ code: 'P2002' });

    await notifyBatchAllRatedIfDone('u-juan', 1);

    expect(telegram.sendTelegramMessage).not.toHaveBeenCalled();
  });
});
