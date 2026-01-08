'use client';

import { useBreadcrumb } from '@/lib/contexts/breadcrumb-context';
import { useEffect } from 'react';

export function MamMovieBreadcrumbUpdater({
  movieTitle,
}: {
  movieTitle: string;
}) {
  const { setCurrentPageLabel } = useBreadcrumb();

  useEffect(() => {
    setCurrentPageLabel(movieTitle);
    return () => setCurrentPageLabel(undefined);
  }, [movieTitle, setCurrentPageLabel]);

  return null;
}
