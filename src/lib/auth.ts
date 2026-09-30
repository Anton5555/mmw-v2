import { betterAuth } from 'better-auth';
import { prisma } from '@/lib/db';
import { env } from '@/env';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { sendForgotPasswordEmail, sendVerificationEmail } from './utils/emails';
import { admin } from 'better-auth/plugins';

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendVerificationEmail({ to: user.email, url });
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    autoSignIn: true,
    sendResetPassword: async ({ user, url }) => {
      await sendForgotPasswordEmail({ to: user.email, url });
    },
  },
  session: {
    // Serve session reads from a signed cookie for 5 minutes instead of the DB
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },
  baseURL: env.NEXT_PUBLIC_APP_URL,
  plugins: [admin()],
});
