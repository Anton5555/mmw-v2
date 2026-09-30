import { revalidatePath } from 'next/cache';
import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  submitRating: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ auth: { api: { getSession: mocks.getSession } } }));
vi.mock('next/headers', () => ({ headers: vi.fn(async () => new Headers()) }));
vi.mock('@/lib/api/imdb-lta', () => ({ submitRating: mocks.submitRating }));

import { submitRatingAction } from './submit-rating';

describe('submitRatingAction', () => {
  it('requires a session', async () => {
    mocks.getSession.mockResolvedValue(null);
    await expect(submitRatingAction(1, 5)).rejects.toThrow('No autorizado');
    expect(mocks.submitRating).not.toHaveBeenCalled();
  });

  it.each([
    [1, 11],
    [1, -1],
    [1, 7.5],
    [0, 5],
  ])('validates input before calling the API (movieId=%d, score=%d)', async (movieId, score) => {
    mocks.getSession.mockResolvedValue({ user: { id: 'u1' } });
    await expect(submitRatingAction(movieId, score)).rejects.toThrow();
    expect(mocks.submitRating).not.toHaveBeenCalled();
  });

  it('submits for the session user and revalidates the IMDB LTA pages', async () => {
    mocks.getSession.mockResolvedValue({ user: { id: 'u1' } });
    mocks.submitRating.mockResolvedValue({ id: 1, movieId: 3, score: 9 });

    await expect(submitRatingAction(3, 9)).resolves.toEqual({ id: 1, movieId: 3, score: 9 });
    expect(mocks.submitRating).toHaveBeenCalledWith('u1', 3, 9);
    expect(revalidatePath).toHaveBeenCalledWith('/imdb-lta');
    expect(revalidatePath).toHaveBeenCalledWith('/imdb-lta/rate');
    expect(revalidatePath).toHaveBeenCalledWith('/imdb-lta/ranking');
  });
});
