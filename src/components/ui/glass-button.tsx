import * as React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { ExternalLink } from 'lucide-react';

type GlassButtonProps = React.ComponentProps<typeof Link> & {
  href: string;
  children: React.ReactNode;
  showExternalIcon?: boolean;
  variant?: 'default' | 'compact';
  target?: string;
};

export function GlassButton({
  href,
  children,
  className,
  showExternalIcon = false,
  variant = 'default',
  target,
  ref,
  ...props
}: GlassButtonProps) {
  const baseClasses =
    'group inline-flex items-center gap-2 rounded-sm border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:border-primary hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';
  const compactClasses = 'px-3 py-1.5 text-xs';

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
        <ExternalLink className="h-3 w-3" />
      )}
    </Link>
  );
}
