'use client';

import React, { createContext, useContext, useState } from 'react';

type BreadcrumbContextType = {
  currentPageLabel: string | undefined;
  setCurrentPageLabel: (label: string | undefined) => void;
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

  return (
    <BreadcrumbContext.Provider
      value={{ currentPageLabel, setCurrentPageLabel }}
    >
      {children}
    </BreadcrumbContext.Provider>
  );
}

export function useBreadcrumb() {
  const context = useContext(BreadcrumbContext);
  if (context === undefined) {
    throw new Error('useBreadcrumb must be used within a BreadcrumbProvider');
  }
  return context;
}
