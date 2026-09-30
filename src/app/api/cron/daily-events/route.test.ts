import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getTomorrowEvents: vi.fn(),
  sendTelegramMessage: vi.fn(),
  calculateAndSaveDailyRecommendation: vi.fn(),
}));

vi.mock('@/lib/api/telegram-events', () => ({ getTomorrowEvents: mocks.getTomorrowEvents }));
vi.mock('@/lib/api/calculate-daily-recommendation', () => ({
  calculateAndSaveDailyRecommendation: mocks.calculateAndSaveDailyRecommendation,
}));
vi.mock('@/lib/utils/telegram', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/utils/telegram')>()),
  sendTelegramMessage: mocks.sendTelegramMessage,
}));

import { GET } from './route';

const request = (authorization?: string) =>
  new NextRequest('http://localhost:3000/api/cron/daily-events', {
    headers: authorization ? { Authorization: authorization } : {},
  });

const authed = () => request('Bearer test-cron-secret');

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  mocks.calculateAndSaveDailyRecommendation.mockResolvedValue({ success: true, type: 'movie' });
});

describe('GET /api/cron/daily-events', () => {
  it('returns 401 without the cron secret and does no work', async () => {
    const response = await GET(request());
    expect(response.status).toBe(401);
    expect(mocks.getTomorrowEvents).not.toHaveBeenCalled();
    expect(mocks.calculateAndSaveDailyRecommendation).not.toHaveBeenCalled();
  });

  it('skips Telegram when there are no events tomorrow but still computes the recommendation', async () => {
    mocks.getTomorrowEvents.mockResolvedValue([]);
    const response = await GET(authed());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.sendTelegramMessage).not.toHaveBeenCalled();
    expect(body.events).toMatchObject({ success: true, skipped: true, eventsCount: 0 });
    expect(body.recommendation).toMatchObject({ success: true, type: 'movie' });
  });

  it('sends one Telegram message listing tomorrow\'s events', async () => {
    mocks.getTomorrowEvents.mockResolvedValue([
      { title: 'Cine', description: 'Ronin', type: 'OTHER', time: null },
    ]);
    const response = await GET(authed());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.sendTelegramMessage).toHaveBeenCalledOnce();
    expect(mocks.sendTelegramMessage.mock.calls[0][0]).toContain('Eventos de mañana');
    expect(mocks.sendTelegramMessage.mock.calls[0][0]).toContain('Cine');
    expect(body.events).toMatchObject({ success: true, eventsCount: 1, skipped: false });
  });

  it('reports 500 with the error when Telegram fails, yet still runs the recommendation', async () => {
    mocks.getTomorrowEvents.mockResolvedValue([
      { title: 'Cine', description: '', type: 'OTHER', time: null },
    ]);
    mocks.sendTelegramMessage.mockRejectedValue(new Error('Telegram API error: 500'));
    const response = await GET(authed());
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.events.error).toBe('Telegram API error: 500');
    expect(mocks.calculateAndSaveDailyRecommendation).toHaveBeenCalledOnce();
    expect(body.recommendation.success).toBe(true);
  });

  it('reports 500 when the recommendation fails', async () => {
    mocks.getTomorrowEvents.mockResolvedValue([]);
    mocks.calculateAndSaveDailyRecommendation.mockResolvedValue({
      success: false,
      error: 'no movies',
    });
    const response = await GET(authed());
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.recommendation).toMatchObject({ success: false, error: 'no movies' });
  });
});
