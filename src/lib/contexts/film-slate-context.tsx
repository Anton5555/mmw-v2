'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

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

  const triggerSlate = useCallback(
    (scene: string, targetUrl: string, take: string = '01') => {
      setSlateData({ scene, take, targetUrl });
      setIsShowing(true);
    },
    []
  );

  const onAnimationComplete = useCallback(() => {
    // Wait a bit for the user to see the slate, then navigate
    setTimeout(() => {
      if (slateData?.targetUrl) {
        router.push(slateData.targetUrl);
      }
      setIsShowing(false);
      setSlateData(null);
    }, 1200); // Give time for the animation and for the user to read the slate
  }, [slateData, router]);

  return (
    <FilmSlateContext.Provider
      value={{
        isShowing,
        slateData,
        triggerSlate,
        onAnimationComplete,
      }}
    >
      {children}
    </FilmSlateContext.Provider>
  );
}

export function useFilmSlate() {
  const context = useContext(FilmSlateContext);
  if (context === undefined) {
    throw new Error('useFilmSlate must be used within a FilmSlateProvider');
  }
  return context;
}
