'use client';

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
  open: boolean;
  onClose: () => void;
  title: string;
  /** Canonical full-page URL for this movie. */
  fullPageHref: string;
  children: React.ReactNode;
}

export function MovieSheet({
  open,
  onClose,
  title,
  fullPageHref,
  children,
}: MovieSheetProps) {
  const isMobile = useIsMobile();

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
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
        <div className="sticky top-0 z-10 flex h-14 items-center border-b border-white/10 bg-[#0a0a0a]/90 px-4 backdrop-blur">
          {/* Plain anchor on purpose: a hard navigation skips the link interception. */}
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
