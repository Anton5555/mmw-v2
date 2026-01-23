import { prisma } from '@/lib/db';

/**
 * Get all unique genres for filter dropdowns
 */
export async function getAllGenres() {
  'use cache';
  return await prisma.genre.findMany({
    orderBy: {
      name: 'asc',
    },
    select: {
      id: true,
      name: true,
    },
  });
}

/**
 * Get all unique directors for filter dropdowns
 */
export async function getAllDirectors() {
  'use cache';
  return await prisma.director.findMany({
    orderBy: {
      name: 'asc',
    },
    select: {
      id: true,
      name: true,
    },
  });
}
