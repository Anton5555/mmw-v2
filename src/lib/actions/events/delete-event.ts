'use server';

import { auth } from '@/lib/auth';
import { revalidateTag } from 'next/cache';
import { headers } from 'next/headers';
import { prisma } from '@/lib/db';

export async function deleteEventAction(eventId: string) {
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

  // Delete the event
  await prisma.event.delete({
    where: { id: eventId },
  });

  revalidateTag('events', 'max');

  return { success: true };
}
