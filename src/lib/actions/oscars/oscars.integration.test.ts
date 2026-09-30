import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  sendBallotEmail: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ auth: { api: { getSession: mocks.getSession } } }));
vi.mock('next/headers', () => ({ headers: vi.fn(async () => new Headers()) }));
vi.mock('@/lib/utils/emails', () => ({ sendBallotEmail: mocks.sendBallotEmail }));

import { prisma, resetDatabase } from '../../../../tests/integration/db';
import { createOscarEdition, createUser, createUsers } from '../../../../tests/integration/factories';
import {
  getOscarLeaderboard,
  getOscarPredictionStats,
  getUserBallot,
  hasUserVoted,
} from '../../api/oscars';
import { setSingleWinnerAction } from './set-winners';
import { submitBallotAction } from './submit-ballot';

type Edition = Awaited<ReturnType<typeof createOscarEdition>>;
type User = Awaited<ReturnType<typeof createUser>>;

const signInAs = (user: Pick<User, 'id' | 'email' | 'name'>, role: string = 'user') =>
  mocks.getSession.mockResolvedValue({ user: { id: user.id, email: user.email, name: user.name, role } });

/** `picks[i]` is the index of the nominee chosen in category i. */
const selectionsFor = (edition: Edition, picks: number[]) =>
  Object.fromEntries(edition.categories.map((c, i) => [String(c.id), c.nominees[picks[i]].id]));

async function submitAs(user: User, edition: Edition, picks: number[]) {
  signInAs(user);
  return submitBallotAction({ editionId: edition.id, selections: selectionsFor(edition, picks) });
}

async function setWinnerAs(admin: User, edition: Edition, categoryIndex: number, nomineeIndex: number) {
  signInAs(admin, 'admin');
  const category = edition.categories[categoryIndex];
  return setSingleWinnerAction({
    editionId: edition.id,
    categoryId: category.id,
    nomineeId: category.nominees[nomineeIndex].id,
  });
}

beforeEach(async () => {
  await resetDatabase();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  mocks.sendBallotEmail.mockResolvedValue(undefined);
});

describe('submitting a ballot', () => {
  it('stores the ballot with one pick per category in a single transaction', async () => {
    const user = await createUser();
    const edition = await createOscarEdition({ categories: 3 });

    const result = await submitAs(user, edition, [0, 1, 2]);

    expect(result.success).toBe(true);
    const ballot = await prisma.oscarBallot.findUniqueOrThrow({
      where: { id: result.ballotId },
      include: { picks: { orderBy: { categoryId: 'asc' } } },
    });
    expect(ballot).toMatchObject({ userId: user.id, editionId: edition.id, score: null });
    expect(ballot.picks.map((p) => p.nomineeId)).toEqual([
      edition.categories[0].nominees[0].id,
      edition.categories[1].nominees[1].id,
      edition.categories[2].nominees[2].id,
    ]);
    expect(mocks.sendBallotEmail).toHaveBeenCalledOnce();
  });

  it('rejects a second ballot for the same edition and leaves the first untouched', async () => {
    const user = await createUser();
    const edition = await createOscarEdition();
    await submitAs(user, edition, [0, 0]);

    await expect(submitAs(user, edition, [1, 1])).rejects.toThrow('Ya has enviado Los Oscalos para esta edición');

    expect(await prisma.oscarBallot.count()).toBe(1);
    const ballot = await getUserBallot(user.id, edition.id);
    expect(ballot?.picks.map((p) => p.nomineeId)).toEqual([
      edition.categories[0].nominees[0].id,
      edition.categories[1].nominees[0].id,
    ]);
    // The failed attempt's picks were rolled back with its ballot.
    expect(await prisma.oscarPick.count()).toBe(2);
  });

  it('turns a simultaneous double-submit into a single ballot', async () => {
    const user = await createUser();
    const edition = await createOscarEdition();
    signInAs(user);
    const input = { editionId: edition.id, selections: selectionsFor(edition, [0, 0]) };

    const results = await Promise.allSettled([submitBallotAction(input), submitBallotAction(input)]);

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(await prisma.oscarBallot.count()).toBe(1);
    expect(await prisma.oscarPick.count()).toBe(2);
  });

  it("refuses nominees from another category and writes nothing", async () => {
    const user = await createUser();
    const edition = await createOscarEdition();
    signInAs(user);
    const [first, second] = edition.categories;

    await expect(
      submitBallotAction({
        editionId: edition.id,
        selections: { [String(first.id)]: first.nominees[0].id, [String(second.id)]: first.nominees[1].id },
      })
    ).rejects.toThrow(/no pertenece a la categoría/);

    expect(await prisma.oscarBallot.count()).toBe(0);
    expect(await prisma.oscarPick.count()).toBe(0);
  });

  it('refuses incomplete ballots and inactive editions', async () => {
    const user = await createUser();
    const edition = await createOscarEdition();
    const closed = await createOscarEdition({ year: 2025, isActive: false });
    signInAs(user);

    await expect(
      submitBallotAction({
        editionId: edition.id,
        selections: { [String(edition.categories[0].id)]: edition.categories[0].nominees[0].id },
      })
    ).rejects.toThrow('Debes seleccionar un nominado para cada categoría');
    await expect(submitAs(user, closed, [0, 0])).rejects.toThrow('Esta edición ya no acepta votos');

    expect(await prisma.oscarBallot.count()).toBe(0);
  });

  it('blocks submissions within 3 hours of the ceremony', async () => {
    const user = await createUser();
    const edition = await createOscarEdition({ ceremonyDate: new Date(Date.now() + 2 * 3_600_000) });

    await expect(submitAs(user, edition, [0, 0])).rejects.toThrow(/formulario está bloqueado/);
    expect(await prisma.oscarBallot.count()).toBe(0);
  });

  it('hasUserVoted reflects the stored ballot', async () => {
    const [voter, lurker] = await createUsers(2);
    const edition = await createOscarEdition();
    await submitAs(voter, edition, [0, 0]);

    await expect(hasUserVoted(voter.id, edition.id)).resolves.toBe(true);
    await expect(hasUserVoted(lurker.id, edition.id)).resolves.toBe(false);
  });
});

describe('announcing winners', () => {
  it('recomputes ballot scores with the raw SQL and ranks the leaderboard', async () => {
    const [admin, alice, bob, carol] = await createUsers(4);
    const edition = await createOscarEdition({ categories: 2, nomineesPerCategory: 3 });
    await submitAs(alice, edition, [0, 0]);
    await submitAs(bob, edition, [0, 1]);
    await submitAs(carol, edition, [1, 1]);

    // Nothing announced yet: scores are still unset and nobody is a winner.
    let board = await getOscarLeaderboard(edition.id);
    expect(board.every((entry) => entry.score === 0 && !entry.isWinner)).toBe(true);

    // Category 1 goes to nominee 0: Alice and Bob were right.
    await expect(setWinnerAs(admin, edition, 0, 0)).resolves.toEqual({ success: true });
    board = await getOscarLeaderboard(edition.id);
    expect(board.map((e) => [e.userId, e.score, e.rank, e.isWinner])).toEqual([
      [alice.id, 1, 1, true],
      [bob.id, 1, 1, true],
      [carol.id, 0, 3, false],
    ]);

    // Category 2 goes to nominee 1: Bob and Carol were right. Scores accumulate.
    await setWinnerAs(admin, edition, 1, 1);
    board = await getOscarLeaderboard(edition.id);
    expect(board.map((e) => [e.userId, e.score, e.rank, e.isWinner])).toEqual([
      [bob.id, 2, 1, true],
      [alice.id, 1, 2, false],
      [carol.id, 1, 2, false],
    ]);
  });

  it('only rescores ballots of the edition being updated', async () => {
    const [admin, alice, bob] = await createUsers(3);
    const current = await createOscarEdition({ year: 2026 });
    const other = await createOscarEdition({ year: 2025 });
    await submitAs(alice, current, [0, 0]);
    await submitAs(bob, other, [0, 0]);

    await setWinnerAs(admin, current, 0, 0);

    const scores = await prisma.oscarBallot.findMany({ select: { userId: true, score: true } });
    expect(scores.find((b) => b.userId === alice.id)?.score).toBe(1);
    expect(scores.find((b) => b.userId === bob.id)?.score).toBeNull();
  });

  it('never overwrites an existing winner and rejects foreign nominees', async () => {
    const admin = await createUser();
    const edition = await createOscarEdition();
    await setWinnerAs(admin, edition, 0, 0);

    await expect(setWinnerAs(admin, edition, 0, 1)).rejects.toThrow('Esta categoría ya tiene un ganador asignado');
    await expect(
      setSingleWinnerAction({
        editionId: edition.id,
        categoryId: edition.categories[1].id,
        nomineeId: edition.categories[0].nominees[0].id, // belongs to category 1
      })
    ).rejects.toThrow('El nominado no pertenece a esta categoría');

    const categories = await prisma.oscarCategory.findMany({ orderBy: { order: 'asc' } });
    expect(categories.map((c) => c.winnerId)).toEqual([edition.categories[0].nominees[0].id, null]);
  });

  it('is admin-only', async () => {
    const user = await createUser();
    const edition = await createOscarEdition();

    signInAs(user, 'user');
    await expect(
      setSingleWinnerAction({
        editionId: edition.id,
        categoryId: edition.categories[0].id,
        nomineeId: edition.categories[0].nominees[0].id,
      })
    ).rejects.toThrow('No tienes permisos');

    expect((await prisma.oscarCategory.findMany()).every((c) => c.winnerId === null)).toBe(true);
  });
});

describe('prediction stats', () => {
  it('counts real picks per nominee, keeps the top 3, and attaches the winner', async () => {
    const [admin, ...voters] = await createUsers(5);
    const edition = await createOscarEdition({ categories: 1, nomineesPerCategory: 4 });
    // 2 votes for nominee 0, 1 each for nominees 1 and 2, none for nominee 3.
    const choices = [0, 0, 1, 2];
    for (const [i, choice] of choices.entries()) {
      await submitAs(voters[i], edition, [choice]);
    }
    await setWinnerAs(admin, edition, 0, 1);

    const [stats] = await getOscarPredictionStats(edition.id);

    const nominees = edition.categories[0].nominees;
    expect(stats.totalVotes).toBe(4);
    expect(stats.topPicks[0]).toMatchObject({ nomineeId: nominees[0].id, count: 2, percentage: 50 });
    expect(stats.topPicks).toHaveLength(3);
    expect(stats.topPicks.map((p) => p.nomineeId)).not.toContain(nominees[3].id);
    expect(stats.winner).toMatchObject({ nomineeId: nominees[1].id, nomineeName: nominees[1].name });
  });
});

describe('referential integrity', () => {
  it('deleting an edition cascades to categories, nominees, ballots and picks', async () => {
    const user = await createUser();
    const edition = await createOscarEdition();
    await submitAs(user, edition, [0, 0]);

    await prisma.oscarEdition.delete({ where: { id: edition.id } });

    expect(await prisma.oscarCategory.count()).toBe(0);
    expect(await prisma.oscarNominee.count()).toBe(0);
    expect(await prisma.oscarBallot.count()).toBe(0);
    expect(await prisma.oscarPick.count()).toBe(0);
    expect(await prisma.user.count()).toBe(1);
  });
});
