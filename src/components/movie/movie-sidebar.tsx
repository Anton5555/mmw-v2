'use client';

import Link from 'next/link';
import { Star } from 'lucide-react';
import type { List as ListType } from '@/lib/validations/generated';
import type { YearTopSummaryItem } from '@/lib/validations/year-top';
import { InfoPopover } from '@/components/ui/info-popover';

interface MovieSidebarProps {
  totalPoints?: number | null;
  totalPicks?: number | null;
  yearTopSummary?: YearTopSummaryItem[];
  otherLists?: ListType[];
}

export function MovieSidebar({
  totalPoints,
  totalPicks,
  yearTopSummary = [],
  otherLists = [],
}: MovieSidebarProps) {
  return (
    <aside className="space-y-10">
      {/* Stats Widget - Bento Grid */}
      {(totalPoints ?? 0) > 0 || (totalPicks ?? 0) > 0 ? (
        <div className="grid grid-cols-2 gap-px bg-white/10 rounded-xl overflow-hidden border border-white/10">
          {(totalPoints ?? 0) > 0 && (
            <div className="bg-[#0a0a0a] p-6">
              <span className="block text-3xl font-black text-yellow-500">
                {totalPoints}
              </span>
              <span className="text-[10px] uppercase tracking-tighter text-zinc-500">
                Puntos
              </span>
            </div>
          )}
          <div
            className={`bg-[#0a0a0a] p-6 ${(totalPoints ?? 0) > 0 ? '' : 'col-span-2'}`}
          >
            <span className="block text-3xl font-black">{totalPicks ?? 0}</span>
            <span className="text-[10px] uppercase tracking-tighter text-zinc-500">
              Votos
            </span>
          </div>
        </div>
      ) : null}

      {/* Year Tops Widget */}
      {yearTopSummary.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
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
                  <h4 className="text-sm font-bold text-white/60">{year}</h4>
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
                          <p className="font-bold text-xs text-white">
                            Participantes ({uniqueParticipants.length})
                          </p>
                          <p className="text-[11px] leading-snug text-zinc-400">
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
                          <div className="bg-zinc-900/50 border border-white/5 p-3 rounded-lg flex justify-between items-center group hover:border-white/20 transition-colors cursor-pointer active:scale-[0.98]">
                            <div>
                              <div className="text-xs font-bold text-zinc-200 group-hover:text-white">
                                {pickTypeLabel}
                              </div>
                              <div className="text-[10px] text-zinc-500 uppercase tracking-tight">
                                {item.pickType.replace('_', ' ')}
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
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
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
            En colecciones
          </h3>
          <div className="flex flex-wrap gap-2">
            {otherLists.map((list) => (
              <Link
                key={list.id}
                href={`/lists/${list.id}`}
                className="text-[11px] bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1 rounded-full transition-colors"
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
