import { NextRequest, NextResponse } from 'next/server';
import { validateCronAuth } from '@/lib/utils/cron-auth';
import {
  syncWatchProvidersBatch,
  WATCH_PROVIDERS_BATCH_SIZE,
  WATCH_PROVIDERS_MAX_BATCH_SIZE,
} from '@/lib/api/watch-providers';

export const maxDuration = 60;

/**
 * Called by cron-job.org (not Vercel cron) with `Authorization: Bearer <CRON_SECRET>`.
 * Each call refreshes one batch of the stalest movies. `?limit=` overrides the batch size.
 */
export async function GET(request: NextRequest) {
  const authError = validateCronAuth(request);
  if (authError) return authError;

  const limitParam = Number(request.nextUrl.searchParams.get('limit'));
  const limit =
    Number.isInteger(limitParam) && limitParam > 0
      ? Math.min(limitParam, WATCH_PROVIDERS_MAX_BATCH_SIZE)
      : WATCH_PROVIDERS_BATCH_SIZE;

  try {
    const result = await syncWatchProvidersBatch(limit);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('Watch providers cron failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
