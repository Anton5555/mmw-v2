'use client';

import Link from 'next/link';
import { Star } from 'lucide-react';
import type { List as ListType } from '@/lib/validations/generated';
import type { YearTopSummaryItem } from '@/lib/validations/year-top';
import { InfoPopover } from '@/components/ui/info-popover';
import { cn } from '@/lib/utils';

interface MovieSidebarProps {
  totalPoints?: number | null;
  totalPicks?: number | null;
  yearTopSummary?: YearTopSummaryItem[];
  otherLists?: ListType[];
  /** Tighter stats for the details sheet. */
  compact?: boolean;
}

export function MovieSidebar({
  totalPoints,
  totalPicks,
  yearTopSummary = [],
  otherLists = [],
  compact = false,
}: MovieSidebarProps) {
  return (
    <aside className={compact ? 'space-y-8' : 'space-y-10'}>
      {/* Stats Widget - Bento Grid */}
      {(totalPoints ?? 0) > 0 || (totalPicks ?? 0) > 0 ? (
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-sm border border-border bg-border">
          {(totalPoints ?? 0) > 0 && (
            <div className={cn('bg-card', compact ? 'px-5 py-4' : 'p-6')}>
              <span
                className={cn(
                  'block font-display font-bold tabular-nums text-primary',
                  compact ? 'text-3xl' : 'text-4xl'
                )}
              >
                {totalPoints}
              </span>
              <span className="text-xs text-muted-foreground">
                Puntos
              </span>
            </div>
          )}
          <div
            className={cn(
              'bg-card',
              compact ? 'px-5 py-4' : 'p-6',
              (totalPoints ?? 0) <= 0 && 'col-span-2'
            )}
          >
            <span
              className={cn(
                'block font-display font-bold tabular-nums',
                compact ? 'text-3xl' : 'text-4xl'
              )}
            >
              {totalPicks ?? 0}
            </span>
            <span className="text-xs text-muted-foreground">
              Votos
            </span>
          </div>
        </div>
      ) : null}

      {/* Year Tops Widget */}
      {yearTopSummary.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold">
            Historial de Tops
          </h3>
          <div className="flex flex-col gap-2">
            {Object.entries(
              yearTopSummary.reduce((acc, item) => {
                if (!acc[item.year]) {
                  acc[item.year] = [];
                }
                acc[item.year].push(item);
                return acc;
              }, {} as Record<number, YearTopSummaryItem[]>)
            )
              .sort(([yearA], [yearB]) => parseInt(yearB) - parseInt(yearA))
              .map(([year, items]) => (
                <div key={year} className="space-y-2">
                  <h4 className="text-sm font-semibold text-muted-foreground tabular-nums">{year}</h4>
                  <div className="space-y-2">
                    {items.map((item) => {
                      const pickTypeLabel =
                        item.pickType === 'TOP_10'
                          ? 'Top 10'
                          : item.pickType === 'BEST_SEEN'
                            ? 'Mejor Vista'
                            : 'Peores 3';

                      const uniqueParticipants = Array.from(
                        new Map(
                          item.picks.map((pick) => [
                            pick.participant.id,
                            pick.participant.displayName,
                          ])
                        ).values()
                      );

                      const content = (
                        <div className="space-y-1">
                          <p className="font-bold text-xs text-foreground">
                            Participantes ({uniqueParticipants.length})
                          </p>
                          <p className="text-xs leading-snug text-muted-foreground">
                            {uniqueParticipants.join(' • ')}
                          </p>
                        </div>
                      );

                      return (
                        <InfoPopover
                          key={`${year}-${item.pickType}`}
                          content={content}
                          side="top"
                          className="max-w-[200px]"
                        >
                          <div className="group flex cursor-pointer items-center justify-between rounded-sm border border-border bg-card p-3 transition-colors hover:border-primary/60">
                            <div>
                              <div className="text-sm font-semibold text-foreground">
                                {pickTypeLabel}
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Star className="size-3 fill-primary text-primary" />
                              <span className="font-medium">{item.totalPoints} pts</span>
                            </div>
                          </div>
                        </InfoPopover>
                      );
                    })}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Other Lists Widget - Pill Style */}
      {otherLists.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold">
            En colecciones
          </h3>
          <div className="flex flex-wrap gap-2">
            {otherLists.map((list) => (
              <Link
                key={list.id}
                href={`/lists/${list.id}`}
                className="rounded-sm border border-border bg-card px-3 py-2 text-sm transition-colors hover:border-primary hover:text-primary active:border-primary sm:px-2.5 sm:py-1 sm:text-xs"
              >
                {list.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}
