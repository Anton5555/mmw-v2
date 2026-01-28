'use client';

import { motion } from 'motion/react';
import { CheckCircle2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type {
  CategoryPredictionStats,
  LeaderboardEntry,
  OscarEdition,
} from '@/lib/validations/oscars';
import { cn } from '@/lib/utils';

interface OscarResultsViewProps {
  stats: CategoryPredictionStats[];
  leaderboard: LeaderboardEntry[];
  edition: OscarEdition;
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((s) => s[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function OscarResultsView({
  stats,
  leaderboard,
  edition,
}: OscarResultsViewProps) {
  const totalCategories = stats.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7 }}
      className="space-y-12"
    >
      {/* Leaderboard Table */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-500">
          Clasificación
        </h2>
        <div className="overflow-hidden rounded-xl border border-white/10 bg-zinc-900/50">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[400px] text-left">
              <thead>
                <tr className="border-b border-white/10 bg-zinc-900/80">
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    #
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Participante
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Pts
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Enviado
                  </th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry, i) => (
                  <motion.tr
                    key={entry.userId}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: i * 0.02 }}
                    className={cn(
                      'border-b border-white/5 transition-colors last:border-b-0',
                      entry.isWinner ? 'bg-yellow-500/10' : 'hover:bg-white/5',
                    )}
                  >
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'font-bold tabular-nums',
                          entry.isWinner ? 'text-yellow-500' : 'text-zinc-400',
                        )}
                      >
                        {entry.rank}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8 border border-white/10">
                          {entry.userImage && (
                            <AvatarImage
                              src={entry.userImage}
                              alt={entry.userName}
                            />
                          )}
                          <AvatarFallback className="bg-zinc-800 text-xs font-medium text-zinc-300">
                            {getInitials(entry.userName)}
                          </AvatarFallback>
                        </Avatar>
                        <span
                          className={cn(
                            'font-medium',
                            entry.isWinner && 'text-yellow-500',
                          )}
                        >
                          {entry.userName}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono font-semibold tabular-nums text-white">
                      {entry.score} / {totalCategories}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-500">
                      {new Date(entry.submittedAt).toLocaleDateString('es-ES', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        {leaderboard.length === 0 && (
          <p className="rounded-xl border border-white/5 bg-zinc-900/30 px-4 py-6 text-center text-sm text-zinc-500">
            Aún no hay participantes.
          </p>
        )}
      </section>

      {/* Category Winners Grid */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-500">
          Ganadores por categoría
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {stats.map((category, i) => {
            const winner = category.winner;

            return (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.02 }}
                className={cn(
                  'relative overflow-hidden rounded-xl border p-5 transition-all',
                  winner
                    ? 'border-yellow-500/30 bg-yellow-500/5'
                    : 'border-white/5 bg-zinc-900/30',
                )}
              >
                <span className="text-[10px] font-black uppercase tracking-widest text-yellow-500/70">
                  {category.name}
                </span>
                {winner ? (
                  <div className="mt-3 flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-yellow-500" />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold leading-tight text-white">
                        {winner.nomineeName}
                      </p>
                      {winner.filmTitle &&
                        winner.filmTitle.trim() !==
                          winner.nomineeName.trim() && (
                          <p className="mt-0.5 text-sm italic text-zinc-500">
                            {winner.filmTitle}
                          </p>
                        )}
                    </div>
                  </div>
                ) : category.winnerId != null ? (
                  <p className="mt-3 text-sm text-zinc-500">
                    Ganador sin datos
                  </p>
                ) : (
                  <p className="mt-3 text-sm text-zinc-500">
                    Sin ganador asignado
                  </p>
                )}
                <div className="absolute -bottom-2 -right-2 pointer-events-none select-none text-[5rem] font-black italic leading-none text-white/5">
                  {category.order}
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>
    </motion.div>
  );
}
