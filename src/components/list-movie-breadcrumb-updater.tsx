'use client';

import { useBreadcrumb } from '@/lib/contexts/breadcrumb-context';
import { useEffect } from 'react';

export function ListMovieBreadcrumbUpdater({
  movieTitle,
  listName,
  listId,
}: {
  movieTitle: string;
  listName?: string;
  listId?: number;
}) {
  const { setCurrentPageLabel, setIntermediateBreadcrumbs } = useBreadcrumb();

  useEffect(() => {
    setCurrentPageLabel(movieTitle);

    // Set intermediate breadcrumb for the list if available
    if (listName && listId) {
      setIntermediateBreadcrumbs([
        {
          label: listName,
          href: `/lists/${listId}`,
        },
      ]);
    } else {
      setIntermediateBreadcrumbs([]);
    }

    return () => {
      setCurrentPageLabel(undefined);
      setIntermediateBreadcrumbs([]);
    };
  }, [movieTitle, listName, listId, setCurrentPageLabel, setIntermediateBreadcrumbs]);

  return null;
}
