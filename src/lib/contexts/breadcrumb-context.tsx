'use client';

import React, { createContext, use, useState } from 'react';

export type IntermediateBreadcrumb = {
  label: string;
  href: string;
};

type BreadcrumbContextType = {
  currentPageLabel: string | undefined;
  setCurrentPageLabel: (label: string | undefined) => void;
  intermediateBreadcrumbs: IntermediateBreadcrumb[];
  setIntermediateBreadcrumbs: (breadcrumbs: IntermediateBreadcrumb[]) => void;
};

const BreadcrumbContext = createContext<BreadcrumbContextType | undefined>(
  undefined
);

export function BreadcrumbProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [currentPageLabel, setCurrentPageLabel] = useState<string | undefined>(
    undefined
  );
  const [intermediateBreadcrumbs, setIntermediateBreadcrumbs] = useState<
    IntermediateBreadcrumb[]
  >([]);

  return (
    <BreadcrumbContext
      value={{
        currentPageLabel,
        setCurrentPageLabel,
        intermediateBreadcrumbs,
        setIntermediateBreadcrumbs,
      }}
    >
      {children}
    </BreadcrumbContext>
  );
}

export function useBreadcrumb() {
  const context = use(BreadcrumbContext);
  if (context === undefined) {
    throw new Error('useBreadcrumb must be used within a BreadcrumbProvider');
  }
  return context;
}
