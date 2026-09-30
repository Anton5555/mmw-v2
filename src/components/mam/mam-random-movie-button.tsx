'use client';

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
      className="rounded-full px-6 h-10 bg-yellow-400 text-black font-semibold tracking-tight shadow-lg shadow-yellow-500/30 hover:bg-yellow-300 hover:-translate-y-0.5 transition-transform"
    >
      Probá tu suerte
    </Button>
  );
}

