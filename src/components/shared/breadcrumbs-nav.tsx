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
import { ChevronRight, Home } from 'lucide-react';

const PATH_TRANSLATIONS: Record<string, string> = {
  lists: 'Listas',
  calendar: 'Calendario',
  mam: 'Miralas Antes de Morir',
  padlet: 'Padlet',
  about: 'Sobre la app',
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
      // Skip numeric segments (IDs) - they'll be replaced by currentPageLabel or intermediate breadcrumbs
      if (/^\d+$/.test(path)) {
        return false;
      }
      return true;
    });

  // Find where to insert intermediate breadcrumbs (after the last path-based breadcrumb, before the current page)
  const lastPathIndex = breadcrumbItems.length - 1;

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 bg-background/60 backdrop-blur-xl transition-all duration-300 border-b border-white/5">
      <div className="flex flex-1 items-center gap-2 px-4">
        <div className="flex items-center gap-1">
          <SidebarTrigger className="h-8 w-8 hover:bg-white/10 transition-colors" />
          <Separator orientation="vertical" className="mx-2 h-4 bg-white/10" />
        </div>

        <Breadcrumb>
          <BreadcrumbList className="gap-1 sm:gap-1 animate-breadcrumb-fade">
            {/* Optional: Home Icon for better orientation */}
            <BreadcrumbItem className="hidden md:block">
              <BreadcrumbLink
                href="/"
                className="hover:text-primary transition-colors"
              >
                <Home className="h-3.5 w-3.5" />
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block">
              <ChevronRight className="h-3 w-3 opacity-40" />
            </BreadcrumbSeparator>

            {breadcrumbItems.map(({ path, originalIndex }, index) => {
              const href = `/${paths.slice(0, originalIndex + 1).join('/')}`;
              const isLastPathItem = index === lastPathIndex;
              const displayText =
                PATH_TRANSLATIONS[path] || path.replace(/-/g, ' ');

              return (
                <React.Fragment key={`${path}-${originalIndex}`}>
                  <BreadcrumbItem>
                    <BreadcrumbLink
                      href={href}
                      className="text-xs font-medium uppercase tracking-wider text-muted-foreground/80 hover:text-primary transition-colors"
                    >
                      {displayText}
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator>
                    <ChevronRight className="h-3 w-3 opacity-40" />
                  </BreadcrumbSeparator>
                  {/* Insert intermediate breadcrumbs after this path item if it's the last one */}
                  {isLastPathItem &&
                    intermediateBreadcrumbs.map((intermediate, idx) => (
                      <React.Fragment key={`intermediate-${idx}`}>
                        <BreadcrumbItem>
                          <BreadcrumbLink
                            href={intermediate.href}
                            className="text-xs font-medium uppercase tracking-wider text-muted-foreground/80 hover:text-primary transition-colors"
                          >
                            {intermediate.label}
                          </BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator>
                          <ChevronRight className="h-3 w-3 opacity-40" />
                        </BreadcrumbSeparator>
                      </React.Fragment>
                    ))}
                </React.Fragment>
              );
            })}

            {/* Current page label */}
            {currentPageLabel && (
              <BreadcrumbItem>
                <BreadcrumbPage className="text-xs font-black uppercase tracking-widest text-foreground bg-white/5 px-2 py-1 rounded-md border border-white/10">
                  {currentPageLabel}
                </BreadcrumbPage>
              </BreadcrumbItem>
            )}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </header>
  );
}
