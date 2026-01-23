'use server';

import { auth } from '@/lib/auth';
import { submitBallotSchema, type SubmitBallotFormValues } from '@/lib/validations/oscars';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { prisma } from '@/lib/db';

export async function submitBallotAction(input: SubmitBallotFormValues) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error('No autorizado');
  }

  // Validate input
  const validatedInput = submitBallotSchema.parse(input);

  // Check if edition is active
  const edition = await prisma.oscarEdition.findUnique({
    where: {
      id: validatedInput.editionId,
    },
    select: {
      isActive: true,
      ceremonyDate: true,
    },
  });

  if (!edition) {
    throw new Error('Edición no encontrada');
  }

  if (!edition.isActive) {
    throw new Error('Esta edición ya no acepta votos');
  }

  // Check if form is available (blocked 3 hours before ceremony)
  if (edition.ceremonyDate) {
    const now = new Date();
    const ceremony = new Date(edition.ceremonyDate);
    const hoursBefore = 3;
    const cutoffTime = new Date(ceremony.getTime() - hoursBefore * 60 * 60 * 1000);

    if (now >= cutoffTime) {
      throw new Error(
        `El formulario está bloqueado. Se bloquea 3 horas antes de la ceremonia. Ceremonia: ${ceremony.toLocaleString('es-ES', {
          dateStyle: 'long',
          timeStyle: 'short',
          timeZone: 'America/Los_Angeles',
        })} (hora de Los Ángeles)`
      );
    }
  }

  // Get all categories for this edition to validate selections
  const categories = await prisma.oscarCategory.findMany({
    where: {
      editionId: validatedInput.editionId,
    },
    select: {
      id: true,
    },
  });

  // Validate that all categories have selections
  const categoryIds = new Set(categories.map((c) => c.id.toString()));
  const selectionCategoryIds = new Set(Object.keys(validatedInput.selections));

  if (categoryIds.size !== selectionCategoryIds.size) {
    throw new Error('Debes seleccionar un nominado para cada categoría');
  }

  for (const categoryId of categoryIds) {
    if (!selectionCategoryIds.has(categoryId)) {
      throw new Error(`Falta la selección para la categoría ${categoryId}`);
    }
  }

  // Validate that all nominee IDs exist and belong to their categories
  for (const [categoryIdStr, nomineeId] of Object.entries(validatedInput.selections)) {
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

  // Create ballot and picks in a transaction
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Create ballot
      const ballot = await tx.oscarBallot.create({
        data: {
          userId: session.user.id,
          editionId: validatedInput.editionId,
        },
      });

      // Create picks
      const picks = await Promise.all(
        Object.entries(validatedInput.selections).map(([categoryIdStr, nomineeId]) =>
          tx.oscarPick.create({
            data: {
              ballotId: ballot.id,
              categoryId: parseInt(categoryIdStr, 10),
              nomineeId,
            },
          })
        )
      );

      return { ballot, picks };
    });

    revalidatePath('/oscars');
    revalidatePath('/oscars/results');

    return { success: true, ballotId: result.ballot.id };
  } catch (error: unknown) {
    // Handle unique constraint violation (user already voted)
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'P2002'
    ) {
      throw new Error('Ya has enviado Los Oscalos para esta edición');
    }
    throw error;
  }
}
