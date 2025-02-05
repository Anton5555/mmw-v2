'use server';

import { profileFormSchema } from '@/lib/validations/users';
import { actionClient } from '@/lib/safe-action';
import { updateUser } from '@/lib/api/users';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export const updateUserAction = actionClient
  .schema(profileFormSchema)
  .action(async ({ parsedInput }) => {
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
  });
