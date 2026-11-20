import type { DashboardStats } from '@/lib/api/imdb-lta-dashboard';
import { InicioCompositionCard } from './inicio-composition-card';
import { InicioLotesStrip } from './inicio-lotes-strip';
import { InicioScoreProfile } from './inicio-score-profile';
import { InicioWeeklyActivity } from './inicio-weekly-activity';

/**
 * Personal stats only. Never pass group data (averages, rating counts,
 * rankings) into these components: members must not be nudged while voting.
 */
export function InicioStats({ stats }: { stats: DashboardStats | null }) {
  if (!stats || stats.inScopeCount === 0) return null;

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <InicioLotesStrip
        lotes={stats.lotes}
        completedLotes={stats.completedLotes}
      />
      <InicioScoreProfile stats={stats} />
      <InicioWeeklyActivity
        weekly={stats.weekly}
        thisWeekCount={stats.thisWeekCount}
      />
      <InicioCompositionCard title="Por década" buckets={stats.byDecade} />
      <InicioCompositionCard
        title="Por género"
        buckets={stats.byGenre}
        missingCount={stats.missingGenre}
      />
      <InicioCompositionCard
        title="Por país"
        buckets={stats.byCountry}
        missingCount={stats.missingCountry}
      />
    </div>
  );
}
