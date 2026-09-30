/**
 * Dummy environment values satisfying `src/env.ts`.
 * Shared by vitest (vitest.setup.ts) and CI (`next build`, `prisma generate`).
 * Nothing here is a real secret.
 */
export const testEnv = {
  DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
  DIRECT_URL: 'postgresql://test:test@localhost:5432/test',
  TMDB_API_KEY: 'test-tmdb-key',
  RESEND_API_KEY: 'test-resend-key',
  APP_URL: 'http://localhost:3000',
  JWT_SECRET: 'test-jwt-secret',
  VIP_CODE: 'test-vip-code',
  STORAGE_ENDPOINT: 'http://localhost:9000',
  REGION: 'us-east-1',
  STORAGE_ACCESS_KEY: 'test-access-key',
  STORAGE_SECRET_KEY: 'test-secret-key',
  STORAGE_PUBLIC_URL: 'http://localhost:9000/public',
  TELEGRAM_BOT_TOKEN: 'test-bot-token',
  TELEGRAM_CHAT_ID: 'test-chat-id',
  CRON_SECRET: 'test-cron-secret',
  NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
  NEXT_PUBLIC_SUPABASE_URL: 'http://localhost:54321',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
} as const;
