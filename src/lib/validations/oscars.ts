import { z } from 'zod';

// Oscar ballot submission schema
export const submitBallotSchema = z.object({
  editionId: z.number().int().positive(),
  selections: z.record(
    z.string(), // categoryId as string
    z.number().int().positive(), // nomineeId
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
    }),
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
    }),
  ),
});

export type UserBallot = z.infer<typeof userBallotSchema>;

// Set single winner schema (admin only)
export const setSingleWinnerSchema = z.object({
  editionId: z.number().int().positive(),
  categoryId: z.number().int().positive(),
  nomineeId: z.number().int().positive(),
});

export type SetSingleWinnerFormValues = z.infer<typeof setSingleWinnerSchema>;

// Category prediction stats (top picks per category)
export const categoryPredictionStatsSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  order: z.number(),
  winnerId: z.number().nullable(),
  winner: z
    .object({
      nomineeId: z.number(),
      nomineeName: z.string(),
      filmTitle: z.string().nullable(),
    })
    .nullable(),
  topPicks: z.array(
    z.object({
      nomineeId: z.number(),
      nomineeName: z.string(),
      filmTitle: z.string().nullable(),
      count: z.number(),
      percentage: z.number(),
    }),
  ),
  totalVotes: z.number(),
});

export type CategoryPredictionStats = z.infer<
  typeof categoryPredictionStatsSchema
>;

// Leaderboard entry
export const leaderboardEntrySchema = z.object({
  rank: z.number(),
  userId: z.string(),
  userName: z.string(),
  userImage: z.string().nullable(),
  score: z.number(),
  submittedAt: z.date(),
  isWinner: z.boolean(),
});

export type LeaderboardEntry = z.infer<typeof leaderboardEntrySchema>;
