'use client';

import { FilmStripTransition } from './film-strip-transition';
import { useFilmStrip } from '@/lib/contexts/film-strip-context';

export function FilmStripWrapper() {
  const { isActive, selectedTitle, onAnimationComplete } = useFilmStrip();

  return (
    <FilmStripTransition 
      isActive={isActive} 
      title={selectedTitle || ''}
      onAnimationComplete={onAnimationComplete}
    />
  );
}
