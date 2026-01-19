'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

type FilmStripContextType = {
  isActive: boolean;
  selectedTitle: string | null;
  triggerStrip: (title: string, targetUrl: string) => void;
  onAnimationComplete: () => void;
};

const FilmStripContext = createContext<FilmStripContextType | undefined>(
  undefined
);

export function FilmStripProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isActive, setIsActive] = useState(false);
  const [selectedTitle, setSelectedTitle] = useState<string | null>(null);
  const [targetUrl, setTargetUrl] = useState<string | null>(null);
  const router = useRouter();

  const triggerStrip = useCallback((title: string, url: string) => {
    setSelectedTitle(title);
    setTargetUrl(url);
    setIsActive(true);
  }, []);

  const onAnimationComplete = useCallback(() => {
    // Navigate immediately (called at animation midpoint)
    if (targetUrl) {
      router.push(targetUrl);
    }
    setIsActive(false);
    setSelectedTitle(null);
    setTargetUrl(null);
  }, [targetUrl, router]);

  return (
    <FilmStripContext.Provider
      value={{
        isActive,
        selectedTitle,
        triggerStrip,
        onAnimationComplete,
      }}
    >
      {children}
    </FilmStripContext.Provider>
  );
}

export function useFilmStrip() {
  const context = useContext(FilmStripContext);
  if (context === undefined) {
    throw new Error('useFilmStrip must be used within a FilmStripProvider');
  }
  return context;
}
