import { revalidatePath } from 'next/cache';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const tx = {
    oscarBallot: { create: vi.fn() },
    oscarPick: { create: vi.fn() },
  };
  return {
    getSession: vi.fn(),
    sendBallotEmail: vi.fn(),
    tx,
    prisma: {
      oscarEdition: { findUnique: vi.fn() },
      oscarCategory: { findMany: vi.fn() },
      oscarNominee: { findFirst: vi.fn() },
      oscarBallot: { findUnique: vi.fn() },
      $transaction: vi.fn(),
    },
  };
});

vi.mock('@/lib/auth', () => ({ auth: { api: { getSession: mocks.getSession } } }));
vi.mock('next/headers', () => ({ headers: vi.fn(async () => new Headers()) }));
vi.mock('@/lib/db', () => ({ prisma: mocks.prisma }));
vi.mock('@/lib/utils/emails', () => ({ sendBallotEmail: mocks.sendBallotEmail }));

import { submitBallotAction } from './submit-ballot';

const NOW = new Date('2026-03-01T12:00:00Z');
const SESSION = { user: { id: 'u1', email: 'ana@example.com', name: 'Ana' } };
const input = { editionId: 7, selections: { '1': 11, '2': 21 } };

const uniqueViolation = () => Object.assign(new Error('unique'), { code: 'P2002' });

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  vi.spyOn(console, 'error').mockImplementation(() => {});

  mocks.getSession.mockResolvedValue(SESSION);
  mocks.prisma.oscarEdition.findUnique.mockResolvedValue({
    isActive: true,
    ceremonyDate: null,
    year: 2026,
  });
  mocks.prisma.oscarCategory.findMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);
  mocks.prisma.oscarNominee.findFirst.mockResolvedValue({ id: 1 });
  mocks.prisma.$transaction.mockImplementation(async (cb: (tx: typeof mocks.tx) => unknown) => cb(mocks.tx));
  mocks.tx.oscarBallot.create.mockResolvedValue({ id: 'ballot-1' });
  mocks.tx.oscarPick.create.mockImplementation(async ({ data }) => data);
  mocks.prisma.oscarBallot.findUnique.mockResolvedValue({
    picks: [
      {
        category: { name: 'Best Picture' },
        nominee: { name: 'Anora', filmTitle: null },
      },
    ],
  });
  mocks.sendBallotEmail.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('submitBallotAction — guards', () => {
  it('requires a session', async () => {
    mocks.getSession.mockResolvedValue(null);
    await expect(submitBallotAction(input)).rejects.toThrow('No autorizado');
  });

  it('validates the payload shape', async () => {
    await expect(submitBallotAction({ editionId: -1, selections: {} })).rejects.toThrow();
    await expect(
      submitBallotAction({ editionId: 7, selections: { '1': 0 } })
    ).rejects.toThrow();
    expect(mocks.prisma.oscarEdition.findUnique).not.toHaveBeenCalled();
  });

  it('404s for an unknown edition', async () => {
    mocks.prisma.oscarEdition.findUnique.mockResolvedValue(null);
    await expect(submitBallotAction(input)).rejects.toThrow('Edición no encontrada');
  });

  it('rejects inactive editions', async () => {
    mocks.prisma.oscarEdition.findUnique.mockResolvedValue({ isActive: false, ceremonyDate: null, year: 2026 });
    await expect(submitBallotAction(input)).rejects.toThrow('Esta edición ya no acepta votos');
  });
});

describe('submitBallotAction — ceremony cutoff (3h before)', () => {
  const ceremonyIn = (hours: number) => new Date(NOW.getTime() + hours * 3_600_000);

  it('blocks submissions once within 3 hours of the ceremony', async () => {
    mocks.prisma.oscarEdition.findUnique.mockResolvedValue({
      isActive: true,
      ceremonyDate: ceremonyIn(2.9),
      year: 2026,
    });
    await expect(submitBallotAction(input)).rejects.toThrow(/formulario está bloqueado/);
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
  });

  it('blocks exactly at the cutoff', async () => {
    mocks.prisma.oscarEdition.findUnique.mockResolvedValue({
      isActive: true,
      ceremonyDate: ceremonyIn(3),
      year: 2026,
    });
    await expect(submitBallotAction(input)).rejects.toThrow(/bloqueado/);
  });

  it('allows submissions before the cutoff', async () => {
    mocks.prisma.oscarEdition.findUnique.mockResolvedValue({
      isActive: true,
      ceremonyDate: ceremonyIn(3.1),
      year: 2026,
    });
    await expect(submitBallotAction(input)).resolves.toMatchObject({ success: true });
  });
});

describe('submitBallotAction — selection validation', () => {
  it('requires one selection per category (count mismatch)', async () => {
    mocks.prisma.oscarCategory.findMany.mockResolvedValue([{ id: 1 }, { id: 2 }, { id: 3 }]);
    await expect(submitBallotAction(input)).rejects.toThrow(
      'Debes seleccionar un nominado para cada categoría'
    );
  });

  it('rejects selections for categories outside the edition', async () => {
    await expect(
      submitBallotAction({ editionId: 7, selections: { '1': 11, '99': 5 } })
    ).rejects.toThrow('Falta la selección para la categoría 2');
  });

  it("rejects nominees that don't belong to their category", async () => {
    mocks.prisma.oscarNominee.findFirst.mockResolvedValueOnce({ id: 11 }).mockResolvedValueOnce(null);
    await expect(submitBallotAction(input)).rejects.toThrow(
      'El nominado 21 no pertenece a la categoría 2'
    );
    expect(mocks.prisma.oscarNominee.findFirst).toHaveBeenCalledWith({
      where: { id: 21, categoryId: 2 },
      select: { id: true },
    });
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
  });
});

describe('submitBallotAction — saving', () => {
  it('creates the ballot and one pick per category, then revalidates', async () => {
    const result = await submitBallotAction(input);

    expect(result).toEqual({ success: true, ballotId: 'ballot-1' });
    expect(mocks.tx.oscarBallot.create).toHaveBeenCalledWith({ data: { userId: 'u1', editionId: 7 } });
    expect(mocks.tx.oscarPick.create).toHaveBeenCalledTimes(2);
    expect(mocks.tx.oscarPick.create).toHaveBeenCalledWith({
      data: { ballotId: 'ballot-1', categoryId: 1, nomineeId: 11 },
    });
    expect(mocks.tx.oscarPick.create).toHaveBeenCalledWith({
      data: { ballotId: 'ballot-1', categoryId: 2, nomineeId: 21 },
    });
    expect(revalidatePath).toHaveBeenCalledWith('/oscars');
    expect(revalidatePath).toHaveBeenCalledWith('/oscars/results');
  });

  it('emails the picks to the user', async () => {
    await submitBallotAction(input);
    expect(mocks.sendBallotEmail).toHaveBeenCalledWith({
      to: 'ana@example.com',
      userName: 'Ana',
      editionYear: 2026,
      picks: [{ category: { name: 'Best Picture' }, nominee: { name: 'Anora', filmTitle: null } }],
    });
  });

  it('skips the email when the user has none', async () => {
    mocks.getSession.mockResolvedValue({ user: { id: 'u1', email: '', name: 'Ana' } });
    await expect(submitBallotAction(input)).resolves.toMatchObject({ success: true });
    expect(mocks.sendBallotEmail).not.toHaveBeenCalled();
  });

  it('still succeeds when the confirmation email fails', async () => {
    mocks.sendBallotEmail.mockRejectedValue(new Error('resend down'));
    await expect(submitBallotAction(input)).resolves.toEqual({ success: true, ballotId: 'ballot-1' });
  });

  it('maps a duplicate ballot (unique violation) to a friendly error', async () => {
    mocks.prisma.$transaction.mockRejectedValue(uniqueViolation());
    await expect(submitBallotAction(input)).rejects.toThrow(
      'Ya has enviado Los Oscalos para esta edición'
    );
    expect(revalidatePath).not.toHaveBeenCalled();
    expect(mocks.sendBallotEmail).not.toHaveBeenCalled();
  });

  it('rethrows unexpected database errors', async () => {
    mocks.prisma.$transaction.mockRejectedValue(new Error('db down'));
    await expect(submitBallotAction(input)).rejects.toThrow('db down');
  });
});
