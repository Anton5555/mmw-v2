import { betterAuth } from 'better-auth';
import { prisma } from '@/lib/db';
import { env } from '@/env';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { sendForgotPasswordEmail, sendVerificationEmail } from './utils/emails';
import { admin } from 'better-auth/plugins';
import { assertVipAllowed, VIP_COOKIE } from '@/lib/vip';

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
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      // Sign-in never creates users; only the sign-up flow passes requestSignUp
      disableImplicitSignUp: true,
      prompt: 'select_account',
    },
  },
  account: {
    accountLinking: { enabled: true, trustedProviders: ['google'] },
  },
  databaseHooks: {
    user: {
      create: {
        // Single server-side VIP gate for email and Google sign-up
        before: async (user, ctx) => {
          assertVipAllowed(ctx);
          return { data: user };
        },
        after: async (_user, ctx) => {
          ctx?.setCookie(VIP_COOKIE, '', { maxAge: 0, path: '/' });
        },
      },
    },
  },
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.NEXT_PUBLIC_APP_URL,
  plugins: [admin()],
});
