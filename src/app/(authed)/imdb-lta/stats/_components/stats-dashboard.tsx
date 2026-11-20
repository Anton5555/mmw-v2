import type { DashboardStats } from '@/lib/api/imdb-lta-dashboard';
import { StatsCompositionCard } from './stats-composition-card';
import { StatsLotesStrip } from './stats-lotes-strip';
import { StatsScoreProfile } from './stats-score-profile';
import { StatsWeeklyActivity } from './stats-weekly-activity';

/**
 * Personal stats only. Never pass group data (averages, rating counts,
 * rankings) into these components: members must not be nudged while voting.
 */
export function StatsDashboard({ stats }: { stats: DashboardStats }) {

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <StatsLotesStrip
        lotes={stats.lotes}
        completedLotes={stats.completedLotes}
      />
      <StatsScoreProfile stats={stats} />
      <StatsWeeklyActivity
        weekly={stats.weekly}
        thisWeekCount={stats.thisWeekCount}
      />
      <StatsCompositionCard title="Por década" buckets={stats.byDecade} />
      <StatsCompositionCard
        title="Por género"
        buckets={stats.byGenre}
        missingCount={stats.missingGenre}
      />
      <StatsCompositionCard
        title="Por país"
        buckets={stats.byCountry}
        missingCount={stats.missingCountry}
      />
    </div>
  );
}
