import { z } from 'zod';

// MAM movie query validation schema - simplified
export const mamMovieQuerySchema = z.object({
  title: z.string().optional(),
  imdb: z.string().optional(),
  // Accept both array and string for backward compatibility
  participants: z.preprocess(
    (val) => {
      if (Array.isArray(val)) {
        return val.join(',');
      }
      return val;
    },
    z.string().optional()
  ),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
});

export type MamMovieQuery = z.infer<typeof mamMovieQuerySchema>;

// MAM participant validation schema
export const mamParticipantSchema = z.object({
  displayName: z.string().min(1, { error: 'Display name is required' }),
  slug: z
    .string()
    .min(1, { error: 'Slug is required' })
    .regex(
      /^[a-z0-9-]+$/,
      { error: 'Slug must contain only lowercase letters, numbers, and hyphens' }
    ),
  userId: z.string().optional(),
});

export type MamParticipantInput = z.infer<typeof mamParticipantSchema>;

// MAM pick validation schema
export const mamPickSchema = z.object({
  participantId: z.number().int().positive(),
  movieId: z.number().int().positive(),
  score: z.number().int().min(0).max(5),
  review: z.string().optional(),
  isSpecialMention: z.boolean().optional().default(false),
});

export type MamPickInput = z.infer<typeof mamPickSchema>;

// MAM movie with picks type for API responses
export const mamMovieWithPicksSchema = z.object({
  id: z.number(),
  title: z.string(),
  originalTitle: z.string(),
  originalLanguage: z.string(),
  releaseDate: z.date(),
  letterboxdUrl: z.string(),
  imdbId: z.string(),
  posterUrl: z.string(),
  picks: z.array(
    z.object({
      id: z.number(),
      participantId: z.number(),
      score: z.number(),
      review: z.string().nullable(),
      isSpecialMention: z.boolean(),
      createdAt: z.date(),
      participant: z.object({
        id: z.number(),
        displayName: z.string(),
        slug: z.string(),
        userId: z.string().nullable().optional(),
        user: z.object({
          image: z.string().nullable(),
          name: z.string().nullable(),
        }).nullable().optional(),
      }),
    })
  ),
  averageScore: z.number().optional(),
  totalPicks: z.number().optional(),
  totalPoints: z.number().optional(),
  rank: z.number().optional(),
});

export type MamMovieWithPicks = z.infer<typeof mamMovieWithPicksSchema>;
