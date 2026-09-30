import { updateTag } from 'next/cache';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  event: { findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
}));

vi.mock('@/lib/auth', () => ({ auth: { api: { getSession: mocks.getSession } } }));
vi.mock('next/headers', () => ({ headers: vi.fn(async () => new Headers()) }));
vi.mock('@/lib/db', () => ({ prisma: { event: mocks.event } }));

import { deleteEventAction } from './delete-event';
import { updateEventAction } from './update-event';

const input = {
  title: 'Renamed',
  description: 'Updated',
  month: 4,
  day: 9,
  type: 'OTHER' as const,
  year: 2026,
  time: undefined,
};

beforeEach(() => {
  mocks.getSession.mockResolvedValue({ user: { id: 'me' } });
});

describe.each([
  ['updateEventAction', () => updateEventAction('e1', input)],
  ['deleteEventAction', () => deleteEventAction('e1')],
] as const)('%s guards', (_name, run) => {
  it('requires a session', async () => {
    mocks.getSession.mockResolvedValue(null);
    await expect(run()).rejects.toThrow('No autorizado');
    expect(mocks.event.findUnique).not.toHaveBeenCalled();
  });

  it('404s for unknown events', async () => {
    mocks.event.findUnique.mockResolvedValue(null);
    await expect(run()).rejects.toThrow('Evento no encontrado');
  });

  it("only lets the creator touch an event", async () => {
    mocks.event.findUnique.mockResolvedValue({ createdBy: 'someone-else' });
    await expect(run()).rejects.toThrow('No autorizado');
    expect(mocks.event.update).not.toHaveBeenCalled();
    expect(mocks.event.delete).not.toHaveBeenCalled();
    expect(updateTag).not.toHaveBeenCalled();
  });
});

describe('updateEventAction', () => {
  it('updates the event fields (never the creator) and invalidates the events cache', async () => {
    mocks.event.findUnique.mockResolvedValue({ createdBy: 'me' });
    mocks.event.update.mockImplementation(async ({ data }) => ({ id: 'e1', ...data }));

    const result = await updateEventAction('e1', input);

    const call = mocks.event.update.mock.calls[0][0];
    expect(call.where).toEqual({ id: 'e1' });
    expect(call.data).toEqual({
      title: 'Renamed',
      description: 'Updated',
      month: 4,
      day: 9,
      year: 2026,
      time: undefined,
      type: 'OTHER',
    });
    expect(call.data).not.toHaveProperty('createdBy');
    expect(result).toMatchObject({ success: true, event: { id: 'e1', title: 'Renamed' } });
    expect(updateTag).toHaveBeenCalledWith('events');
  });
});

describe('deleteEventAction', () => {
  it('deletes the event and invalidates the events cache', async () => {
    mocks.event.findUnique.mockResolvedValue({ createdBy: 'me' });

    await expect(deleteEventAction('e1')).resolves.toEqual({ success: true });

    expect(mocks.event.delete).toHaveBeenCalledWith({ where: { id: 'e1' } });
    expect(updateTag).toHaveBeenCalledWith('events');
  });
});
