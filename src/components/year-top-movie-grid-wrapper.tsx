'use client';

import { useEffect, useState, useMemo, ReactNode } from 'react';
import { YearTopSkeletonGrid } from './year-top-skeleton-grid';
import { useYearTopParams } from '@/lib/hooks/useYearTopParams';
import { startTransition } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface YearTopMovieGridWrapperProps {
  initialParams: {
    year: number;
    pickType: string;
    title: string;
    imdb: string;
    participants: string[];
    page: number;
    limit: number;
  };
  children?: ReactNode;
}

export function YearTopMovieGridWrapper({
  initialParams,
  children,
}: YearTopMovieGridWrapperProps) {
  const { params: clientParams } = useYearTopParams();
  const [renderedParams, setRenderedParams] = useState(initialParams);

  // Update rendered params when server params (initialParams) change
  useEffect(() => {
    const paramsChanged =
      initialParams.year !== renderedParams.year ||
      // pickType is determined by route, not URL params, so exclude from comparison
      initialParams.title !== renderedParams.title ||
      initialParams.imdb !== renderedParams.imdb ||
      JSON.stringify(initialParams.participants) !==
        JSON.stringify(renderedParams.participants) ||
      initialParams.page !== renderedParams.page;

    if (paramsChanged) {
      startTransition(() => {
        setRenderedParams(initialParams);
      });
    }
  }, [initialParams, renderedParams]);

  // Check if client params differ from rendered params (user is typing)
  // pickType is determined by route, not URL params, so exclude from comparison
  const paramsDiffer = useMemo(() => {
    return (
      clientParams.year !== renderedParams.year ||
      clientParams.title !== renderedParams.title ||
      clientParams.imdb !== renderedParams.imdb ||
      JSON.stringify(clientParams.participants) !==
        JSON.stringify(renderedParams.participants) ||
      clientParams.page !== renderedParams.page
    );
  }, [clientParams, renderedParams]);

  // Show skeleton immediately when client params differ (user is typing, URL hasn't updated yet)
  if (paramsDiffer) {
    return <YearTopSkeletonGrid />;
  }

  // Render children (server component) with motion animations when params match
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={renderedParams.year}
        initial={{ opacity: 0, scale: 0.98, filter: 'blur(4px)' }}
        animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
        exit={{ opacity: 0, scale: 0.98, filter: 'blur(4px)' }}
        transition={{ duration: 0.3 }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
