'use client';

import { AnimatePresence } from 'motion/react';
import { FilmSlate } from './film-slate';
import { useFilmSlate } from '@/lib/contexts/film-slate-context';

export function FilmSlateWrapper() {
  const { isShowing, slateData, onAnimationComplete } = useFilmSlate();

  return (
    <AnimatePresence>
      {isShowing && slateData && (
        <FilmSlate
          scene={slateData.scene}
          take={slateData.take}
          onAnimationComplete={onAnimationComplete}
        />
      )}
    </AnimatePresence>
  );
}
