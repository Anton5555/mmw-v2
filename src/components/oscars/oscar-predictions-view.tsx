'use client';

import { motion } from 'motion/react';
import type {
  CategoryPredictionStats,
  OscarEdition,
} from '@/lib/validations/oscars';
import { cn } from '@/lib/utils';

interface OscarPredictionsViewProps {
  stats: CategoryPredictionStats[];
  edition: OscarEdition;
}

export function OscarPredictionsView({
  stats,
  edition,
}: OscarPredictionsViewProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7 }}
      className="space-y-8"
    >
      <div className="space-y-8 rounded-2xl bg-[#0a0a0a] p-8">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {stats.map((category, i) => (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.02 }}
              className="group relative overflow-hidden rounded-xl border border-white/5 bg-zinc-900/30 p-5 transition-all hover:border-white/20"
            >
              <div className="relative flex flex-col space-y-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-yellow-500/70">
                  {category.name}
                </span>

                <div className="space-y-3">
                  {category.topPicks.map((pick, idx) => (
                    <div key={pick.nomineeId} className="space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <span className="shrink-0 pt-0.5 text-xs font-bold text-zinc-400">
                          {idx + 1}.
                        </span>
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <span className="block truncate font-semibold leading-tight text-white group-hover:text-yellow-500/90">
                            {pick.nomineeName}
                          </span>
                          {pick.filmTitle &&
                            pick.filmTitle.trim() !==
                              pick.nomineeName.trim() && (
                              <span className="block truncate text-xs italic text-zinc-500">
                                {pick.filmTitle}
                              </span>
                            )}
                        </div>
                        <span className="shrink-0 pt-0.5 text-xs text-zinc-500">
                          {pick.percentage}%
                        </span>
                      </div>
                      <div
                        className="h-1.5 overflow-hidden rounded-full bg-zinc-800"
                        title={`${pick.count} votos`}
                      >
                        <div
                          className={cn(
                            'h-full rounded-full bg-yellow-500/60 transition-all',
                            idx === 0 && 'bg-yellow-500/80',
                          )}
                          style={{ width: `${pick.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <p className="text-xs text-zinc-500">
                  {category.totalVotes}{' '}
                  {category.totalVotes === 1 ? 'voto' : 'votos'} en total
                </p>

                <div className="absolute -bottom-2 -right-2 pointer-events-none select-none text-[5rem] font-black italic leading-none text-white/5">
                  {category.order}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
