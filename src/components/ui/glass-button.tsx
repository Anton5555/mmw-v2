import * as React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { ExternalLink } from 'lucide-react';

interface GlassButtonProps
  extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  children: React.ReactNode;
  showExternalIcon?: boolean;
  variant?: 'default' | 'compact';
  target?: string;
}

export const GlassButton = React.forwardRef<HTMLAnchorElement, GlassButtonProps>(
  (
    {
      href,
      children,
      className,
      showExternalIcon = false,
      variant = 'default',
      target,
      ...props
    },
    ref
  ) => {
    const baseClasses =
      'group flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-6 py-3 text-xs font-bold uppercase tracking-widest transition-all hover:bg-white/20 hover:backdrop-blur-md';
    const compactClasses = 'px-4 py-2';

    return (
      <Link
        href={href}
        ref={ref}
        target={target}
        className={cn(
          baseClasses,
          variant === 'compact' && compactClasses,
          className
        )}
        {...props}
      >
        {children}
        {showExternalIcon && (
          <ExternalLink className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
        )}
      </Link>
    );
  }
);

GlassButton.displayName = 'GlassButton';
