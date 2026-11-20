import type { RateProgressSummary } from '@/lib/api/imdb-lta';
import { InicioStat as Stat } from './inicio-stat';

type RevisarProgressCardProps = {
  progress: RateProgressSummary;
};

export function RevisarProgressCard({ progress }: RevisarProgressCardProps) {
  const {
    releasedCount,
    watchedCount,
    percent,
    pendingCount,
    notSeenCount,
    wantToWatchCount,
    myNominationsReleasedCount,
    myNominationsTotal,
  } = progress;

  return (
    <section
      aria-label="Tu progreso"
      className="space-y-4 rounded-3xl border border-border bg-zinc-950/60 p-5 sm:p-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-bold text-yellow-400">
            Progreso
          </p>
          {percent === null ? (
            <>
              <p className="text-2xl font-black uppercase italic tracking-tight text-zinc-100 sm:text-3xl">
                Todavía no salió ningún lote
              </p>
              <p className="text-sm text-zinc-400">
                Cuando se cierren películas de un lote, acá vas a ver cuánto
                viste de lo publicado.
              </p>
            </>
          ) : (
            <>
              <p className="text-2xl font-black uppercase italic tracking-tight text-zinc-100 sm:text-3xl">
                Viste {watchedCount} de {releasedCount}{' '}
                <span className="text-yellow-400">({percent}%)</span>
              </p>
              <p className="text-sm text-zinc-400">
                De las películas que ya salieron de un lote cerrado. Las que
                marcaste como no vistas no cuentan como vistas.
              </p>
            </>
          )}
        </div>
        {percent !== null ? (
          <div
            className="h-2 w-full overflow-hidden rounded-sm bg-zinc-800 sm:max-w-xs"
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Viste el ${percent} por ciento de las películas publicadas`}
          >
            <div
              className="h-full rounded-sm bg-yellow-500 transition-[width]"
              style={{ width: `${percent}%` }}
            />
          </div>
        ) : null}
      </div>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Por votar" value={pendingCount} />
        <Stat label="No vistas" value={notSeenCount} />
        <Stat label="Quiero ver" value={wantToWatchCount} />
        <Stat
          label="Tus noms. salidas"
          value={`${myNominationsReleasedCount}/${myNominationsTotal}`}
        />
      </dl>
    </section>
  );
}
