import { prisma } from '@/lib/db';
import type { List } from '@prisma/client';
import { z } from 'zod';

export async function getLists(): Promise<List[]> {
  return await prisma.list.findMany({
    orderBy: {
      createdAt: 'desc',
    },
  });
}

export async function getListById(
  id: number,
  { take = 20, skip = 0 }: { take?: number; skip?: number } = {}
) {
  const list = await prisma.list.findUnique({
    where: { id },
    include: {
      movies: {
        include: {
          movie: true,
        },
        take,
        skip,
      },
      _count: {
        select: {
          movies: true,
        },
      },
    },
  });

  if (!list) return null;

  const movies = list.movies.map((movieList) => movieList.movie);
  const totalMovies = list._count.movies;

  return {
    ...list,
    movies,
    totalMovies,
    hasMore: skip + take < totalMovies,
  };
}

export const loadMoreMoviesSchema = z
  .object({
    listId: z.number().int().positive(),
    skip: z.number().int().nonnegative(),
    take: z.number().int().positive().default(20),
  })
  .transform((data) => ({
    listId: data.listId,
    skip: data.skip,
    take: Math.min(data.take, 100), // Enforce max of 100 items per request
  }));

export type LoadMoreMoviesInput = z.infer<typeof loadMoreMoviesSchema>;

export async function loadMoreMovies({
  listId,
  skip,
  take,
}: LoadMoreMoviesInput) {
  const list = await prisma.list.findUnique({
    where: { id: listId },
    include: {
      movies: {
        include: {
          movie: true,
        },
        take,
        skip,
      },
      _count: {
        select: {
          movies: true,
        },
      },
    },
  });

  if (!list) return { success: false as const };

  const movies = list.movies.map((movieList) => movieList.movie);
  const totalMovies = list._count.movies;

  return {
    success: true as const,
    movies,
    totalMovies,
    hasMore: skip + take < totalMovies,
  };
}
