import { revalidateTag } from 'next/cache';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  eventCreate: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ auth: { api: { getSession: mocks.getSession } } }));
vi.mock('@/lib/db', () => ({ prisma: { event: { create: mocks.eventCreate } } }));
vi.mock('next/headers', () => ({ headers: vi.fn(async () => new Headers()) }));

import { createEventAction } from './create-event';

const input = {
  title: 'Cine',
  description: 'Ronin',
  month: 3,
  day: 5,
  type: 'OTHER' as const,
  year: 2026,
  time: undefined,
};

beforeEach(() => {
  mocks.eventCreate.mockImplementation(async ({ data }) => data);
});

describe('createEventAction', () => {
  it('rejects unauthenticated callers without touching the database', async () => {
    mocks.getSession.mockResolvedValue(null);
    await expect(createEventAction(input)).rejects.toThrow('No autorizado');
    expect(mocks.eventCreate).not.toHaveBeenCalled();
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it('creates the event attributed to the session user and revalidates the events cache', async () => {
    mocks.getSession.mockResolvedValue({ user: { id: 'user-1' } });
    const result = await createEventAction(input);

    expect(mocks.eventCreate).toHaveBeenCalledOnce();
    const { data } = mocks.eventCreate.mock.calls[0][0];
    expect(data).toMatchObject({ title: 'Cine', createdBy: 'user-1', month: 3, day: 5 });
    expect(data.id).toEqual(expect.any(String));
    expect(result).toEqual({ success: true, event: data });
    expect(revalidateTag).toHaveBeenCalledWith('events', 'max');
  });
});
