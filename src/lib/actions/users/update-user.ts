'use server';

import { ProfileFormValues } from '@/lib/validations/users';
import { updateUser } from '@/lib/api/users';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export const updateUserAction = async (parsedInput: ProfileFormValues) => {
  const result = await updateUser(parsedInput);

  await auth.api.updateUser({
    headers: await headers(),
    body: {
      name: result.name,
      image: result.image,
    },
  });

  revalidatePath('/');
  return result;
};
