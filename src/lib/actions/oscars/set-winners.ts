'use server';

import { auth } from '@/lib/auth';
import { setWinnersSchema, type SetWinnersFormValues } from '@/lib/validations/oscars';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { prisma } from '@/lib/db';

export async function setWinnersAction(input: SetWinnersFormValues) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error('No autorizado');
  }

  // Check if user is admin
  if (session.user.role !== 'admin') {
    throw new Error('No tienes permisos para realizar esta acción');
  }

  // Validate input
  const validatedInput = setWinnersSchema.parse(input);

  // Check if edition exists
  const edition = await prisma.oscarEdition.findUnique({
    where: {
      id: validatedInput.editionId,
    },
    select: {
      id: true,
      ceremonyDate: true,
    },
  });

  if (!edition) {
    throw new Error('Edición no encontrada');
  }


  // Get all categories for this edition
  const categories = await prisma.oscarCategory.findMany({
    where: {
      editionId: validatedInput.editionId,
    },
    select: {
      id: true,
    },
  });

  // Validate that all nominee IDs exist and belong to their categories
  for (const [categoryIdStr, nomineeId] of Object.entries(validatedInput.winners)) {
    const categoryId = parseInt(categoryIdStr, 10);
    const nominee = await prisma.oscarNominee.findFirst({
      where: {
        id: nomineeId,
        categoryId,
      },
      select: {
        id: true,
      },
    });

    if (!nominee) {
      throw new Error(`El nominado ${nomineeId} no pertenece a la categoría ${categoryId}`);
    }
  }

  // Update winnerId for each category in a transaction
  try {
    await prisma.$transaction(
      Object.entries(validatedInput.winners).map(([categoryIdStr, nomineeId]) =>
        prisma.oscarCategory.update({
          where: {
            id: parseInt(categoryIdStr, 10),
          },
          data: {
            winnerId: nomineeId,
          },
        })
      )
    );

    revalidatePath('/oscars');
    revalidatePath('/oscars/admin');
    revalidatePath('/oscars/results');

    return { success: true };
  } catch (error) {
    console.error('Error setting winners:', error);
    throw new Error('Error al guardar los ganadores');
  }
}
