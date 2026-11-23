import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ syncWatchProvidersBatch: vi.fn() }));

vi.mock('@/lib/api/watch-providers', () => ({
  syncWatchProvidersBatch: mocks.syncWatchProvidersBatch,
  WATCH_PROVIDERS_BATCH_SIZE: 150,
  WATCH_PROVIDERS_MAX_BATCH_SIZE: 500,
}));

import { GET } from './route';

const request = (query = '', authorization?: string) =>
  new NextRequest(`http://localhost:3000/api/cron/watch-providers${query}`, {
    headers: authorization ? { Authorization: authorization } : {},
  });

const authed = (query = '') => request(query, 'Bearer test-cron-secret');

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  mocks.syncWatchProvidersBatch.mockResolvedValue({
    countries: ['AR'],
    processed: 150,
    updated: 150,
    failed: 0,
  });
});

describe('GET /api/cron/watch-providers', () => {
  it('returns 401 without the cron secret and does no work', async () => {
    const response = await GET(request('', 'Bearer wrong'));
    expect(response.status).toBe(401);
    expect(mocks.syncWatchProvidersBatch).not.toHaveBeenCalled();
  });

  it('syncs one default batch and reports the counts', async () => {
    const response = await GET(authed());
    expect(response.status).toBe(200);
    expect(mocks.syncWatchProvidersBatch).toHaveBeenCalledWith(150);
    expect(await response.json()).toEqual({
      success: true,
      countries: ['AR'],
      processed: 150,
      updated: 150,
      failed: 0,
    });
  });

  it('honours ?limit= up to the maximum and ignores junk', async () => {
    await GET(authed('?limit=40'));
    await GET(authed('?limit=9999'));
    await GET(authed('?limit=abc'));
    expect(mocks.syncWatchProvidersBatch.mock.calls).toEqual([[40], [500], [150]]);
  });

  it('returns 500 when the sync throws', async () => {
    mocks.syncWatchProvidersBatch.mockRejectedValue(new Error('db down'));
    const response = await GET(authed());
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ success: false, error: 'db down' });
  });
});
