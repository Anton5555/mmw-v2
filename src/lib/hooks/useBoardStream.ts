'use client';

import { useEffect, useRef, useState } from 'react';

import { supabase } from '@/lib/supabase-client';
import type { BoardEvent, BoardPost } from '@/lib/types/board';

export function useBoardStream(
  onEvent: (event: BoardEvent) => void,
  enabled: boolean = true
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

    // Create a channel for BoardPost changes
    const channel = supabase
      .channel('board_post_changes', {
        config: {
          broadcast: { self: true },
        },
      })
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events
          schema: 'public',
          table: 'BoardPost',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            // Fetch all posts to get full data with relations
            fetch('/api/board')
              .then((res) => res.json())
              .then((posts: BoardPost[]) => {
                const newPost = posts.find((p) => p.id === payload.new.id);
                if (newPost) {
                  onEventRef.current({
                    type: 'post-it:created',
                    data: newPost,
                  });
                }
              })
              .catch((error) => {
                console.error('[useBoardStream] Error fetching posts:', error);
              });
          } else if (payload.eventType === 'UPDATE') {
            // Fetch all posts to get full data with relations
            fetch('/api/board')
              .then((res) => res.json())
              .then((posts: BoardPost[]) => {
                const updatedPost = posts.find((p) => p.id === payload.new.id);
                if (updatedPost) {
                  onEventRef.current({
                    type: 'post-it:updated',
                    data: updatedPost,
                  });
                }
              })
              .catch((error) => {
                console.error('[useBoardStream] Error fetching posts:', error);
              });
          } else if (payload.eventType === 'DELETE') {
            onEventRef.current({
              type: 'post-it:deleted',
              data: { id: payload.old.id },
            });
          }
        }
      )
      .subscribe((status, err) => {
        if (err) {
          console.error('[useBoardStream] Subscription error:', err);
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
  }, [enabled]);

  return { isConnected };
}
