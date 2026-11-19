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
        <h2 className="text-xl font-bold">
          Clasificación
        </h2>
        <div className="overflow-hidden rounded-xl border border-border bg-zinc-900/50">
          <div className="overflow-x-auto">
            <table className="w-full text-left sm:min-w-[400px]">
              <thead>
                <tr className="border-b border-border bg-zinc-900/80">
                  <th className="px-3 py-3 text-xs font-semibold text-muted-foreground sm:px-4">
                    #
                  </th>
                  <th className="px-3 py-3 text-xs font-semibold text-muted-foreground sm:px-4">
                    Participante
                  </th>
                  <th className="px-3 py-3 text-xs font-semibold text-muted-foreground sm:px-4">
                    Pts
                  </th>
                  <th className="hidden px-4 py-3 text-xs font-semibold text-muted-foreground sm:table-cell">
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
                      'border-b border-border/60 transition-colors last:border-b-0',
                      entry.isWinner ? 'bg-secondary/60 shadow-[inset_3px_0_0_hsl(var(--primary))]' : 'hover:bg-white/5',
                    )}
                  >
                    <td className="px-3 py-3 sm:px-4">
                      <span
                        className={cn(
                          'font-bold tabular-nums',
                          entry.isWinner ? 'text-yellow-500' : 'text-zinc-400',
                        )}
                      >
                        {entry.rank}
                      </span>
                    </td>
                    <td className="px-3 py-3 sm:px-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8 border border-border">
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
                    <td className="whitespace-nowrap px-3 py-3 font-mono font-semibold sm:px-4 tabular-nums text-white">
                      {entry.score} / {totalCategories}
                    </td>
                    <td className="hidden px-4 py-3 text-sm text-zinc-500 sm:table-cell">
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
          <p className="rounded-xl border border-border/60 bg-zinc-900/30 px-4 py-6 text-center text-sm text-zinc-500">
            Aún no hay participantes.
          </p>
        )}
      </section>

      {/* Category Winners Grid */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold">
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
                  'relative overflow-hidden rounded-xl border p-5 transition-colors',
                  winner
                    ? 'border-border bg-card'
                    : 'border-dashed border-border/60 bg-transparent',
                )}
              >
                <span className="text-sm font-semibold text-primary">
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
                          <p className="mt-0.5 text-sm text-muted-foreground">
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
              </motion.div>
            );
          })}
        </div>
      </section>
    </motion.div>
  );
}
