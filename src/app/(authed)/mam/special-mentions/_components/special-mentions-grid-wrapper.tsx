'use client';

import { useEffect, useState, useMemo, ReactNode } from 'react';
import { MamSkeletonGrid } from '@/components/mam-skeleton-grid';
import { useMamMoviesParams } from '@/lib/hooks/useMamMoviesParams';
import { startTransition } from 'react';

interface SpecialMentionsGridWrapperProps {
  initialParams: {
    title: string;
    imdb: string;
    participants: string[];
    page: number;
    limit: number;
  };
  children?: ReactNode;
}

export function SpecialMentionsGridWrapper({
  initialParams,
  children,
}: SpecialMentionsGridWrapperProps) {
  const { params: clientParams } = useMamMoviesParams();
  const [renderedParams, setRenderedParams] = useState(initialParams);

  // Update rendered params when server params (initialParams) change
  // This happens after URL updates and server re-renders
  useEffect(() => {
    const paramsChanged =
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
  const paramsDiffer = useMemo(() => {
    return (
      clientParams.title !== renderedParams.title ||
      clientParams.imdb !== renderedParams.imdb ||
      JSON.stringify(clientParams.participants) !==
        JSON.stringify(renderedParams.participants) ||
      clientParams.page !== renderedParams.page
    );
  }, [clientParams, renderedParams]);

  // Show skeleton immediately when client params differ (user is typing, URL hasn't updated yet)
  if (paramsDiffer) {
    return <MamSkeletonGrid />;
  }

  // Render children (server component) when params match
  return <>{children}</>;
}
