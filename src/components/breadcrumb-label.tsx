'use client';

import { useEffect } from 'react';
import { useBreadcrumb } from '@/lib/contexts/breadcrumb-context';

/** Names the current page in the header breadcrumbs (e.g. a participant). */
export function BreadcrumbLabel({ label }: { label: string }) {
  const { setCurrentPageLabel } = useBreadcrumb();

  useEffect(() => {
    setCurrentPageLabel(label);
    return () => setCurrentPageLabel(undefined);
  }, [label, setCurrentPageLabel]);

  return null;
}
