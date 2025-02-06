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

export const listIdSchema = z.object({
  id: z.number().int().positive(),
});

export const listMoviesSchema = z.object({
  listId: z.number().int().positive(),
  take: z.number().int().positive().default(20),
  skip: z.number().int().nonnegative().default(0),
});

export type ListIdInput = z.infer<typeof listIdSchema>;
export type ListMoviesInput = z.infer<typeof listMoviesSchema>;

export async function getListById({ id }: ListIdInput) {
  return await prisma.list.findUnique({
    where: { id },
  });
}

export async function getListMovies({
  listId,
  take = 20,
  skip = 0,
}: ListMoviesInput) {
  const [movies, count] = await Promise.all([
    prisma.movieList.findMany({
      where: { listId },
      include: { movie: true },
      take,
      skip,
    }),
    prisma.movieList.count({
      where: { listId },
    }),
  ]);

  return {
    movies: movies.map((movieList) => movieList.movie),
    totalMovies: count,
    hasMore: skip + take < count,
  };
}
