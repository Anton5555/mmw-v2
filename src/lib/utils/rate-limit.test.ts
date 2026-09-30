import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RateLimiter, processInBatches } from './rate-limit';

describe('RateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the value of the executed function', async () => {
    const limiter = new RateLimiter(4);
    await expect(limiter.execute(async () => 42)).resolves.toBe(42);
  });

  it('propagates errors to the caller and keeps processing the queue', async () => {
    const limiter = new RateLimiter(4);
    const failing = limiter.execute(async () => {
      throw new Error('boom');
    });
    const failingAssertion = expect(failing).rejects.toThrow('boom');
    const next = limiter.execute(async () => 'ok');

    await vi.advanceTimersByTimeAsync(250);
    await failingAssertion;
    await expect(next).resolves.toBe('ok');
  });

  it('spaces queued tasks by 1000 / requestsPerSecond ms', async () => {
    const limiter = new RateLimiter(4); // 250ms
    const started: number[] = [];
    const t0 = Date.now();
    const run = () =>
      limiter.execute(async () => {
        started.push(Date.now() - t0);
      });

    const all = Promise.all([run(), run(), run()]);
    await vi.advanceTimersByTimeAsync(600);
    await all;

    expect(started).toEqual([0, 250, 500]);
  });
});

describe('processInBatches', () => {
  it('runs the processor for every item and preserves order', async () => {
    vi.useFakeTimers();
    const promise = processInBatches([1, 2, 3], 2, async (n, limiter) =>
      limiter.execute(async () => n * 10)
    );
    await vi.advanceTimersByTimeAsync(1000);
    await expect(promise).resolves.toEqual([10, 20, 30]);
    vi.useRealTimers();
  });
});
