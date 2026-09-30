import type { Prisma } from '@generated/prisma/client';
import { prisma } from '@/lib/db';

let sequence = 0;
const next = () => ++sequence;

export function createUser(overrides: Partial<Prisma.UserUncheckedCreateInput> = {}) {
  const n = next();
  return prisma.user.create({
    data: {
      id: `user-${n}`,
      name: `User ${n}`,
      email: `user${n}@example.com`,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    },
  });
}

export function createUsers(count: number) {
  return Promise.all(Array.from({ length: count }, () => createUser()));
}

export function createMovie(overrides: Partial<Prisma.MovieUncheckedCreateInput> = {}) {
  const n = next();
  return prisma.movie.create({
    data: {
      title: `Movie ${n}`,
      originalTitle: `Movie ${n}`,
      originalLanguage: 'en',
      releaseDate: new Date('2000-01-01'),
      letterboxdUrl: `https://letterboxd.com/film/movie-${n}`,
      imdbId: `tt${String(n).padStart(7, '0')}`,
      posterUrl: 'https://img.example.com/poster.jpg',
      ...overrides,
    },
  });
}

export function createMovies(count: number) {
  return Promise.all(Array.from({ length: count }, () => createMovie()));
}

/** An Oscar edition with `categories` categories of `nomineesPerCategory` nominees each. */
export function createOscarEdition(
  options: {
    year?: number;
    isActive?: boolean;
    ceremonyDate?: Date | null;
    categories?: number;
    nomineesPerCategory?: number;
  } = {}
) {
  const { year = 2026, isActive = true, ceremonyDate = null, categories = 2, nomineesPerCategory = 3 } = options;

  return prisma.oscarEdition.create({
    data: {
      year,
      isActive,
      ceremonyDate,
      categories: {
        create: Array.from({ length: categories }, (_, i) => ({
          name: `Category ${i + 1}`,
          slug: `category-${i + 1}`,
          order: i + 1,
          nominees: {
            create: Array.from({ length: nomineesPerCategory }, (_, j) => ({
              name: `Nominee ${i + 1}.${j + 1}`,
            })),
          },
        })),
      },
    },
    include: {
      categories: {
        orderBy: { order: 'asc' },
        include: { nominees: { orderBy: { id: 'asc' } } },
      },
    },
  });
}
