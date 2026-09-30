import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  user: { findUnique: vi.fn(), update: vi.fn() },
  uploadFile: vi.fn(),
  deleteFile: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ auth: { api: { getSession: mocks.getSession } } }));
vi.mock('../auth', () => ({ auth: { api: { getSession: mocks.getSession } } }));
vi.mock('next/headers', () => ({ headers: vi.fn(async () => new Headers()) }));
vi.mock('@/lib/db', () => ({ prisma: { user: mocks.user } }));
vi.mock('../utils/s3', () => ({ uploadFile: mocks.uploadFile, deleteFile: mocks.deleteFile }));
vi.mock('uuid', () => ({ v4: () => 'fixed-uuid' }));

import { updateUser } from './users';

const PUBLIC_URL = 'http://localhost:9000/public';
const profile = (image: File | string | null) => ({ name: 'Ana', email: 'ana@example.com', image });

beforeEach(() => {
  mocks.getSession.mockResolvedValue({ user: { id: 'u1' } });
  mocks.user.findUnique.mockResolvedValue({ id: 'u1', image: null });
  mocks.user.update.mockImplementation(async ({ data }) => ({ id: 'u1', ...data }));
});

describe('updateUser', () => {
  it('requires a session', async () => {
    mocks.getSession.mockResolvedValue(null);
    await expect(updateUser(profile(null))).rejects.toThrow('No session found');
  });

  it('fails if the user row is missing', async () => {
    mocks.user.findUnique.mockResolvedValue(null);
    await expect(updateUser(profile(null))).rejects.toThrow('User not found');
    expect(mocks.user.update).not.toHaveBeenCalled();
  });

  it('updates only the session user, keeping the current image when none is uploaded', async () => {
    mocks.user.findUnique.mockResolvedValue({ id: 'u1', image: 'https://cdn/old.png' });

    await updateUser(profile('https://cdn/old.png'));

    expect(mocks.uploadFile).not.toHaveBeenCalled();
    expect(mocks.deleteFile).not.toHaveBeenCalled();
    expect(mocks.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { name: 'Ana', image: 'https://cdn/old.png' },
    });
  });

  it('uploads a new file under a uuid key keeping its extension', async () => {
    const file = new File(['x'], 'me.photo.PNG', { type: 'image/png' });

    const result = await updateUser(profile(file));

    expect(mocks.uploadFile).toHaveBeenCalledWith({ file, key: 'fixed-uuid.PNG', bucket: 'users' });
    expect(mocks.deleteFile).not.toHaveBeenCalled(); // nothing to clean up
    expect(result.image).toBe(`${PUBLIC_URL}/users/fixed-uuid.PNG`);
  });

  it('deletes the previous image (by its storage key) after uploading the new one', async () => {
    mocks.user.findUnique.mockResolvedValue({ id: 'u1', image: `${PUBLIC_URL}/users/old-key.jpg` });
    const order: string[] = [];
    mocks.uploadFile.mockImplementation(async () => order.push('upload'));
    mocks.deleteFile.mockImplementation(async () => order.push('delete'));

    await updateUser(profile(new File(['x'], 'new.jpg')));

    expect(mocks.deleteFile).toHaveBeenCalledWith({ key: 'old-key.jpg', bucket: 'users' });
    expect(order).toEqual(['upload', 'delete']);
  });

  it('does not save anything if the upload fails', async () => {
    mocks.uploadFile.mockRejectedValue(new Error('s3 down'));
    await expect(updateUser(profile(new File(['x'], 'new.jpg')))).rejects.toThrow('s3 down');
    expect(mocks.user.update).not.toHaveBeenCalled();
  });
});
