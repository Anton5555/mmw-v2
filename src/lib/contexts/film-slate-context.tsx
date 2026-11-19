'use client';

import React, { createContext, use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useReducedMotion } from 'motion/react';

// How long the slate stays up after the clap lands, before we navigate.
// Kept short: the slate is a flourish, it must not hold up navigation.
const HOLD_AFTER_CLAP_MS = 150;

type FilmSlateData = {
  scene: string;
  take: string;
  targetUrl: string;
};

type FilmSlateContextType = {
  isShowing: boolean;
  slateData: FilmSlateData | null;
  triggerSlate: (scene: string, targetUrl: string, take?: string) => void;
  onAnimationComplete: () => void;
};

const FilmSlateContext = createContext<FilmSlateContextType | undefined>(
  undefined
);

export function FilmSlateProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isShowing, setIsShowing] = useState(false);
  const [slateData, setSlateData] = useState<FilmSlateData | null>(null);
  const router = useRouter();

  const reduceMotion = useReducedMotion();

  const triggerSlate = (
    scene: string,
    targetUrl: string,
    take: string = '01'
  ) => {
    if (reduceMotion) {
      router.push(targetUrl);
      return;
    }
    // Start fetching the route while the slate plays
    router.prefetch(targetUrl);
    setSlateData({ scene, take, targetUrl });
    setIsShowing(true);
  };

  const onAnimationComplete = () => {
    setTimeout(() => {
      if (slateData?.targetUrl) {
        router.push(slateData.targetUrl);
      }
      setIsShowing(false);
      setSlateData(null);
    }, HOLD_AFTER_CLAP_MS);
  };

  return (
    <FilmSlateContext
      value={{
        isShowing,
        slateData,
        triggerSlate,
        onAnimationComplete,
      }}
    >
      {children}
    </FilmSlateContext>
  );
}

export function useFilmSlate() {
  const context = use(FilmSlateContext);
  if (context === undefined) {
    throw new Error('useFilmSlate must be used within a FilmSlateProvider');
  }
  return context;
}
