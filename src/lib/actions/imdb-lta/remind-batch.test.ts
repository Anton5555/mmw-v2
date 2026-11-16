import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  remindOpenBatch: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  auth: { api: { getSession: mocks.getSession } },
}));
vi.mock('next/headers', () => ({
  headers: vi.fn(async () => new Headers()),
}));
vi.mock('@/lib/api/imdb-lta-batches', () => ({
  remindOpenBatch: mocks.remindOpenBatch,
}));

import { remindOpenBatchAction } from './remind-batch';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getSession.mockResolvedValue({ user: { id: 'admin1', role: 'admin' } });
  mocks.remindOpenBatch.mockResolvedValue({ batchNumber: 3 });
});

describe('remindOpenBatchAction', () => {
  it('rejects users who are not admins', async () => {
    mocks.getSession.mockResolvedValue({ user: { id: 'u1', role: 'user' } });
    await expect(remindOpenBatchAction()).rejects.toThrow('Solo admins');
    expect(mocks.remindOpenBatch).not.toHaveBeenCalled();
  });

  it('sends the open-batch reminder for admins', async () => {
    await expect(remindOpenBatchAction()).resolves.toEqual({ batchNumber: 3 });
    expect(mocks.remindOpenBatch).toHaveBeenCalledOnce();
  });
});