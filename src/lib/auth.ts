import { betterAuth, Session } from 'better-auth';
import { prisma } from '@/lib/db';
import { env } from '@/env';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import type { User } from '@prisma/client';
import { sendForgotPasswordEmail, sendVerificationEmail } from './utils/emails';

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
  jwt: {
    secret: env.JWT_SECRET,
    expiresIn: '30d',
  },
  baseURL: env.NEXT_PUBLIC_APP_URL,
  callbacks: {
    session: async ({ session, user }: { session: Session; user: User }) => {
      try {
        return {
          session,
          user,
        };
      } catch (error) {
        console.error('Session callback error:', error);
        throw error;
      }
    },
  },
});
