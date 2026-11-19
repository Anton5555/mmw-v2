'use client';

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { usePathname } from 'next/navigation';
import React from 'react';
import { useBreadcrumb } from '@/lib/contexts/breadcrumb-context';

const PATH_TRANSLATIONS: Record<string, string> = {
  lists: 'Listas',
  calendar: 'Calendario',
  mam: 'MAM',
  'imdb-lta': 'IMDB LTA',
  lote: 'Lote actual',
  rate: 'Revisar',
  ranking: 'Ranking',
  padlet: 'Padlet',
  about: 'Sobre la app',
  home: 'Inicio',
  board: 'Tablero',
  'year-tops': 'Top del Año',
  oscars: 'Oscalos',
  predictions: 'Predicciones',
  results: 'Resultados',
  admin: 'Administrar',
  'special-mentions': 'Menciones especiales',
  'my-list': 'Mi lista',
  participant: 'Participante',
  new: 'Nueva',
};

export function BreadcrumbsNav() {
  const { currentPageLabel, intermediateBreadcrumbs } = useBreadcrumb();
  const pathname = usePathname();
  const paths = pathname.split('/').filter(Boolean);

  // Filter out "movie" segment when it's followed by an ID (numeric path segment)
  // Also filter out numeric segments (IDs) themselves
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
      // "participant" has no page of its own (/mam/participant is a 404) and
      // is followed by a slug that the page names via currentPageLabel
      if (path === 'participant' && originalIndex + 1 < paths.length) {
        return false;
      }
      if (originalIndex > 0 && paths[originalIndex - 1] === 'participant') {
        return false;
      }
      // Skip numeric segments (IDs) - they'll be replaced by currentPageLabel or intermediate breadcrumbs
      if (/^\d+$/.test(path)) {
        return false;
      }
      return true;
    });

  // Find where to insert intermediate breadcrumbs (after the last path-based breadcrumb, before the current page)
  const lastPathIndex = breadcrumbItems.length - 1;

  // Top-level pages (/mam, /calendar...) already show their own title
  if (breadcrumbItems.length <= 1 && !currentPageLabel) return null;

  // Sections with their own tab row already say where you are.
  const hasOwnTabs =
    pathname.startsWith('/imdb-lta') || /^\/year-tops\/[^/]+$/.test(pathname);
  if (hasOwnTabs && !currentPageLabel) return null;

  const linkClass =
    'text-sm text-muted-foreground transition-colors hover:text-foreground';
  const separator = (
    <BreadcrumbSeparator className="text-border">
      <span aria-hidden>/</span>
    </BreadcrumbSeparator>
  );

  // A quiet trail inside the page column, not a second bar under the top nav.
  return (
    <div className="container relative z-10 mx-auto flex h-11 items-end px-4">
      <Breadcrumb>
        <BreadcrumbList className="no-scrollbar flex-nowrap gap-2 overflow-x-auto whitespace-nowrap sm:gap-2">
          {breadcrumbItems.map(({ path, originalIndex }, index) => {
            const href = `/${paths.slice(0, originalIndex + 1).join('/')}`;
            const isLastPathItem = index === lastPathIndex;
            const displayText =
              PATH_TRANSLATIONS[path] || path.replace(/-/g, ' ');
            const isCurrent = isLastPathItem && !currentPageLabel &&
              intermediateBreadcrumbs.length === 0;

            return (
              <React.Fragment key={`${path}-${originalIndex}`}>
                {index > 0 && separator}
                <BreadcrumbItem>
                  {isCurrent ? (
                    <BreadcrumbPage className="text-sm font-medium text-foreground">
                      {displayText}
                    </BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink href={href} className={linkClass}>
                      {displayText}
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
                {isLastPathItem &&
                  intermediateBreadcrumbs.map((intermediate, idx) => (
                    <React.Fragment key={`intermediate-${idx}`}>
                      {separator}
                      <BreadcrumbItem>
                        <BreadcrumbLink
                          href={intermediate.href}
                          className={linkClass}
                        >
                          {intermediate.label}
                        </BreadcrumbLink>
                      </BreadcrumbItem>
                    </React.Fragment>
                  ))}
              </React.Fragment>
            );
          })}

          {currentPageLabel && (
            <>
              {separator}
              <BreadcrumbItem className="min-w-0">
                <BreadcrumbPage className="truncate text-sm font-medium text-foreground">
                  {currentPageLabel}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </>
          )}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
}
