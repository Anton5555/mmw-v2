'use server';

import { auth } from '@/lib/auth';
import {
  setSingleWinnerSchema,
  type SetSingleWinnerFormValues,
} from '@/lib/validations/oscars';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { prisma } from '@/lib/db';

export async function setSingleWinnerAction(input: SetSingleWinnerFormValues) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error('No autorizado');
  }

  if (session.user.role !== 'admin') {
    throw new Error('No tienes permisos para realizar esta acción');
  }

  const { editionId, categoryId, nomineeId } =
    setSingleWinnerSchema.parse(input);

  const edition = await prisma.oscarEdition.findUnique({
    where: { id: editionId },
    select: { id: true },
  });

  if (!edition) {
    throw new Error('Edición no encontrada');
  }

  const category = await prisma.oscarCategory.findFirst({
    where: { id: categoryId, editionId },
    select: { id: true, winnerId: true },
  });

  if (!category) {
    throw new Error('Categoría no encontrada');
  }

  if (category.winnerId != null) {
    throw new Error('Esta categoría ya tiene un ganador asignado');
  }

  const nominee = await prisma.oscarNominee.findFirst({
    where: { id: nomineeId, categoryId },
    select: { id: true },
  });

  if (!nominee) {
    throw new Error('El nominado no pertenece a esta categoría');
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.oscarCategory.update({
        where: { id: categoryId },
        data: { winnerId: nomineeId },
      });

      await tx.$executeRaw`
        UPDATE "OscarBallot" b
        SET score = (
          SELECT COUNT(*)::int
          FROM "OscarPick" p
          JOIN "OscarCategory" c ON p."categoryId" = c.id
          WHERE p."ballotId" = b.id
            AND c."winnerId" IS NOT NULL
            AND p."nomineeId" = c."winnerId"
        )
        WHERE b."editionId" = ${editionId}
      `;
    });

    revalidatePath('/oscars');
    revalidatePath('/oscars/admin');
    revalidatePath('/oscars/results');

    return { success: true };
  } catch (error) {
    console.error('Error setting winner:', error);
    throw new Error('Error al guardar el ganador');
  }
}
