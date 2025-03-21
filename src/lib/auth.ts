import { betterAuth } from 'better-auth';
import { prisma } from '@/lib/db';
import { env } from '@/env';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { sendForgotPasswordEmail, sendVerificationEmail } from './utils/emails';
import { admin } from 'better-auth/plugins';

export type AuthUser = {
  id: string;
  email: string;

  name: string;
  image?: string | null;
  emailVerified?: Date | null;
};

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
  plugins: [admin()],
});
