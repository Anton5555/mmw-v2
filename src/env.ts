import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  server: {
    DATABASE_URL: z
      .string()
      .url()
      .refine(
        (str) => !str.includes('YOUR_MYSQL_URL_HERE'),
        'You forgot to change the default URL'
      ),
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    TMDB_API_KEY: z.string(),
    RESEND_API_KEY: z.string(),
    APP_URL: z.string().url(),
    JWT_SECRET: z.string(),
    VIP_CODE: z.string(),
    STORAGE_ENDPOINT: z.string().url(),
    REGION: z.string(),
    STORAGE_ACCESS_KEY: z.string(),
    STORAGE_SECRET_KEY: z.string(),
    STORAGE_PUBLIC_URL: z.string().url(),
  },

  client: {
    NEXT_PUBLIC_APP_URL: z.string().url(),
  },

  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
    TMDB_API_KEY: process.env.TMDB_API_KEY,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    APP_URL: process.env.APP_URL,
    JWT_SECRET: process.env.JWT_SECRET,
    VIP_CODE: process.env.VIP_CODE,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    STORAGE_ENDPOINT: process.env.STORAGE_ENDPOINT,
    REGION: process.env.REGION,
    STORAGE_ACCESS_KEY: process.env.STORAGE_ACCESS_KEY,
    STORAGE_SECRET_KEY: process.env.STORAGE_SECRET_KEY,
    STORAGE_PUBLIC_URL: process.env.STORAGE_PUBLIC_URL,
  },
});
