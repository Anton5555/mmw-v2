'use client';

import { useState, useEffect } from 'react';
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
  useEffect(() => {
    setLeaderboard(initialLeaderboard);
    setStats(initialStats);
  }, [initialLeaderboard, initialStats]);

  return (
    <OscarResultsView
      stats={stats}
      leaderboard={leaderboard}
      edition={edition}
    />
  );
}
