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
    'group inline-flex items-center gap-2 rounded-lg border border-white/10 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 hover:border-white/20';
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
