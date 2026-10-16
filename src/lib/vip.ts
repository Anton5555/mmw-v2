import { createHmac, timingSafeEqual } from 'node:crypto';
import { APIError } from 'better-auth/api';
import { env } from '@/env';

export const VIP_COOKIE = 'vip_ok';
export const VIP_TTL_SECONDS = 10 * 60;

const sign = (payload: string) =>
  createHmac('sha256', env.BETTER_AUTH_SECRET).update(payload).digest('hex');

/** `${expiresAtMs}.${hmac}` — expiry lives inside the signed value. */
export function createVipToken(now = Date.now()) {
  const expiresAt = String(now + VIP_TTL_SECONDS * 1000);
  return `${expiresAt}.${sign(expiresAt)}`;
}

export function isValidVipToken(value: string | null | undefined, now = Date.now()) {
  if (!value) return false;
  const [expiresAt, signature, ...rest] = value.split('.');
  if (!expiresAt || !signature || rest.length > 0) return false;

  const expected = Buffer.from(sign(expiresAt));
  const received = Buffer.from(signature);
  if (expected.length !== received.length) return false;
  if (!timingSafeEqual(expected, received)) return false;

  return Number(expiresAt) > now;
}

interface VipContext {
  path?: string;
  getCookie: (name: string) => string | null | undefined;
}

/**
 * Throws unless the request carries a valid VIP cookie.
 * Server-side calls without a request context (seeds, scripts) and the
 * admin-only `/admin/create-user` endpoint are allowed.
 */
export function assertVipAllowed(ctx: VipContext | null | undefined) {
  if (!ctx) return;
  if (ctx.path === '/admin/create-user') return;
  if (isValidVipToken(ctx.getCookie(VIP_COOKIE))) return;

  throw new APIError('FORBIDDEN', {
    code: 'VIP_REQUIRED',
    message: 'VIP_REQUIRED',
  });
}
