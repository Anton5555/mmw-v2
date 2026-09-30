import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({
  oscarEdition: { findFirst: vi.fn() },
  oscarCategory: { findMany: vi.fn() },
  oscarBallot: { findUnique: vi.fn(), findMany: vi.fn() },
  oscarPick: { findMany: vi.fn() },
  oscarNominee: { findMany: vi.fn() },
}));

vi.mock('@/lib/db', () => ({ prisma: db }));

import {
  getActiveEdition,
  getOscarCategories,
  getOscarLeaderboard,
  getOscarPredictionStats,
  getUserBallot,
  hasUserVoted,
} from './oscars';

const movie = { id: 9, title: 'Anora', posterUrl: 'p.jpg', imdbId: 'tt9', extra: 'dropped' };

describe('getActiveEdition', () => {
  it('returns null without an active edition', async () => {
    db.oscarEdition.findFirst.mockResolvedValue(null);
    await expect(getActiveEdition()).resolves.toBeNull();
  });

  it('picks the most recent active edition and exposes only the public fields', async () => {
    db.oscarEdition.findFirst.mockResolvedValue({
      id: 1,
      year: 2026,
      ceremonyDate: new Date('2026-03-15T01:00:00Z'),
      isActive: true,
      resultsReleased: false,
      internalNote: 'secret',
    });

    const edition = await getActiveEdition();

    expect(db.oscarEdition.findFirst).toHaveBeenCalledWith({
      where: { isActive: true },
      orderBy: { year: 'desc' },
    });
    expect(edition).toEqual({
      id: 1,
      year: 2026,
      ceremonyDate: new Date('2026-03-15T01:00:00Z'),
      isActive: true,
      resultsReleased: false,
    });
  });
});

describe('getOscarCategories', () => {
  it('maps categories and nominees, keeping nominees without a movie', async () => {
    db.oscarCategory.findMany.mockResolvedValue([
      {
        id: 1,
        name: 'Best Picture',
        slug: 'best-picture',
        order: 1,
        winnerId: null,
        editionId: 7,
        nominees: [
          { id: 11, name: 'Anora', filmTitle: null, imdbId: null, filmImdbId: 'tt9', movieId: 9, movie },
          { id: 12, name: 'Conclave', filmTitle: null, imdbId: null, filmImdbId: null, movieId: null, movie: null },
        ],
      },
    ]);

    const [category] = await getOscarCategories(7);

    expect(db.oscarCategory.findMany.mock.calls[0][0]).toMatchObject({
      where: { editionId: 7 },
      orderBy: { order: 'asc' },
    });
    expect(category).not.toHaveProperty('editionId');
    expect(category.nominees[0].movie).toEqual({ id: 9, title: 'Anora', posterUrl: 'p.jpg', imdbId: 'tt9' });
    expect(category.nominees[1].movie).toBeNull();
  });
});

describe('getUserBallot / hasUserVoted', () => {
  it('returns null when the user has not voted', async () => {
    db.oscarBallot.findUnique.mockResolvedValue(null);
    await expect(getUserBallot('u1', 7)).resolves.toBeNull();
    await expect(hasUserVoted('u1', 7)).resolves.toBe(false);
  });

  it('looks the ballot up by user and edition', async () => {
    db.oscarBallot.findUnique.mockResolvedValue(null);
    await getUserBallot('u1', 7);
    expect(db.oscarBallot.findUnique.mock.calls[0][0].where).toEqual({
      userId_editionId: { userId: 'u1', editionId: 7 },
    });
  });

  it('maps picks with their nominee, movie and category', async () => {
    const submittedAt = new Date('2026-03-01');
    db.oscarBallot.findUnique.mockResolvedValue({
      id: 'b1',
      submittedAt,
      score: 3,
      picks: [
        {
          id: 1,
          categoryId: 1,
          nomineeId: 11,
          nominee: { id: 11, name: 'Anora', filmTitle: 'Anora', movie },
          category: { id: 1, name: 'Best Picture', slug: 'best-picture', order: 1, extra: 'dropped' },
        },
        {
          id: 2,
          categoryId: 2,
          nomineeId: 21,
          nominee: { id: 21, name: 'Adrien Brody', filmTitle: null, movie: null },
          category: { id: 2, name: 'Best Actor', slug: 'best-actor', order: 2 },
        },
      ],
    });

    const ballot = await getUserBallot('u1', 7);

    expect(ballot).toMatchObject({ id: 'b1', submittedAt, score: 3 });
    expect(ballot?.picks[0].nominee.movie).toEqual({ id: 9, title: 'Anora', posterUrl: 'p.jpg', imdbId: 'tt9' });
    expect(ballot?.picks[0].category).toEqual({ id: 1, name: 'Best Picture', slug: 'best-picture', order: 1 });
    expect(ballot?.picks[1].nominee.movie).toBeNull();
  });

  it('hasUserVoted is true when a ballot exists', async () => {
    db.oscarBallot.findUnique.mockResolvedValue({ id: 'b1' });
    await expect(hasUserVoted('u1', 7)).resolves.toBe(true);
  });
});

describe('getOscarPredictionStats', () => {
  const category = (id: number, winnerId: number | null = null) => ({
    id,
    name: `Cat ${id}`,
    slug: `cat-${id}`,
    order: id,
    winnerId,
  });
  const pick = (categoryId: number, nomineeId: number, name = `Nominee ${nomineeId}`) => ({
    categoryId,
    nomineeId,
    nominee: { id: nomineeId, name, filmTitle: `Film ${nomineeId}` },
  });

  beforeEach(() => {
    db.oscarNominee.findMany.mockResolvedValue([]);
  });

  it('ranks the top 3 picks per category with vote counts and rounded percentages', async () => {
    db.oscarCategory.findMany.mockResolvedValue([category(1)]);
    db.oscarPick.findMany.mockResolvedValue([
      ...Array.from({ length: 4 }, () => pick(1, 10)),
      ...Array.from({ length: 2 }, () => pick(1, 11)),
      pick(1, 12),
      pick(1, 13),
    ]);

    const [stats] = await getOscarPredictionStats(7);

    expect(stats.totalVotes).toBe(8);
    expect(stats.topPicks).toHaveLength(3); // 4th nominee is cut
    expect(stats.topPicks.map((p) => [p.nomineeId, p.count, p.percentage])).toEqual([
      [10, 4, 50],
      [11, 2, 25],
      [12, 1, 13], // 12.5% rounds to 13
    ]);
    expect(stats.topPicks[0]).toMatchObject({ nomineeName: 'Nominee 10', filmTitle: 'Film 10' });
  });

  it('keeps categories without votes, with zero totals', async () => {
    db.oscarCategory.findMany.mockResolvedValue([category(1), category(2)]);
    db.oscarPick.findMany.mockResolvedValue([pick(1, 10)]);

    const stats = await getOscarPredictionStats(7);

    expect(stats[1]).toMatchObject({ id: 2, totalVotes: 0, topPicks: [], winner: null });
  });

  it('does not query nominees when no winner has been set', async () => {
    db.oscarCategory.findMany.mockResolvedValue([category(1)]);
    db.oscarPick.findMany.mockResolvedValue([]);

    await getOscarPredictionStats(7);

    expect(db.oscarNominee.findMany).not.toHaveBeenCalled();
  });

  it('attaches the winning nominee to categories that have one', async () => {
    db.oscarCategory.findMany.mockResolvedValue([category(1, 10), category(2)]);
    db.oscarPick.findMany.mockResolvedValue([]);
    db.oscarNominee.findMany.mockResolvedValue([{ id: 10, name: 'Anora', filmTitle: 'Anora' }]);

    const stats = await getOscarPredictionStats(7);

    expect(db.oscarNominee.findMany.mock.calls[0][0].where).toEqual({ id: { in: [10] } });
    expect(stats[0].winner).toEqual({ nomineeId: 10, nomineeName: 'Anora', filmTitle: 'Anora' });
    expect(stats[1].winner).toBeNull();
  });
});

describe('getOscarLeaderboard', () => {
  const ballot = (id: string, score: number | null, submittedAt: string, name: string | null = id) => ({
    score,
    submittedAt: new Date(submittedAt),
    user: { id, name, image: null },
  });

  it('gives tied scores the same rank and skips ranks after a tie', async () => {
    db.oscarBallot.findMany.mockResolvedValue([
      ballot('a', 5, '2026-03-01'),
      ballot('b', 5, '2026-03-02'),
      ballot('c', 3, '2026-03-03'),
      ballot('d', 2, '2026-03-04'),
      ballot('e', 2, '2026-03-05'),
    ]);

    const board = await getOscarLeaderboard(7);

    expect(board.map((e) => [e.userId, e.rank])).toEqual([
      ['a', 1],
      ['b', 1],
      ['c', 3],
      ['d', 4],
      ['e', 4],
    ]);
  });

  it('marks everyone with the top score as a winner', async () => {
    db.oscarBallot.findMany.mockResolvedValue([
      ballot('a', 5, '2026-03-01'),
      ballot('b', 5, '2026-03-02'),
      ballot('c', 3, '2026-03-03'),
    ]);

    const board = await getOscarLeaderboard(7);

    expect(board.map((e) => e.isWinner)).toEqual([true, true, false]);
  });

  it('orders by score (nulls last) then submission time, and scopes to the edition', async () => {
    db.oscarBallot.findMany.mockResolvedValue([]);
    await getOscarLeaderboard(7);
    const call = db.oscarBallot.findMany.mock.calls[0][0];
    expect(call.where).toEqual({ editionId: 7 });
    expect(call.orderBy).toEqual([{ score: { sort: 'desc', nulls: 'last' } }, { submittedAt: 'asc' }]);
  });

  it('shows unscored ballots as 0 and never marks them winners', async () => {
    db.oscarBallot.findMany.mockResolvedValue([ballot('a', null, '2026-03-01'), ballot('b', null, '2026-03-02')]);

    const board = await getOscarLeaderboard(7);

    expect(board.map((e) => [e.score, e.rank, e.isWinner])).toEqual([
      [0, 1, false],
      [0, 1, false],
    ]);
  });

  it('does not mark anyone as a winner while every score is 0', async () => {
    db.oscarBallot.findMany.mockResolvedValue([ballot('a', 0, '2026-03-01'), ballot('b', 0, '2026-03-02')]);

    const board = await getOscarLeaderboard(7);

    expect(board.map((e) => e.isWinner)).toEqual([false, false]);
  });

  it('falls back to "Usuario" for users without a name', async () => {
    db.oscarBallot.findMany.mockResolvedValue([ballot('a', 1, '2026-03-01', null)]);
    const [entry] = await getOscarLeaderboard(7);
    expect(entry.userName).toBe('Usuario');
    expect(entry.userImage).toBeNull();
  });

  it('returns an empty leaderboard when nobody voted', async () => {
    db.oscarBallot.findMany.mockResolvedValue([]);
    await expect(getOscarLeaderboard(7)).resolves.toEqual([]);
  });
});
