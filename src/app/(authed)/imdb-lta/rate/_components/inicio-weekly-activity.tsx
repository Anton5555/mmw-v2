import type { DashboardWeek } from '@/lib/api/imdb-lta-dashboard';
import { InicioCard } from './inicio-card';

const dayFormat = new Intl.DateTimeFormat('es', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
});

export function InicioWeeklyActivity({
  weekly,
  thisWeekCount,
}: {
  weekly: DashboardWeek[];
  thisWeekCount: number;
}) {
  if (weekly.length === 0) return null;
  const max = Math.max(1, ...weekly.map((w) => w.count));
  const total = weekly.reduce((sum, w) => sum + w.count, 0);

  return (
    <InicioCard
      eyebrow="Tu ritmo"
      title={
        thisWeekCount === 1
          ? 'Esta semana puntuaste 1'
          : `Esta semana puntuaste ${thisWeekCount}`
      }
    >
      <div
        className="flex h-24 items-end gap-1"
        role="img"
        aria-label={`Puntajes por semana en las últimas ${weekly.length} semanas: ${weekly
          .map((w) => `${dayFormat.format(w.weekStart)}: ${w.count}`)
          .join(', ')}`}
      >
        {weekly.map((week, index) => (
          <div
            key={week.weekStart.toISOString()}
            className="flex h-full flex-1 flex-col justify-end"
            title={`Semana del ${dayFormat.format(week.weekStart)}: ${week.count}`}
          >
            <div
              className={`w-full rounded-sm ${
                index === weekly.length - 1 ? 'bg-yellow-500' : 'bg-zinc-600'
              }`}
              style={{
                height: week.count > 0 ? `${(week.count / max) * 100}%` : '2px',
              }}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between font-mono text-[10px] text-zinc-500">
        <span>{dayFormat.format(weekly[0].weekStart)}</span>
        <span>Esta semana</span>
      </div>
      <p className="text-xs text-zinc-500">
        {total === 0
          ? 'No puntuaste nada en las últimas 12 semanas.'
          : `${total} puntajes en las últimas 12 semanas.`}
      </p>
    </InicioCard>
  );
}
