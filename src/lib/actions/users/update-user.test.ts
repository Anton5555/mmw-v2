import { revalidatePath } from 'next/cache';
import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  updateUser: vi.fn(),
  authUpdateUser: vi.fn(),
  headers: vi.fn(),
}));

vi.mock('@/lib/api/users', () => ({ updateUser: mocks.updateUser }));
vi.mock('@/lib/auth', () => ({ auth: { api: { updateUser: mocks.authUpdateUser } } }));
vi.mock('next/headers', () => ({ headers: mocks.headers }));

import { updateUserAction } from './update-user';

const profile = { name: 'Ana', image: 'https://img/ana.png' } as never;

describe('updateUserAction', () => {
  it('saves the profile, syncs the auth session with the saved values, and revalidates', async () => {
    const requestHeaders = new Headers({ cookie: 'session=abc' });
    mocks.headers.mockResolvedValue(requestHeaders);
    mocks.updateUser.mockResolvedValue({ name: 'Ana (saved)', image: 'https://img/saved.png' });

    const result = await updateUserAction(profile);

    expect(mocks.updateUser).toHaveBeenCalledWith(profile);
    expect(mocks.authUpdateUser).toHaveBeenCalledWith({
      headers: requestHeaders,
      body: { name: 'Ana (saved)', image: 'https://img/saved.png' },
    });
    expect(revalidatePath).toHaveBeenCalledWith('/');
    expect(result).toEqual({ name: 'Ana (saved)', image: 'https://img/saved.png' });
  });

  it('does not touch the auth session or cache when saving fails', async () => {
    mocks.updateUser.mockRejectedValue(new Error('db down'));

    await expect(updateUserAction(profile)).rejects.toThrow('db down');

    expect(mocks.authUpdateUser).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
