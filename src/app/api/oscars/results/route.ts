import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { getOscarLeaderboard, getOscarPredictionStats } from '@/lib/api/oscars';

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const editionId = searchParams.get('editionId');

    if (!editionId) {
      return NextResponse.json(
        { error: 'editionId is required' },
        { status: 400 },
      );
    }

    const editionIdNum = parseInt(editionId, 10);
    if (isNaN(editionIdNum)) {
      return NextResponse.json({ error: 'Invalid editionId' }, { status: 400 });
    }

    const [leaderboard, stats] = await Promise.all([
      getOscarLeaderboard(editionIdNum),
      getOscarPredictionStats(editionIdNum),
    ]);

    return NextResponse.json({
      leaderboard,
      stats,
    });
  } catch (error) {
    console.error('[GET /api/oscars/results] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
