import type { DashboardBucket } from '@/lib/api/imdb-lta-dashboard';
import { StatsCard } from './stats-card';

const numberFormat = new Intl.NumberFormat('es', { maximumFractionDigits: 1 });

export function StatsCompositionCard({
  title,
  buckets,
  missingCount = 0,
}: {
  title: string;
  buckets: DashboardBucket[];
  missingCount?: number;
}) {
  if (buckets.length === 0) return null;
  const max = Math.max(1, ...buckets.map((b) => b.releasedCount));

  return (
    <StatsCard eyebrow="Lo que salió" title={title}>
      <div className="flex items-center gap-4 text-xs text-zinc-500" aria-hidden>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-sm bg-zinc-700" /> Salieron
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-sm bg-yellow-500" /> Viste
        </span>
      </div>
      <ul className="space-y-2.5">
        {buckets.map((bucket) => (
          <li key={bucket.label} className="space-y-1">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate text-zinc-200">{bucket.label}</span>
              <span className="shrink-0 font-mono text-xs text-zinc-400">
                {bucket.watchedCount}/{bucket.releasedCount}
                {bucket.myAverage !== null ? (
                  <span className="text-zinc-500">
                    {' · tu prom. '}
                    <span className="text-zinc-300">
                      {numberFormat.format(bucket.myAverage)}
                    </span>
                  </span>
                ) : null}
              </span>
            </div>
            <div
              className="relative h-1.5 overflow-hidden rounded-sm bg-zinc-800"
              role="img"
              aria-label={`${bucket.label}: viste ${bucket.watchedCount} de ${bucket.releasedCount}`}
            >
              <div
                className="absolute inset-y-0 left-0 rounded-sm bg-zinc-700"
                style={{ width: `${(bucket.releasedCount / max) * 100}%` }}
              />
              <div
                className="absolute inset-y-0 left-0 rounded-sm bg-yellow-500"
                style={{ width: `${(bucket.watchedCount / max) * 100}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
      {missingCount > 0 ? (
        <p className="text-xs text-zinc-500">
          {missingCount === 1
            ? '1 película sin datos.'
            : `${missingCount} películas sin datos.`}
        </p>
      ) : null}
    </StatsCard>
  );
}
