'use client';

import { Dices } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFilmStrip } from '@/lib/contexts/film-strip-context';
import type { MamMovieWithPicks } from '@/lib/validations/mam';

interface MamRandomMovieButtonProps {
  movies: MamMovieWithPicks[];
}

export function MamRandomMovieButton({ movies }: MamRandomMovieButtonProps) {
  const { triggerStrip } = useFilmStrip();

  const handleClick = () => {
    if (!movies || movies.length === 0) return;

    const randomIndex = Math.floor(Math.random() * movies.length);
    const movie = movies[randomIndex];

    if (!movie) return;

    const title =
      movie.originalLanguage === 'es' ? movie.originalTitle : movie.title;

    triggerStrip(title || 'Película sorpresa', `/mam/movie/${movie.id}`);
  };

  return (
    <Button
      type="button"
      onClick={handleClick}
      className="h-9 shrink-0 rounded-full bg-yellow-400 px-4 font-semibold tracking-tight text-black hover:bg-yellow-300 [&_svg]:size-4"
    >
      <Dices aria-hidden />
      Probá tu suerte
    </Button>
  );
}

