'use client';

import { useEffect, useRef, useState } from 'react';

import { supabase } from '@/lib/supabase-client';
import type {
  CategoryPredictionStats,
  LeaderboardEntry,
} from '@/lib/validations/oscars';

export type OscarResultsData = {
  leaderboard: LeaderboardEntry[];
  stats: CategoryPredictionStats[];
};

export type OscarResultsEvent = {
  type: 'results:updated';
  data: OscarResultsData;
};

export function useOscarResultsStream(
  onEvent: (event: OscarResultsEvent) => void,
  editionId: number,
  enabled: boolean = true,
) {
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const onEventRef = useRef(onEvent);

  // Keep onEvent ref up to date without causing reconnections
  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!enabled) {
      if (channelRef.current) {
        void channelRef.current.unsubscribe();
        channelRef.current = null;
      }
      return;
    }

    // Create a channel for OscarCategory and OscarBallot changes
    const channel = supabase
      .channel('oscar_results_changes', {
        config: {
          broadcast: { self: true },
        },
      })
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events
          schema: 'public',
          table: 'OscarCategory',
          filter: `editionId=eq.${editionId}`,
        },
        () => {
          // When a category winner is updated, fetch fresh results
          fetch(`/api/oscars/results?editionId=${editionId}`)
            .then((res) => res.json())
            .then((data: OscarResultsData) => {
              onEventRef.current({
                type: 'results:updated',
                data,
              });
            })
            .catch((error) => {
              console.error(
                '[useOscarResultsStream] Error fetching results:',
                error,
              );
            });
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events
          schema: 'public',
          table: 'OscarBallot',
          filter: `editionId=eq.${editionId}`,
        },
        () => {
          // When a ballot score is updated, fetch fresh results
          fetch(`/api/oscars/results?editionId=${editionId}`)
            .then((res) => res.json())
            .then((data: OscarResultsData) => {
              onEventRef.current({
                type: 'results:updated',
                data,
              });
            })
            .catch((error) => {
              console.error(
                '[useOscarResultsStream] Error fetching results:',
                error,
              );
            });
        },
      )
      .subscribe((status, err) => {
        if (err) {
          console.error('[useOscarResultsStream] Subscription error:', err);
        }
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
        } else if (
          status === 'CHANNEL_ERROR' ||
          status === 'TIMED_OUT' ||
          status === 'CLOSED'
        ) {
          setIsConnected(false);
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        void channelRef.current.unsubscribe();
        channelRef.current = null;
      }
      setIsConnected(false);
    };
  }, [enabled, editionId]);

  return { isConnected };
}
