'use server';

import { createHash, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { env } from '@/env';
import { createVipToken, VIP_COOKIE, VIP_TTL_SECONDS } from '@/lib/vip';

const digest = (value: string) => createHash('sha256').update(value).digest();

export async function verifyVipCode(code: string): Promise<boolean> {
  if (typeof code !== 'string' || !timingSafeEqual(digest(code), digest(env.VIP_CODE))) {
    return false;
  }

  (await cookies()).set(VIP_COOKIE, createVipToken(), {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
    maxAge: VIP_TTL_SECONDS,
    path: '/',
  });
  return true;
}
