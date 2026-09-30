import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import { validateCronAuth } from './cron-auth';

const makeRequest = (authorization?: string) =>
  new NextRequest('http://localhost:3000/api/cron/daily-events', {
    headers: authorization ? { Authorization: authorization } : {},
  });

describe('validateCronAuth', () => {
  it('returns null for the correct bearer secret', () => {
    expect(validateCronAuth(makeRequest('Bearer test-cron-secret'))).toBeNull();
  });

  it.each([undefined, 'Bearer wrong', 'test-cron-secret', 'bearer test-cron-secret'])(
    'returns a 401 response for header %p',
    async (header) => {
      const response = validateCronAuth(makeRequest(header));
      expect(response?.status).toBe(401);
      await expect(response?.json()).resolves.toEqual({ error: 'Unauthorized' });
    }
  );
});
