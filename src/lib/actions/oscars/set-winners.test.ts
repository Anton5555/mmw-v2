import { revalidatePath } from 'next/cache';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const tx = {
    oscarCategory: { update: vi.fn() },
    $executeRaw: vi.fn(),
  };
  return {
    getSession: vi.fn(),
    tx,
    prisma: {
      oscarEdition: { findUnique: vi.fn() },
      oscarCategory: { findFirst: vi.fn() },
      oscarNominee: { findFirst: vi.fn() },
      $transaction: vi.fn(),
    },
  };
});

vi.mock('@/lib/auth', () => ({ auth: { api: { getSession: mocks.getSession } } }));
vi.mock('next/headers', () => ({ headers: vi.fn(async () => new Headers()) }));
vi.mock('@/lib/db', () => ({ prisma: mocks.prisma }));

import { setSingleWinnerAction } from './set-winners';

const input = { editionId: 7, categoryId: 3, nomineeId: 31 };

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  mocks.getSession.mockResolvedValue({ user: { id: 'admin1', role: 'admin' } });
  mocks.prisma.oscarEdition.findUnique.mockResolvedValue({ id: 7 });
  mocks.prisma.oscarCategory.findFirst.mockResolvedValue({ id: 3, winnerId: null });
  mocks.prisma.oscarNominee.findFirst.mockResolvedValue({ id: 31 });
  mocks.prisma.$transaction.mockImplementation(async (cb: (tx: typeof mocks.tx) => unknown) => cb(mocks.tx));
});

describe('setSingleWinnerAction — authorization', () => {
  it('requires a session', async () => {
    mocks.getSession.mockResolvedValue(null);
    await expect(setSingleWinnerAction(input)).rejects.toThrow('No autorizado');
  });

  it('is admin-only', async () => {
    mocks.getSession.mockResolvedValue({ user: { id: 'u1', role: 'user' } });
    await expect(setSingleWinnerAction(input)).rejects.toThrow(
      'No tienes permisos para realizar esta acción'
    );
    expect(mocks.prisma.oscarEdition.findUnique).not.toHaveBeenCalled();
  });
});

describe('setSingleWinnerAction — validation', () => {
  it('rejects malformed input', async () => {
    await expect(setSingleWinnerAction({ ...input, nomineeId: 0 })).rejects.toThrow();
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
  });

  it('404s for an unknown edition', async () => {
    mocks.prisma.oscarEdition.findUnique.mockResolvedValue(null);
    await expect(setSingleWinnerAction(input)).rejects.toThrow('Edición no encontrada');
  });

  it('scopes the category lookup to the edition', async () => {
    mocks.prisma.oscarCategory.findFirst.mockResolvedValue(null);
    await expect(setSingleWinnerAction(input)).rejects.toThrow('Categoría no encontrada');
    expect(mocks.prisma.oscarCategory.findFirst).toHaveBeenCalledWith({
      where: { id: 3, editionId: 7 },
      select: { id: true, winnerId: true },
    });
  });

  it('never overwrites an existing winner', async () => {
    mocks.prisma.oscarCategory.findFirst.mockResolvedValue({ id: 3, winnerId: 30 });
    await expect(setSingleWinnerAction(input)).rejects.toThrow(
      'Esta categoría ya tiene un ganador asignado'
    );
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
  });

  it('requires the nominee to belong to the category', async () => {
    mocks.prisma.oscarNominee.findFirst.mockResolvedValue(null);
    await expect(setSingleWinnerAction(input)).rejects.toThrow(
      'El nominado no pertenece a esta categoría'
    );
    expect(mocks.prisma.oscarNominee.findFirst).toHaveBeenCalledWith({
      where: { id: 31, categoryId: 3 },
      select: { id: true },
    });
  });
});

describe('setSingleWinnerAction — saving', () => {
  it('sets the winner, recomputes ballot scores in the same transaction, and revalidates', async () => {
    await expect(setSingleWinnerAction(input)).resolves.toEqual({ success: true });

    expect(mocks.tx.oscarCategory.update).toHaveBeenCalledWith({
      where: { id: 3 },
      data: { winnerId: 31 },
    });
    // Tagged template: (strings, ...values) — the edition id is the only interpolated value.
    expect(mocks.tx.$executeRaw).toHaveBeenCalledOnce();
    const [strings, ...values] = mocks.tx.$executeRaw.mock.calls[0];
    expect(strings.join('?')).toContain('UPDATE "OscarBallot"');
    expect(values).toEqual([7]);

    for (const path of ['/oscars', '/oscars/admin', '/oscars/results']) {
      expect(revalidatePath).toHaveBeenCalledWith(path);
    }
  });

  it('hides database errors behind a friendly message and does not revalidate', async () => {
    mocks.prisma.$transaction.mockRejectedValue(new Error('deadlock'));
    await expect(setSingleWinnerAction(input)).rejects.toThrow('Error al guardar el ganador');
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
