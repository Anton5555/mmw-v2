'use client';

import { useEffect, useState, useMemo, ReactNode } from 'react';
import { startTransition } from 'react';
import { useListMoviesParams } from '@/lib/hooks/useListMoviesParams';

interface ListMovieGridWrapperProps {
  initialParams: {
    title: string;
    genre: string[];
    director: string[];
  };
  children?: ReactNode;
}

export function ListMovieGridWrapper({
  initialParams,
  children,
}: ListMovieGridWrapperProps) {
  const { params: clientParams } = useListMoviesParams();
  const [renderedParams, setRenderedParams] = useState(initialParams);

  // Update rendered params when server params (initialParams) change
  // This happens after URL updates and server re-renders
  useEffect(() => {
    const paramsChanged =
      initialParams.title !== renderedParams.title ||
      JSON.stringify(initialParams.genre) !==
        JSON.stringify(renderedParams.genre) ||
      JSON.stringify(initialParams.director) !==
        JSON.stringify(renderedParams.director);

    if (paramsChanged) {
      startTransition(() => {
        setRenderedParams(initialParams);
      });
    }
  }, [initialParams, renderedParams]);

  // Check if client params differ from rendered params (user is typing/filtering)
  const paramsDiffer = useMemo(() => {
    return (
      clientParams.title !== renderedParams.title ||
      JSON.stringify(clientParams.genre) !==
        JSON.stringify(renderedParams.genre) ||
      JSON.stringify(clientParams.director) !==
        JSON.stringify(renderedParams.director)
    );
  }, [clientParams, renderedParams]);

  // Show loading state immediately when client params differ (user is filtering, URL hasn't updated yet)
  if (paramsDiffer) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="aspect-[2/3] bg-zinc-800/50 rounded-lg animate-pulse"
          />
        ))}
      </div>
    );
  }

  // Render children (server component) when params match
  return <>{children}</>;
}
