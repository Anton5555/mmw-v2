import * as React from 'react';
import { cn } from '@/lib/utils';

type GlassCardProps = React.ComponentProps<'div'> & {
  variant?: 'default' | 'stats' | 'review';
};

export function GlassCard({
  className,
  variant = 'default',
  children,
  ref,
  ...props
}: GlassCardProps) {
  const variants = {
    default: 'rounded-sm border border-border bg-card',
    stats: 'rounded-sm border border-border bg-card p-6',
    review: 'group rounded-sm border border-border bg-card',
  };

  return (
    <div
      ref={ref}
      className={cn(variants[variant], className)}
      {...props}
    >
      {children}
    </div>
  );
}
