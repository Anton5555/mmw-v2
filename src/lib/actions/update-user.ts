'use server';

import { profileFormSchema } from '@/lib/validations/users';
import { actionClient } from '../safe-action';
import { updateUser } from '../api/users';

export const updateUserAction = actionClient
  .schema(profileFormSchema)
  .action(async ({ parsedInput }) => {
    const result = await updateUser(parsedInput);
    return result;
  });
