'use client';

import { useRouter } from 'next/navigation';
import { Maximize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from '@/components/ui/sheet';

interface MovieSheetProps {
  title: string;
  /** Canonical full-page URL for this movie. */
  fullPageHref: string;
  children: React.ReactNode;
}

/** Route-driven sheet: closing it goes back to the page underneath. */
export function MovieSheet({ title, fullPageHref, children }: MovieSheetProps) {
  const router = useRouter();
  const isMobile = useIsMobile();

  return (
    <Sheet open onOpenChange={(open) => !open && router.back()}>
      <SheetContent
        side={isMobile ? 'bottom' : 'right'}
        className={cn(
          'overflow-y-auto border-white/10 bg-[#0a0a0a] p-0 sm:max-w-3xl',
          isMobile && 'max-h-[92vh]'
        )}
      >
        <SheetTitle className="sr-only">{title}</SheetTitle>
        <SheetDescription className="sr-only">
          Detalles de {title}
        </SheetDescription>
        <div className="sticky top-0 z-10 flex h-12 items-center border-b border-white/10 bg-[#0a0a0a]/90 px-4 backdrop-blur">
          {/* Plain anchor on purpose: a hard navigation skips the interception. */}
          <a
            href={fullPageHref}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-white/60 transition-colors hover:text-white"
          >
            <Maximize2 className="h-3.5 w-3.5" />
            Abrir página completa
          </a>
        </div>
        {children}
      </SheetContent>
    </Sheet>
  );
}
