import { headers } from 'next/headers';
import { ProfileFormValues } from '../validations/users';
import { prisma } from '@/lib/db';
import { auth } from '../auth';

export const updateUser = async (data: ProfileFormValues) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error('No session found');
  }

  const userId = session.user.id;

  const result = await prisma.user.update({
    where: { id: userId },
    data: {
      name: data.name,
      image: data.image,
    },
  });
  return result;
};
