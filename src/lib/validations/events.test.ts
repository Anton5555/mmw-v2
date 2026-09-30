import { describe, expect, it } from 'vitest';
import { createEventSchema, getMonthEventsSchema } from './events';

const base = { title: 'Cine', month: 3, day: 5 };

describe('createEventSchema', () => {
  it('accepts a recurring birthday without year or time', () => {
    expect(createEventSchema.safeParse({ ...base, type: 'BIRTHDAY' }).success).toBe(true);
  });

  it('rejects a year or time on birthdays and anniversaries', () => {
    expect(createEventSchema.safeParse({ ...base, type: 'BIRTHDAY', year: 2026 }).success).toBe(false);
    expect(
      createEventSchema.safeParse({ ...base, type: 'ANNIVERSARY', time: new Date() }).success
    ).toBe(false);
  });

  it('allows an optional year and time on one-off events', () => {
    expect(
      createEventSchema.safeParse({ ...base, type: 'DISCORD', year: 2026, time: new Date() }).success
    ).toBe(true);
    expect(createEventSchema.safeParse({ ...base, type: 'OTHER' }).success).toBe(true);
  });

  it('requires a title and a valid calendar range', () => {
    expect(createEventSchema.safeParse({ ...base, title: '', type: 'OTHER' }).success).toBe(false);
    expect(createEventSchema.safeParse({ ...base, month: 13, type: 'OTHER' }).success).toBe(false);
    expect(createEventSchema.safeParse({ ...base, day: 0, type: 'OTHER' }).success).toBe(false);
  });

  it('rejects unknown event types', () => {
    expect(createEventSchema.safeParse({ ...base, type: 'PARTY' }).success).toBe(false);
  });
});

describe('getMonthEventsSchema', () => {
  it('bounds month and year', () => {
    expect(getMonthEventsSchema.safeParse({ month: 12, year: 2026 }).success).toBe(true);
    expect(getMonthEventsSchema.safeParse({ month: 0, year: 2026 }).success).toBe(false);
    expect(getMonthEventsSchema.safeParse({ month: 1, year: 1800 }).success).toBe(false);
  });
});
