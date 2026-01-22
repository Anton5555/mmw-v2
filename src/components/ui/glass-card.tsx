import * as React from 'react';
import { cn } from '@/lib/utils';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'stats' | 'review';
}

export const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    const variants = {
      default:
        'rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md',
      stats: 'rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-6',
      review:
        'group rounded-2xl border border-white/5 bg-white/[0.03] transition-all hover:border-white/10',
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
