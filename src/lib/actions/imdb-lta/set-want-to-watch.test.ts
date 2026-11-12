import { revalidatePath } from 'next/cache';
import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  setWantToWatch: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ auth: { api: { getSession: mocks.getSession } } }));
vi.mock('next/headers', () => ({ headers: vi.fn(async () => new Headers()) }));
vi.mock('@/lib/api/imdb-lta', () => ({ setWantToWatch: mocks.setWantToWatch }));

import { setWantToWatchAction } from './set-want-to-watch';

describe('setWantToWatchAction', () => {
  it('requires a session', async () => {
    mocks.getSession.mockResolvedValue(null);
    await expect(setWantToWatchAction(1, true)).rejects.toThrow('No autorizado');
    expect(mocks.setWantToWatch).not.toHaveBeenCalled();
  });

  it.each([
    [0, true],
    [-1, false],
    [1.5, true],
  ])('validates the movie id (%d)', async (movieId, pinned) => {
    mocks.getSession.mockResolvedValue({ user: { id: 'u1' } });
    await expect(setWantToWatchAction(movieId, pinned)).rejects.toThrow();
    expect(mocks.setWantToWatch).not.toHaveBeenCalled();
  });

  it('pins for the session user and revalidates the rating pages', async () => {
    mocks.getSession.mockResolvedValue({ user: { id: 'u1' } });
    mocks.setWantToWatch.mockResolvedValue({ movieId: 7, wantToWatch: true });

    await expect(setWantToWatchAction(7, true)).resolves.toEqual({
      movieId: 7,
      wantToWatch: true,
    });
    expect(mocks.setWantToWatch).toHaveBeenCalledWith('u1', 7, true);
    expect(revalidatePath).toHaveBeenCalledWith('/imdb-lta/rate');
  });
});
