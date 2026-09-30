'use client';

import { Dices } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import type { MamMovieWithPicks } from '@/lib/validations/mam';

interface MamRandomMovieButtonProps {
  movies: MamMovieWithPicks[];
}

export function MamRandomMovieButton({ movies }: MamRandomMovieButtonProps) {
  const router = useRouter();

  const handleClick = () => {
    if (!movies || movies.length === 0) return;

    const randomIndex = Math.floor(Math.random() * movies.length);
    const movie = movies[randomIndex];

    if (!movie) return;

    router.push(`/mam/movie/${movie.id}`);
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

