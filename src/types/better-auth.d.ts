import { UserRole } from '@prisma/client';

declare module 'better-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      image?: string | null;
      emailVerified: boolean;
      createdAt: Date;
      role: UserRole;
    };
  }
}
