import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { getTriviaGameById } from '@/lib/api/imdb-lta-trivia';
import { TRIVIA_IMAGE_STEP_COUNT } from '@/lib/utils/trivia-image-constants';
import {
  fetchTriviaBackdropBuffer,
  renderTriviaStep,
} from '@/lib/utils/trivia-image';

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const gameId = Number(request.nextUrl.searchParams.get('gameId'));
  const step = Number(request.nextUrl.searchParams.get('step') ?? '1');

  if (!Number.isInteger(gameId) || gameId <= 0) {
    return NextResponse.json({ error: 'gameId inválido' }, { status: 400 });
  }
  if (
    !Number.isInteger(step) ||
    step < 1 ||
    step > TRIVIA_IMAGE_STEP_COUNT
  ) {
    return NextResponse.json({ error: 'step inválido' }, { status: 400 });
  }

  const game = await getTriviaGameById(gameId);
  if (!game) {
    return NextResponse.json({ error: 'Trivia no encontrada' }, { status: 404 });
  }

  try {
    const source = await fetchTriviaBackdropBuffer(game.backdropPath);
    const jpeg = await renderTriviaStep(
      source,
      { focusX: game.focusX, focusY: game.focusY },
      step
    );

    return new NextResponse(new Uint8Array(jpeg), {
      status: 200,
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'private, max-age=60',
      },
    });
  } catch (error) {
    console.error('Trivia frame preview failed:', error);
    return NextResponse.json(
      { error: 'No se pudo renderizar el fotograma' },
      { status: 502 }
    );
  }
}
