import * as React from 'react';
import { cn } from '@/lib/utils';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'stats' | 'review';
}

export const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    const variants = {
      default: 'rounded-xl border border-white/10 bg-zinc-900',
      stats: 'rounded-xl border border-white/10 bg-zinc-900 p-6',
      review:
        'group rounded-xl border border-white/10 bg-zinc-900 transition-colors hover:border-white/20',
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
);

GlassCard.displayName = 'GlassCard';
