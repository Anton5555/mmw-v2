import { cacheTag } from 'next/cache';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({ event: { findMany: vi.fn() } }));
vi.mock('@/lib/db', () => ({ prisma: db }));

import { getMonthEvents, getNextEvents } from './events';
import { getTomorrowEvents } from './telegram-events';

const event = (id: string, month: number, day: number, year: number | null) => ({ id, month, day, year });

describe('getMonthEvents', () => {
  it('returns events of that month for the given year plus recurring (year-less) ones, tagged for cache invalidation', async () => {
    db.event.findMany.mockResolvedValue([{ id: 'a' }]);

    await expect(getMonthEvents({ month: 3, year: 2026 })).resolves.toEqual([{ id: 'a' }]);

    expect(db.event.findMany).toHaveBeenCalledWith({
      where: { month: 3, OR: [{ year: 2026 }, { year: null }] },
      orderBy: [{ day: 'asc' }, { month: 'asc' }, { year: 'asc' }],
    });
    expect(cacheTag).toHaveBeenCalledWith('events');
  });
});

describe('getNextEvents', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 5, 15, 12)); // 15 June 2026, local time
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('queries upcoming events from today (this year, recurring, and future years) limited to 5', async () => {
    db.event.findMany.mockResolvedValue([]);
    await getNextEvents();

    const { where, take } = db.event.findMany.mock.calls[0][0];
    const upcoming = [{ month: { gt: 6 } }, { month: 6, day: { gte: 15 } }];
    expect(where.OR).toEqual([
      { year: 2026, OR: upcoming },
      { year: null, OR: upcoming },
      { year: { gt: 2026 } },
    ]);
    expect(take).toBe(5);
    expect(cacheTag).toHaveBeenCalledWith('events');
  });

  it('sorts chronologically, treating recurring events as happening this year', async () => {
    db.event.findMany.mockResolvedValue([
      event('next-year', 1, 10, 2027),
      event('recurring-dec', 12, 25, null),
      event('this-year-jul', 7, 4, 2026),
      event('recurring-jun', 6, 20, null),
    ]);

    const result = await getNextEvents();

    expect(result.map((e) => e.id)).toEqual([
      'recurring-jun',
      'this-year-jul',
      'recurring-dec',
      'next-year',
    ]);
  });
});

describe('getTomorrowEvents (UTC-3 calendar)', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  /** Run at the given UTC instant and return the (year, month, day) that was queried. */
  async function queriedTomorrow(utcIso: string) {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(utcIso));
    db.event.findMany.mockResolvedValue([]);
    await getTomorrowEvents();
    const [dated, recurring] = db.event.findMany.mock.calls.at(-1)![0].where.OR;
    expect(recurring).toEqual({ month: dated.month, day: dated.day, year: null });
    return { year: dated.year, month: dated.month, day: dated.day };
  }

  it('matches both one-off and recurring events, ordered by time', async () => {
    await queriedTomorrow('2026-03-05T12:00:00Z');
    expect(db.event.findMany.mock.calls.at(-1)![0].orderBy).toEqual([{ time: 'asc' }]);
  });

  it('uses the Argentina date at the cron run time (02:50 UTC is still the previous evening)', async () => {
    // 2026-03-05T02:50Z is 23:50 on 4 March in UTC-3, so "tomorrow" is 5 March.
    await expect(queriedTomorrow('2026-03-05T02:50:00Z')).resolves.toEqual({ year: 2026, month: 3, day: 5 });
  });

  it('switches to the next day once it is midnight in UTC-3 (03:00 UTC)', async () => {
    await expect(queriedTomorrow('2026-03-05T03:00:00Z')).resolves.toEqual({ year: 2026, month: 3, day: 6 });
  });

  it.each([
    ['end of month', '2026-04-30T12:00:00Z', { year: 2026, month: 5, day: 1 }],
    ['end of year', '2026-12-31T12:00:00Z', { year: 2027, month: 1, day: 1 }],
    ['end of February (non-leap)', '2026-02-28T12:00:00Z', { year: 2026, month: 3, day: 1 }],
    ['end of February (leap year)', '2028-02-28T12:00:00Z', { year: 2028, month: 2, day: 29 }],
    ['leap day', '2028-02-29T12:00:00Z', { year: 2028, month: 3, day: 1 }],
  ])('rolls over correctly at %s', async (_label, now, expected) => {
    await expect(queriedTomorrow(now)).resolves.toEqual(expected);
  });
});
