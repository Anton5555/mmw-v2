'use client';

import { useBreadcrumb } from '@/lib/contexts/breadcrumb-context';
import { useEffect } from 'react';

export function ListBreadcrumbUpdater({ listName }: { listName: string }) {
  const { setCurrentPageLabel } = useBreadcrumb();

  useEffect(() => {
    setCurrentPageLabel(listName);
    return () => setCurrentPageLabel(undefined);
  }, [listName, setCurrentPageLabel]);

  return null;
}
