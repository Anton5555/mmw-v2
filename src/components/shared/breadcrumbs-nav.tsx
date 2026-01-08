'use client';

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { usePathname } from 'next/navigation';
import React from 'react';
import { useBreadcrumb } from '@/lib/contexts/breadcrumb-context';

const PATH_TRANSLATIONS: Record<string, string> = {
  lists: 'Listas',
  calendar: 'Calendario',
  mam: 'MAM',
  padlet: 'Padlet',
  about: 'Sobre la app',
};

export function BreadcrumbsNav() {
  const { currentPageLabel } = useBreadcrumb();
  const pathname = usePathname();
  const paths = pathname.split('/').filter(Boolean);

  // Filter out "movie" segment when it's followed by an ID (numeric path segment)
  // Build filtered paths with their original indices for href calculation
  const breadcrumbItems = paths
    .map((path, index) => ({ path, originalIndex: index }))
    .filter(({ path, originalIndex }) => {
      // Skip "movie" if it's followed by a numeric segment (movie ID)
      if (path === 'movie' && originalIndex + 1 < paths.length) {
        const nextPath = paths[originalIndex + 1];
        // Check if next path is numeric (movie ID)
        if (/^\d+$/.test(nextPath)) {
          return false; // Skip "movie"
        }
      }
      return true;
    });

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
      <div className="flex items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />

        <Separator orientation="vertical" className="mr-2 h-4" />

        <Breadcrumb>
          <BreadcrumbList>
            {breadcrumbItems.map(({ path, originalIndex }, index) => {
              const href = `/${paths.slice(0, originalIndex + 1).join('/')}`;
              const isLast = index === breadcrumbItems.length - 1;
              const displayText =
                isLast && currentPageLabel
                  ? currentPageLabel
                  : PATH_TRANSLATIONS[path] || path.replace(/-/g, ' ');

              return (
                <React.Fragment key={`${path}-${originalIndex}`}>
                  <BreadcrumbItem>
                    {isLast ? (
                      <BreadcrumbPage className="capitalize">
                        {displayText}
                      </BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink href={href} className="capitalize">
                        {displayText}
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                  {!isLast && <BreadcrumbSeparator />}
                </React.Fragment>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </header>
  );
}
