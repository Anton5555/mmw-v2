'use client';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { env } from '@/env';

let supabaseInstance: SupabaseClient | null = null;

/**
 * Get or create a singleton Supabase client instance.
 * This ensures we only create one client instance across the application,
 * which is more efficient and prevents connection issues.
 *
 * Note: We use the ANON_KEY client-side because we're only using Supabase
 * for real-time subscriptions (read-only). All data mutations are handled
 * through authenticated API routes using Better Auth.
 */
export function getSupabaseClient(): SupabaseClient {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  // Validate that required env vars are available
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error(
      'Missing Supabase environment variables. Please check your .env file.'
    );
  }

  supabaseInstance = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: false, // We don't need auth persistence since we use Better Auth
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      realtime: {
        params: {
          eventsPerSecond: 10, // Limit events per second for better performance
        },
        heartbeatIntervalMs: 30000, // 30 seconds
        reconnectAfterMs: (tries: number) => Math.min(tries * 1000, 10000), // Exponential backoff, max 10s
      },
      global: {
        headers: {
          'X-Client-Info': 'mmw-v2@client',
        },
      },
    }
  );

  return supabaseInstance;
}

// Export a singleton instance for convenience
// Use getSupabaseClient() directly if you need to ensure initialization
export const supabase = getSupabaseClient();
