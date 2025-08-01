import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/env';

export function validateCronAuth(request: NextRequest): NextResponse | null {
  const authHeader = request.headers.get('Authorization');
  const expectedAuth = `Bearer ${env.CRON_SECRET}`;

  if (authHeader !== expectedAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return null; // Authorization successful
}
