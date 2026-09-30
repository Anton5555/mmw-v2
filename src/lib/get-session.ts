import { cache } from 'react';
import { headers } from 'next/headers';
import { connection } from 'next/server';
import { auth } from '@/lib/auth';

export const getCurrentSession = cache(async () => {
  await connection();
  return auth.api.getSession({
    headers: await headers(),
  });
});
