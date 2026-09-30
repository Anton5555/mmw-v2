'use client';

import { useState } from 'react';
import { useOscarResultsStream } from '@/lib/hooks/useOscarResultsStream';
import type {
  CategoryPredictionStats,
  LeaderboardEntry,
  OscarEdition,
} from '@/lib/validations/oscars';
import { OscarResultsView } from './oscar-results-view';

interface OscarResultsPageClientProps {
  initialLeaderboard: LeaderboardEntry[];
  initialStats: CategoryPredictionStats[];
  edition: OscarEdition;
}

export function OscarResultsPageClient({
  initialLeaderboard,
  initialStats,
  edition,
}: OscarResultsPageClientProps) {
  const [leaderboard, setLeaderboard] =
    useState<LeaderboardEntry[]>(initialLeaderboard);
  const [stats, setStats] = useState<CategoryPredictionStats[]>(initialStats);
  const [prevLeaderboard, setPrevLeaderboard] = useState(initialLeaderboard);
  const [prevStats, setPrevStats] = useState(initialStats);

  const handleResultsUpdate = (event: {
    type: 'results:updated';
    data: { leaderboard: LeaderboardEntry[]; stats: CategoryPredictionStats[] };
  }) => {
    if (event.type === 'results:updated') {
      setLeaderboard(event.data.leaderboard);
      setStats(event.data.stats);
    }
  };

  // Only enable streaming if ceremony has started
  const ceremonyStarted =
    edition.ceremonyDate && new Date(edition.ceremonyDate) <= new Date();

  useOscarResultsStream(
    handleResultsUpdate,
    edition.id,
    ceremonyStarted ?? false,
  );

  // Update state when initial props change (e.g., on navigation)
  if (initialLeaderboard !== prevLeaderboard || initialStats !== prevStats) {
    setPrevLeaderboard(initialLeaderboard);
    setPrevStats(initialStats);
    setLeaderboard(initialLeaderboard);
    setStats(initialStats);
  }

  return (
    <OscarResultsView
      stats={stats}
      leaderboard={leaderboard}
      edition={edition}
    />
  );
}
