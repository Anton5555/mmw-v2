import * as React from 'react';
import { GlassCard } from './glass-card';
import { cn } from '@/lib/utils';

interface GlassStatsCardProps {
  title: string;
  value: string | number;
  label: string;
  className?: string;
}

export function GlassStatsCard({
  title,
  value,
  label,
  className,
}: GlassStatsCardProps) {
  return (
    <GlassCard variant="stats" className={className}>
      <h3 className="mb-4 text-xs font-black uppercase tracking-[0.2em] text-white/40">
        {title}
      </h3>
      <div>
        <p className="text-3xl font-black">{value}</p>
        <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">
          {label}
        </p>
      </div>
    </GlassCard>
  );
}

interface GlassStatsGridProps {
  stats: Array<{ title: string; value: string | number; label: string }>;
  className?: string;
}

export function GlassStatsGrid({ stats, className }: GlassStatsGridProps) {
  return (
    <div className={cn('grid grid-cols-2 gap-4', className)}>
      {stats.map((stat, index) => (
        <GlassStatsCard key={index} {...stat} />
      ))}
    </div>
  );
}
