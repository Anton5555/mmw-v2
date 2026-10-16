import { describe, expect, it } from 'vitest';
import {
  assertVipAllowed,
  createVipToken,
  isValidVipToken,
  VIP_COOKIE,
  VIP_TTL_SECONDS,
} from './vip';

const ctxWith = (cookie: string | null, path = '/sign-up/email') => ({
  path,
  getCookie: (name: string) => (name === VIP_COOKIE ? cookie : null),
});

describe('vip token', () => {
  it('round-trips', () => {
    expect(isValidVipToken(createVipToken())).toBe(true);
  });

  it('rejects expired tokens', () => {
    const token = createVipToken(0);
    expect(isValidVipToken(token, VIP_TTL_SECONDS * 1000 + 1)).toBe(false);
  });

  it('rejects tampered or malformed tokens', () => {
    const [expiresAt, sig] = createVipToken().split('.');
    // Same signature with a different expiry must fail (avoid same-ms race).
    expect(isValidVipToken(`${Number(expiresAt) + 1}.${sig}`)).toBe(false);
    expect(isValidVipToken(`${expiresAt}.${sig.slice(0, -1)}a`)).toBe(false);
    expect(isValidVipToken('garbage')).toBe(false);
    expect(isValidVipToken('')).toBe(false);
    expect(isValidVipToken(null)).toBe(false);
  });
});

describe('assertVipAllowed', () => {
  it('throws without a cookie', () => {
    expect(() => assertVipAllowed(ctxWith(null))).toThrow();
  });

  it('throws with an invalid cookie', () => {
    expect(() => assertVipAllowed(ctxWith('bad.token'))).toThrow();
  });

  it('allows a valid cookie', () => {
    expect(() => assertVipAllowed(ctxWith(createVipToken()))).not.toThrow();
  });

  it('allows admin user creation and server-side calls without ctx', () => {
    expect(() => assertVipAllowed(ctxWith(null, '/admin/create-user'))).not.toThrow();
    expect(() => assertVipAllowed(null)).not.toThrow();
  });
});
