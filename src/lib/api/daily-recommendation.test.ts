import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({
  movie: { findMany: vi.fn() },
  mamPick: { findFirst: vi.fn() },
  list: { findMany: vi.fn() },
  user: { findUnique: vi.fn() },
  mamParticipant: { findMany: vi.fn() },
  dailyRecommendation: { upsert: vi.fn(), findUnique: vi.fn() },
}));

vi.mock('@/lib/db', () => ({ prisma: db }));

import { getDailyContentType, getDateSeed } from '@/lib/utils/daily-recommendation';
import { calculateAndSaveDailyRecommendation } from './calculate-daily-recommendation';
import { getDailyRecommendation } from './daily-recommendation';

type ContentType = 'movie' | 'list' | 'participant';

/** A date whose deterministic seed selects the given content type. */
function dateFor(type: ContentType): Date {
  for (let day = 1; day <= 10; day++) {
    const date = new Date(Date.UTC(2026, 2, day, 12));
    if (getDailyContentType(getDateSeed(date)) === type) return date;
  }
  throw new Error(`no date found for ${type}`);
}

const midnightUtc = (date: Date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('calculateAndSaveDailyRecommendation', () => {
  describe('movie day', () => {
    const date = dateFor('movie');
    const movies = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }];

    it('fails when there are no MAM top-100 movies', async () => {
      db.movie.findMany.mockResolvedValue([]);
      await expect(calculateAndSaveDailyRecommendation(date)).resolves.toEqual({
        success: false,
        error: 'No top 100 movies found',
      });
      expect(db.dailyRecommendation.upsert).not.toHaveBeenCalled();
    });

    it('picks deterministically by date seed and credits the top review author', async () => {
      db.movie.findMany.mockResolvedValue(movies);
      db.mamPick.findFirst.mockResolvedValue({
        participant: { displayName: 'Ana D.', user: { name: 'Ana', image: 'ana.png' } },
      });

      await expect(calculateAndSaveDailyRecommendation(date)).resolves.toEqual({
        success: true,
        type: 'movie',
      });

      const expected = movies[getDateSeed(date) % movies.length];
      expect(db.mamPick.findFirst.mock.calls[0][0].where).toMatchObject({
        movieId: expected.id,
        isSpecialMention: false,
      });
      const { where, create, update } = db.dailyRecommendation.upsert.mock.calls[0][0];
      expect(where).toEqual({ date: midnightUtc(date) });
      expect(create).toMatchObject({
        type: 'movie',
        movieId: expected.id,
        curatorName: 'Ana',
        curatorImage: 'ana.png',
      });
      expect(update).toMatchObject({ type: 'movie', movieId: expected.id });
    });

    it('falls back to the participant display name when they have no user account', async () => {
      db.movie.findMany.mockResolvedValue(movies);
      db.mamPick.findFirst.mockResolvedValue({ participant: { displayName: 'Ana D.', user: null } });

      await calculateAndSaveDailyRecommendation(date);

      expect(db.dailyRecommendation.upsert.mock.calls[0][0].create).toMatchObject({
        curatorName: 'Ana D.',
        curatorImage: null,
      });
    });

    it('leaves the curator empty when the movie has no review', async () => {
      db.movie.findMany.mockResolvedValue(movies);
      db.mamPick.findFirst.mockResolvedValue(null);

      await calculateAndSaveDailyRecommendation(date);

      expect(db.dailyRecommendation.upsert.mock.calls[0][0].create).toMatchObject({
        curatorName: undefined,
        curatorImage: null,
      });
    });
  });

  describe('list day', () => {
    const date = dateFor('list');
    const lists = [
      { id: 10, createdBy: 'u10' },
      { id: 11, createdBy: 'u11' },
      { id: 12, createdBy: 'u12' },
    ];

    it('fails when there are no lists', async () => {
      db.list.findMany.mockResolvedValue([]);
      await expect(calculateAndSaveDailyRecommendation(date)).resolves.toEqual({
        success: false,
        error: 'No lists found',
      });
    });

    it("credits the selected list's creator", async () => {
      db.list.findMany.mockResolvedValue(lists);
      db.user.findUnique.mockResolvedValue({ name: 'Bruno', image: 'b.png' });

      await expect(calculateAndSaveDailyRecommendation(date)).resolves.toMatchObject({
        success: true,
        type: 'list',
      });

      const expected = lists[getDateSeed(date) % lists.length];
      expect(db.user.findUnique.mock.calls[0][0].where).toEqual({ id: expected.createdBy });
      expect(db.dailyRecommendation.upsert.mock.calls[0][0].create).toMatchObject({
        type: 'list',
        listId: expected.id,
        curatorName: 'Bruno',
        curatorImage: 'b.png',
      });
    });

    it('credits "Comunidad" when the creator no longer exists', async () => {
      db.list.findMany.mockResolvedValue(lists);
      db.user.findUnique.mockResolvedValue(null);

      await calculateAndSaveDailyRecommendation(date);

      expect(db.dailyRecommendation.upsert.mock.calls[0][0].create).toMatchObject({
        curatorName: 'Comunidad',
        curatorImage: null,
      });
    });
  });

  describe('participant day', () => {
    const date = dateFor('participant');
    const participants = [
      { id: 1, displayName: 'P1', userId: 'u1' },
      { id: 2, displayName: 'P2', userId: null },
      { id: 3, displayName: 'P3', userId: 'u3' },
    ];

    it('fails when no participant has picks', async () => {
      db.mamParticipant.findMany.mockResolvedValue([]);
      await expect(calculateAndSaveDailyRecommendation(date)).resolves.toEqual({
        success: false,
        error: 'No participants with picks found',
      });
    });

    it('uses the participant name and their linked user image', async () => {
      // Force the linked-user branch regardless of which index the seed selects.
      const linked = { id: 1, displayName: 'P1', userId: 'u1' };
      db.mamParticipant.findMany.mockResolvedValue([linked]);
      db.user.findUnique.mockResolvedValue({ image: 'p1.png' });

      await calculateAndSaveDailyRecommendation(date);

      expect(db.dailyRecommendation.upsert.mock.calls[0][0].create).toMatchObject({
        type: 'participant',
        participantId: 1,
        curatorName: 'P1',
        curatorImage: 'p1.png',
      });
    });

    it('has no image for participants without a user account', async () => {
      db.mamParticipant.findMany.mockResolvedValue([participants[1]]);

      await calculateAndSaveDailyRecommendation(date);

      expect(db.user.findUnique).not.toHaveBeenCalled();
      expect(db.dailyRecommendation.upsert.mock.calls[0][0].create).toMatchObject({
        participantId: 2,
        curatorImage: null,
      });
    });
  });

  it('reports database failures instead of throwing', async () => {
    db.movie.findMany.mockRejectedValue(new Error('db down'));
    await expect(calculateAndSaveDailyRecommendation(dateFor('movie'))).resolves.toEqual({
      success: false,
      error: 'db down',
    });
  });

  it('is idempotent: saves with upsert keyed on the UTC-midnight date', async () => {
    db.list.findMany.mockResolvedValue([{ id: 1, createdBy: 'u' }]);
    db.user.findUnique.mockResolvedValue(null);
    const lateInDay = new Date(dateFor('list').getTime() + 9 * 3_600_000);

    await calculateAndSaveDailyRecommendation(lateInDay);

    expect(db.dailyRecommendation.upsert.mock.calls[0][0].where.date.toISOString()).toBe(
      midnightUtc(lateInDay).toISOString()
    );
  });
});

describe('getDailyRecommendation', () => {
  const NOW = new Date('2026-03-05T18:30:00Z');

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('looks up the recommendation for today (UTC midnight) by default', async () => {
    db.dailyRecommendation.findUnique.mockResolvedValue(null);
    await expect(getDailyRecommendation()).resolves.toBeNull();
    expect(db.dailyRecommendation.findUnique.mock.calls[0][0].where).toEqual({
      date: new Date('2026-03-05T00:00:00Z'),
    });
  });

  it('accepts an explicit date', async () => {
    db.dailyRecommendation.findUnique.mockResolvedValue(null);
    await getDailyRecommendation(new Date('2026-01-02T23:00:00Z'));
    expect(db.dailyRecommendation.findUnique.mock.calls[0][0].where).toEqual({
      date: new Date('2026-01-02T00:00:00Z'),
    });
  });

  it('returns a movie recommendation with the stored curator', async () => {
    db.dailyRecommendation.findUnique.mockResolvedValue({
      type: 'movie',
      movie: { id: 1 },
      curatorName: 'Ana',
      curatorImage: 'ana.png',
    });
    await expect(getDailyRecommendation()).resolves.toEqual({
      type: 'movie',
      movie: { id: 1 },
      curator: { name: 'Ana', image: 'ana.png' },
    });
  });

  it('omits the curator when none was stored', async () => {
    db.dailyRecommendation.findUnique.mockResolvedValue({ type: 'movie', movie: { id: 1 }, curatorName: null });
    const result = await getDailyRecommendation();
    expect(result).toMatchObject({ type: 'movie', curator: undefined });
  });

  it.each([
    ['movie', { type: 'movie', movie: null }],
    ['list', { type: 'list', list: null }],
    ['participant', { type: 'participant', participant: null }],
    ['unknown', { type: 'weekly-special' }],
  ])('returns null when a %s recommendation has nothing to show', async (_label, row) => {
    db.dailyRecommendation.findUnique.mockResolvedValue(row);
    await expect(getDailyRecommendation()).resolves.toBeNull();
  });

  it('for lists, prefers the stored curator over the creator lookup', async () => {
    db.dailyRecommendation.findUnique.mockResolvedValue({
      type: 'list',
      list: { id: 5, createdBy: 'u5' },
      curatorName: 'Stored',
      curatorImage: null,
    });
    db.user.findUnique.mockResolvedValue({ name: 'Creator', image: 'c.png' });
    const result = await getDailyRecommendation();
    expect(result).toMatchObject({ curator: { name: 'Stored', image: undefined } });
  });

  it('for lists without a stored curator, falls back to the creator, then "Comunidad"', async () => {
    const row = { type: 'list', list: { id: 5, createdBy: 'u5' }, curatorName: null };
    db.dailyRecommendation.findUnique.mockResolvedValue(row);

    db.user.findUnique.mockResolvedValueOnce({ name: 'Creator', image: 'c.png' });
    await expect(getDailyRecommendation()).resolves.toMatchObject({
      curator: { name: 'Creator', image: 'c.png' },
    });

    db.user.findUnique.mockResolvedValueOnce(null);
    await expect(getDailyRecommendation()).resolves.toMatchObject({
      curator: { name: 'Comunidad', image: undefined },
    });
  });

  it('for participants without a stored curator, falls back to their display name and user image', async () => {
    db.dailyRecommendation.findUnique.mockResolvedValue({
      type: 'participant',
      curatorName: null,
      participant: { displayName: 'P1', user: { name: 'U', image: 'u.png' } },
    });
    await expect(getDailyRecommendation()).resolves.toMatchObject({
      type: 'participant',
      curator: { name: 'P1', image: 'u.png' },
    });
  });
});
