import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma, resetDatabase } from '../../../tests/integration/db';
import { createMovie, createMovies, createUser, createUsers } from '../../../tests/integration/factories';
import {
  addNomination,
  canUserRateMovie,
  listAdminNominationSnapshot,
  listOfficialRanking,
  listRateableCandidates,
  removeNomination,
  submitNominations,
  submitRating,
  updateImdbLtaPhase,
} from './imdb-lta';

/** Give `userId` a nomination list with the given movies (bypassing the API's phase checks). */
async function nominate(userId: string, movieIds: number[]) {
  const list = await prisma.imdbLtaNominationList.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });
  await prisma.imdbLtaNomination.createMany({
    data: movieIds.map((movieId) => ({ listId: list.id, userId, movieId })),
  });
  return list;
}

beforeEach(async () => {
  await resetDatabase();
  // The nomination deadline is 2026-10-21 (Argentina time); pin the clock before it.
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-01T12:00:00-03:00'));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('nominations', () => {
  it('creates the config row and nomination list lazily, then counts nominations', async () => {
    const user = await createUser();
    const [a, b] = await createMovies(2);

    await expect(addNomination(user.id, a.id)).resolves.toMatchObject({ count: 1 });
    await expect(addNomination(user.id, b.id)).resolves.toMatchObject({ count: 2 });

    expect(await prisma.imdbLtaConfig.findUnique({ where: { id: 1 } })).toMatchObject({
      phase: 'NOMINATION_OPEN',
    });
    expect(await prisma.imdbLtaNominationList.count({ where: { userId: user.id } })).toBe(1);
    expect(await prisma.imdbLtaNomination.count({ where: { userId: user.id } })).toBe(2);
  });

  it('rejects a duplicate nomination through the real unique constraint', async () => {
    const user = await createUser();
    const movie = await createMovie();
    await addNomination(user.id, movie.id);

    await expect(addNomination(user.id, movie.id)).rejects.toThrow('Esta película ya está en tu lista');
    expect(await prisma.imdbLtaNomination.count()).toBe(1);
  });

  it('lets exactly one of two simultaneous identical nominations win', async () => {
    const user = await createUser();
    const movie = await createMovie();

    const results = await Promise.allSettled([
      addNomination(user.id, movie.id),
      addNomination(user.id, movie.id),
    ]);

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const failure = results.find((r) => r.status === 'rejected') as PromiseRejectedResult;
    expect(failure.reason.message).toBe('Esta película ya está en tu lista');
    expect(await prisma.imdbLtaNomination.count()).toBe(1);
  });

  it('enforces the 50-movie cap', async () => {
    const user = await createUser();
    await nominate(user.id, (await createMovies(50)).map((m) => m.id));
    const extra = await createMovie();

    await expect(addNomination(user.id, extra.id)).rejects.toThrow(/máximo de 50/);
    expect(await prisma.imdbLtaNomination.count()).toBe(50);
  });

  it('rejects unknown movies', async () => {
    const user = await createUser();
    await expect(addNomination(user.id, 999_999)).rejects.toThrow('Película no encontrada');
  });

  it('is closed once the phase changes', async () => {
    const user = await createUser();
    const movie = await createMovie();

    await updateImdbLtaPhase('NOMINATION_CLOSED');

    await expect(addNomination(user.id, movie.id)).rejects.toThrow(/nominaciones están cerradas/);
    expect(await prisma.imdbLtaNomination.count()).toBe(0);
  });

  it('is closed after the deadline even while the phase is still open', async () => {
    const user = await createUser();
    const movie = await createMovie();
    vi.setSystemTime(new Date('2026-10-22T00:00:00-03:00'));

    await expect(addNomination(user.id, movie.id)).rejects.toThrow(/plazo de nominaciones terminó/);
  });

  describe('submitting', () => {
    it.each([24, 51])('refuses a list of %d movies', async (count) => {
      const user = await createUser();
      await nominate(user.id, (await createMovies(count)).map((m) => m.id));

      await expect(submitNominations(user.id)).rejects.toThrow();
      const list = await prisma.imdbLtaNominationList.findUniqueOrThrow({ where: { userId: user.id } });
      expect(list.submittedAt).toBeNull();
    });

    it.each([25, 50])('saves a list of %d movies', async (count) => {
      const user = await createUser();
      await nominate(user.id, (await createMovies(count)).map((m) => m.id));

      const result = await submitNominations(user.id);

      expect(result.count).toBe(count);
      const list = await prisma.imdbLtaNominationList.findUniqueOrThrow({ where: { userId: user.id } });
      expect(list.submittedAt).toEqual(result.submittedAt);
    });

    it('un-submits the list when removing a movie drops it below 25', async () => {
      const user = await createUser();
      const movies = await createMovies(25);
      await nominate(user.id, movies.map((m) => m.id));
      await submitNominations(user.id);

      const result = await removeNomination(user.id, movies[0].id);

      expect(result).toEqual({ count: 24, submittedAt: null });
      const list = await prisma.imdbLtaNominationList.findUniqueOrThrow({ where: { userId: user.id } });
      expect(list.submittedAt).toBeNull();
    });

    it('keeps the submission when the list stays at or above 25', async () => {
      const user = await createUser();
      const movies = await createMovies(26);
      await nominate(user.id, movies.map((m) => m.id));
      await submitNominations(user.id);

      const result = await removeNomination(user.id, movies[0].id);

      expect(result.count).toBe(25);
      expect(result.submittedAt).toBeInstanceOf(Date);
    });

    it("only removes the caller's own nomination", async () => {
      const [alice, bob] = await createUsers(2);
      const movie = await createMovie();
      await nominate(alice.id, [movie.id]);

      await expect(removeNomination(bob.id, movie.id)).rejects.toThrow('Esta película no está en tu lista');
      expect(await prisma.imdbLtaNomination.count()).toBe(1);
    });
  });
});

describe('ratings', () => {
  beforeEach(async () => {
    await prisma.imdbLtaConfig.create({ data: { id: 1, phase: 'RATING_OPEN' } });
  });

  it('only opens with the RATING_OPEN phase', async () => {
    const [nominator, rater] = await createUsers(2);
    const movie = await createMovie();
    await nominate(nominator.id, [movie.id]);
    await updateImdbLtaPhase('NOMINATION_OPEN');

    await expect(submitRating(rater.id, movie.id, 8)).rejects.toThrow(/puntuaciones están cerradas/);
  });

  it('stores a rating and rejects a second one from the same user (real unique constraint)', async () => {
    const [nominator, rater] = await createUsers(2);
    const movie = await createMovie();
    await nominate(nominator.id, [movie.id]);

    await expect(submitRating(rater.id, movie.id, 8)).resolves.toMatchObject({ movieId: movie.id, score: 8 });
    await expect(submitRating(rater.id, movie.id, 3)).rejects.toThrow('Ya puntuaste esta película');
    expect(await prisma.imdbLtaRating.count()).toBe(1);
  });

  it('turns a simultaneous double-submit into a single rating', async () => {
    const [nominator, rater] = await createUsers(2);
    const movie = await createMovie();
    await nominate(nominator.id, [movie.id]);

    const results = await Promise.allSettled([
      submitRating(rater.id, movie.id, 8),
      submitRating(rater.id, movie.id, 8),
    ]);

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(await prisma.imdbLtaRating.count()).toBe(1);
  });

  it('applies the shared-unlock rule using real nomination counts', async () => {
    const [alice, bob, carol] = await createUsers(3);
    const solo = await createMovie();
    const shared = await createMovie();
    const nobodys = await createMovie();
    await nominate(alice.id, [solo.id, shared.id]);
    await nominate(bob.id, [shared.id]);

    // Movies nobody nominated are not candidates.
    await expect(canUserRateMovie(carol.id, nobodys.id)).resolves.toMatchObject({ allowed: false });
    // A sole nominator can't rate their own unique pick...
    await expect(canUserRateMovie(alice.id, solo.id)).resolves.toMatchObject({ allowed: false });
    // ...but anyone else can.
    await expect(canUserRateMovie(carol.id, solo.id)).resolves.toEqual({ allowed: true });
    // Once a second person nominates it, both nominators unlock.
    await expect(canUserRateMovie(alice.id, shared.id)).resolves.toEqual({ allowed: true });
    await expect(canUserRateMovie(bob.id, shared.id)).resolves.toEqual({ allowed: true });
  });

  it('lists rateable candidates from real aggregates, least-rated first', async () => {
    const [alice, bob] = await createUsers(2);
    const [mine, rated, fresh, popular] = await createMovies(4);
    await nominate(alice.id, [mine.id]); // sole nomination by me -> not eligible
    await nominate(bob.id, [rated.id, fresh.id, popular.id]);
    await prisma.imdbLtaRating.create({ data: { userId: alice.id, movieId: rated.id, score: 7 } });
    await prisma.imdbLtaRating.createMany({
      data: (await createUsers(3)).map((u) => ({ userId: u.id, movieId: popular.id, score: 9 })),
    });

    const unrated = await listRateableCandidates(alice.id, { filter: 'unrated' });
    expect(unrated.movies.map((m) => m.id)).toEqual([fresh.id, popular.id]);
    expect(unrated.movies[1]).toMatchObject({ ratingCount: 3, averageScore: 9 });

    const done = await listRateableCandidates(alice.id, { filter: 'mine_done' });
    expect(done.movies.map((m) => m.id)).toEqual([rated.id]);
    expect(done.movies[0].userScore).toBe(7);
  });
});

describe('official ranking', () => {
  it('ranks by real average score, then rating count, and requires 5 ratings', async () => {
    const nominator = await createUser();
    const raters = await createUsers(7);
    const [best, popular, plain, tooFew] = await createMovies(4);
    await nominate(nominator.id, [best.id, popular.id, plain.id, tooFew.id]);

    const rate = (movie: { id: number }, scores: number[]) =>
      prisma.imdbLtaRating.createMany({
        data: scores.map((score, i) => ({ userId: raters[i].id, movieId: movie.id, score })),
      });
    await rate(best, [10, 9, 9, 10, 9]); // avg 9.4
    await rate(popular, [8, 8, 8, 8, 8, 8, 8]); // avg 8, 7 ratings
    await rate(plain, [8, 8, 8, 8, 8]); // avg 8, 5 ratings
    await rate(tooFew, [10, 10, 10, 10]); // 4 ratings -> not qualified

    await prisma.imdbLtaConfig.create({ data: { id: 1, phase: 'RATING_OPEN' } });
    const open = await listOfficialRanking();
    expect(open.isFinal).toBe(false);
    expect(open.movies.map((m) => [m.rank, m.id])).toEqual([
      [1, best.id],
      [2, popular.id], // ties on average, more ratings wins
      [3, plain.id],
    ]);
    expect(open.movies[0].averageScore).toBeCloseTo(9.4);
    expect(open.movies[0].nominationCount).toBe(1);

    await updateImdbLtaPhase('RATING_CLOSED');
    expect((await listOfficialRanking()).isFinal).toBe(true);
  });
});

describe('admin nomination snapshot', () => {
  it('aggregates lists, nominators and per-movie counts (drafts included)', async () => {
    const [ana, bruno] = await createUsers(2);
    await prisma.user.update({ where: { id: ana.id }, data: { name: 'Ana' } });
    await prisma.user.update({ where: { id: bruno.id }, data: { name: 'Bruno' } });
    const [shared, solo] = await createMovies(2);
    await nominate(ana.id, [shared.id, solo.id]);
    await nominate(bruno.id, [shared.id]);
    await prisma.imdbLtaNominationList.update({ where: { userId: ana.id }, data: { submittedAt: new Date() } });

    const snapshot = await listAdminNominationSnapshot();

    expect(snapshot).toMatchObject({
      uniqueMovies: 2,
      totalNominations: 3,
      listCount: 2,
      submittedListCount: 1,
    });
    expect(snapshot.participants.map((p) => [p.name, p.nominationCount])).toEqual([
      ['Ana', 2],
      ['Bruno', 1],
    ]);
    expect(snapshot.movies[0]).toMatchObject({ id: shared.id, nominationCount: 2, nominators: ['Ana', 'Bruno'] });
  });
});
