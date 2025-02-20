'use server';

import { auth } from '@/lib/auth';
import { CreateEventFormValues } from '@/lib/validations/events';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { prisma } from '@/lib/db';
import { randomUUID } from 'crypto';

export async function createEventAction(input: CreateEventFormValues) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error('No autorizado');
  }

  const event = await prisma.event.create({
    data: {
      id: randomUUID(),
      title: input.title,
      description: input.description,
      month: input.month,
      day: input.day,
      year: input.year,
      time: input.time,
      type: input.type,
      createdBy: session.user.id,
    },
  });

  revalidatePath('/calendar');
  return { success: true, event };
}
