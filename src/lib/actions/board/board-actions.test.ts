import { revalidatePath } from 'next/cache';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  flags: { BOARD_ENABLED: true },
  getSession: vi.fn(),
  boardPost: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  transaction: vi.fn(),
}));

vi.mock('@/lib/config/features', () => ({
  get BOARD_ENABLED() {
    return mocks.flags.BOARD_ENABLED;
  },
}));
vi.mock('@/lib/auth', () => ({ auth: { api: { getSession: mocks.getSession } } }));
vi.mock('next/headers', () => ({ headers: vi.fn(async () => new Headers()) }));
vi.mock('@/lib/db', () => ({
  prisma: { boardPost: mocks.boardPost, $transaction: mocks.transaction },
}));

import { createBoardPostAction } from './create-board-post';
import { deleteBoardPostAction } from './delete-board-post';
import { reorderBoardPostsAction } from './reorder-board-posts';
import { updateBoardPostAction } from './update-board-post';

const ME = { user: { id: 'me' } };

beforeEach(() => {
  mocks.flags.BOARD_ENABLED = true;
  mocks.getSession.mockResolvedValue(ME);
  mocks.transaction.mockImplementation(async (ops: unknown[]) => ops);
});

const allActions: Array<[string, () => Promise<unknown>]> = [
  ['create', () => createBoardPostAction({ title: 't', description: 'd' })],
  ['update', () => updateBoardPostAction({ id: 'p1', title: 't' })],
  ['delete', () => deleteBoardPostAction('p1')],
  ['reorder', () => reorderBoardPostsAction([{ id: 'p1', order: 0 }])],
];

describe.each(allActions)('board %s action guards', (_name, run) => {
  it('is blocked while the board feature flag is off', async () => {
    mocks.flags.BOARD_ENABLED = false;
    await expect(run()).rejects.toThrow('Tablero deshabilitado');
    expect(mocks.getSession).not.toHaveBeenCalled();
  });

  it('requires a session', async () => {
    mocks.getSession.mockResolvedValue(null);
    await expect(run()).rejects.toThrow('No autorizado');
  });
});

describe('createBoardPostAction', () => {
  it('appends the post after the current highest order', async () => {
    mocks.boardPost.findFirst.mockResolvedValue({ order: 4 });
    mocks.boardPost.create.mockImplementation(async ({ data }) => ({ id: 'new', ...data }));

    const result = await createBoardPostAction({ title: 'Hi', description: 'Body' });

    expect(mocks.boardPost.create.mock.calls[0][0].data).toEqual({
      title: 'Hi',
      description: 'Body',
      order: 5,
      createdBy: 'me',
    });
    expect(result).toMatchObject({ success: true, post: { id: 'new', order: 5 } });
    expect(revalidatePath).toHaveBeenCalledWith('/board');
  });

  it('starts at order 0 on an empty board', async () => {
    mocks.boardPost.findFirst.mockResolvedValue(null);
    mocks.boardPost.create.mockImplementation(async ({ data }) => data);

    await createBoardPostAction({ title: 'First', description: '' });

    expect(mocks.boardPost.create.mock.calls[0][0].data.order).toBe(0);
  });
});

describe('updateBoardPostAction', () => {
  it('404s for unknown posts', async () => {
    mocks.boardPost.findUnique.mockResolvedValue(null);
    await expect(updateBoardPostAction({ id: 'x', title: 't' })).rejects.toThrow('Post no encontrado');
  });

  it("refuses to edit someone else's post", async () => {
    mocks.boardPost.findUnique.mockResolvedValue({ createdBy: 'other' });
    await expect(updateBoardPostAction({ id: 'p1', title: 't' })).rejects.toThrow('No autorizado');
    expect(mocks.boardPost.update).not.toHaveBeenCalled();
  });

  it('only writes the fields that were provided', async () => {
    mocks.boardPost.findUnique.mockResolvedValue({ createdBy: 'me' });
    mocks.boardPost.update.mockResolvedValue({ id: 'p1' });

    await updateBoardPostAction({ id: 'p1', description: 'new body' });

    expect(mocks.boardPost.update.mock.calls[0][0]).toMatchObject({
      where: { id: 'p1' },
      data: { description: 'new body' },
    });
    expect(mocks.boardPost.update.mock.calls[0][0].data).not.toHaveProperty('title');
    expect(revalidatePath).toHaveBeenCalledWith('/board');
  });
});

describe('deleteBoardPostAction', () => {
  it('404s for unknown posts', async () => {
    mocks.boardPost.findUnique.mockResolvedValue(null);
    await expect(deleteBoardPostAction('x')).rejects.toThrow('Post no encontrado');
  });

  it("refuses to delete someone else's post", async () => {
    mocks.boardPost.findUnique.mockResolvedValue({ createdBy: 'other' });
    await expect(deleteBoardPostAction('p1')).rejects.toThrow('No autorizado');
    expect(mocks.boardPost.delete).not.toHaveBeenCalled();
  });

  it('deletes an owned post and revalidates', async () => {
    mocks.boardPost.findUnique.mockResolvedValue({ createdBy: 'me' });
    await expect(deleteBoardPostAction('p1')).resolves.toEqual({ success: true });
    expect(mocks.boardPost.delete).toHaveBeenCalledWith({ where: { id: 'p1' } });
    expect(revalidatePath).toHaveBeenCalledWith('/board');
  });
});

describe('reorderBoardPostsAction', () => {
  it('updates every post order in a single transaction', async () => {
    mocks.boardPost.update.mockImplementation(({ where }) => `update:${where.id}`);

    await expect(
      reorderBoardPostsAction([
        { id: 'a', order: 1 },
        { id: 'b', order: 0 },
      ])
    ).resolves.toEqual({ success: true });

    expect(mocks.transaction).toHaveBeenCalledWith(['update:a', 'update:b']);
    expect(mocks.boardPost.update).toHaveBeenCalledWith({ where: { id: 'a' }, data: { order: 1 } });
    expect(mocks.boardPost.update).toHaveBeenCalledWith({ where: { id: 'b' }, data: { order: 0 } });
    expect(revalidatePath).toHaveBeenCalledWith('/board');
  });
});
