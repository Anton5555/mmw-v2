import type { DashboardStats } from '@/lib/api/imdb-lta-dashboard';
import { InicioCard } from './inicio-card';
import { InicioStat } from './inicio-stat';

const numberFormat = new Intl.NumberFormat('es', { maximumFractionDigits: 1 });

export function InicioScoreProfile({ stats }: { stats: DashboardStats }) {
  const { scoreHistogram, myAverage, mostUsedScore, scoredCount, notSeenCount } =
    stats;
  const max = Math.max(1, ...scoreHistogram);

  return (
    <InicioCard eyebrow="Solo tus puntajes" title="Tu forma de puntuar">
      <dl className="grid grid-cols-2 gap-3">
        <InicioStat
          label="Tu promedio"
          value={myAverage === null ? '—' : numberFormat.format(myAverage)}
        />
        <InicioStat
          label="Puntaje más usado"
          value={mostUsedScore === null ? '—' : mostUsedScore}
        />
        <InicioStat label="Puntuadas" value={scoredCount} />
        <InicioStat label="No vistas" value={notSeenCount} />
      </dl>

      {scoredCount > 0 ? (
        <figure>
          <div
            className="flex h-28 items-end gap-1"
            role="img"
            aria-label={`Distribución de tus puntajes: ${scoreHistogram
              .map((count, score) => `${score}: ${count}`)
              .join(', ')}`}
          >
            {scoreHistogram.map((count, score) => (
              <div
                key={score}
                className="flex h-full flex-1 flex-col items-center justify-end gap-1"
              >
                <span className="font-mono text-[10px] text-zinc-400">
                  {count > 0 ? count : ''}
                </span>
                <div
                  className="w-full rounded-sm bg-yellow-500"
                  style={{ height: `${(count / max) * 100}%` }}
                />
              </div>
            ))}
          </div>
          <div className="mt-1 flex gap-1" aria-hidden>
            {scoreHistogram.map((_, score) => (
              <span
                key={score}
                className="flex-1 text-center font-mono text-[10px] text-zinc-500"
              >
                {score}
              </span>
            ))}
          </div>
          <figcaption className="mt-2 text-xs text-zinc-500">
            Cuántas veces diste cada puntaje.
          </figcaption>
        </figure>
      ) : (
        <p className="text-sm text-zinc-400">
          Cuando puntúes películas, acá vas a ver cómo repartís tus notas.
        </p>
      )}
    </InicioCard>
  );
}
