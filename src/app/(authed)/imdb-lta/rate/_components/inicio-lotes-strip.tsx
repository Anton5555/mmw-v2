import { Check } from 'lucide-react';
import type { DashboardLote } from '@/lib/api/imdb-lta-dashboard';
import { InicioCard } from './inicio-card';

export function InicioLotesStrip({
  lotes,
  completedLotes,
}: {
  lotes: DashboardLote[];
  completedLotes: number;
}) {
  if (lotes.length === 0) return null;

  return (
    <InicioCard
      eyebrow="Tus lotes"
      title={`Completaste ${completedLotes} de ${lotes.length}`}
      className="sm:col-span-2"
    >
      <ol className="flex flex-wrap gap-2">
        {lotes.map((lote) => (
          <li
            key={lote.number}
            className={`flex min-w-[6.5rem] flex-col gap-1 rounded-2xl border px-3 py-2 ${
              lote.complete
                ? 'border-yellow-500/50 bg-yellow-500/10'
                : 'border-border/60 bg-zinc-900/80'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-sm font-black text-zinc-100">
                Lote {lote.number}
              </span>
              {lote.complete ? (
                <Check
                  className="size-4 text-yellow-400"
                  aria-label="Completo"
                />
              ) : null}
            </div>
            <span className="text-xs text-zinc-400">
              {lote.isOpen ? 'Abierto' : 'Cerrado'} · vistas{' '}
              <span className="font-mono text-zinc-200">
                {lote.watchedCount}/{lote.movieCount}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </InicioCard>
  );
}
