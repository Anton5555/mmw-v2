'use client';

import * as React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface InfoPopoverProps {
  children: React.ReactNode;
  content: React.ReactNode;
  className?: string;
  side?: 'top' | 'right' | 'bottom' | 'left';
}

export function InfoPopover({ children, content, className, side = 'top' }: InfoPopoverProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = React.useState(false);

  if (!isMobile) {
    return (
      <TooltipProvider>
        <Tooltip delayDuration={200}>
          <TooltipTrigger asChild>{children}</TooltipTrigger>
          <TooltipContent 
            side={side} 
            className={cn('z-50 w-64 p-3 bg-zinc-950/95 backdrop-blur-md border-white/10 max-w-xs break-words text-popover-foreground', className)}
          >
            {content}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
        {children}
      </PopoverTrigger>
      <PopoverContent 
        side={side} 
        className={cn('z-50 w-64 p-3 bg-zinc-950/95 backdrop-blur-md border-white/10', className)}
      >
        {content}
      </PopoverContent>
    </Popover>
  );
}
