import { z } from 'zod';

// Oscar ballot submission schema
export const submitBallotSchema = z.object({
  editionId: z.number().int().positive(),
  selections: z.record(
    z.string(), // categoryId as string
    z.number().int().positive() // nomineeId
  ),
});

export type SubmitBallotFormValues = z.infer<typeof submitBallotSchema>;

// Oscar category with nominees schema
export const oscarCategorySchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  order: z.number(),
  winnerId: z.number().nullable(),
  nominees: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
      filmTitle: z.string().nullable(),
      imdbId: z.string().nullable(),
      filmImdbId: z.string().nullable(),
      movieId: z.number().nullable(),
      movie: z
        .object({
          id: z.number(),
          title: z.string(),
          posterUrl: z.string(),
          imdbId: z.string(),
        })
        .nullable()
        .optional(),
    })
  ),
});

export type OscarCategory = z.infer<typeof oscarCategorySchema>;

// Oscar edition schema
export const oscarEditionSchema = z.object({
  id: z.number(),
  year: z.number(),
  ceremonyDate: z.date().nullable(),
  isActive: z.boolean(),
  resultsReleased: z.boolean(),
});

export type OscarEdition = z.infer<typeof oscarEditionSchema>;

// User ballot schema
export const userBallotSchema = z.object({
  id: z.string(),
  submittedAt: z.date(),
  score: z.number().nullable(),
  picks: z.array(
    z.object({
      id: z.number(),
      categoryId: z.number(),
      nomineeId: z.number(),
      nominee: z.object({
        id: z.number(),
        name: z.string(),
        filmTitle: z.string().nullable(),
        movie: z
          .object({
            id: z.number(),
            title: z.string(),
            posterUrl: z.string(),
            imdbId: z.string(),
          })
          .nullable()
          .optional(),
      }),
      category: z.object({
        id: z.number(),
        name: z.string(),
        slug: z.string(),
        order: z.number().optional(),
      }),
    })
  ),
});

export type UserBallot = z.infer<typeof userBallotSchema>;

// Set winners schema (admin only)
export const setWinnersSchema = z.object({
  editionId: z.number().int().positive(),
  winners: z.record(
    z.string(), // categoryId as string
    z.number().int().positive() // nomineeId (winner)
  ),
});

export type SetWinnersFormValues = z.infer<typeof setWinnersSchema>;
