'use server';

import { auth } from '@/lib/auth';
import { UpdateEventFormValues } from '@/lib/validations/events';
import { revalidateTag } from 'next/cache';
import { headers } from 'next/headers';
import { prisma } from '@/lib/db';

export async function updateEventAction(
  eventId: string,
  input: UpdateEventFormValues
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error('No autorizado');
  }

  // Verify event exists and user is the creator
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { createdBy: true },
  });

  if (!event) {
    throw new Error('Evento no encontrado');
  }

  if (event.createdBy !== session.user.id) {
    throw new Error('No autorizado');
  }

  // Update the event
  const updatedEvent = await prisma.event.update({
    where: { id: eventId },
    data: {
      title: input.title,
      description: input.description,
      month: input.month,
      day: input.day,
      year: input.year,
      time: input.time,
      type: input.type,
    },
  });

  revalidateTag('events', 'max');

  return { success: true, event: updatedEvent };
}
