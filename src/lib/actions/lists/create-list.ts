'use server';

import { auth } from '@/lib/auth';
import { CreateListFormValues } from '@/lib/validations/lists';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { createList } from '@/lib/api/lists';

export async function createListAction(input: CreateListFormValues) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || session.user.role !== 'admin') {
    throw new Error('No autorizado');
  }

  await createList({ data: input });

  revalidatePath('/lists');
  return { success: true };
}
