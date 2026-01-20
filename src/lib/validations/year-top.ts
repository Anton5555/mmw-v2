import { z } from 'zod';
import { YearTopPickType } from '@prisma/client';

// YearTop movie query validation schema
export const yearTopMovieQuerySchema = z.object({
  year: z.number().int().positive(),
  pickType: z.nativeEnum(YearTopPickType),
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
  limit: z.number().int().positive().max(100).default(30),
});

export type YearTopMovieQuery = z.infer<typeof yearTopMovieQuerySchema>;

// YearTop pick type enum validation
export const yearTopPickTypeSchema = z.nativeEnum(YearTopPickType);

export type YearTopPickTypeInput = z.infer<typeof yearTopPickTypeSchema>;

// YearTop movie with picks type for API responses
export const yearTopMovieWithPicksSchema = z.object({
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
      year: z.number(),
      pickType: z.nativeEnum(YearTopPickType),
      isTopPosition: z.boolean(),
      createdAt: z.date(),
      participant: z.object({
        id: z.number(),
        displayName: z.string(),
        slug: z.string(),
        year: z.number(),
        userId: z.string().nullable().optional(),
        user: z
          .object({
            image: z.string().nullable(),
            name: z.string().nullable(),
          })
          .nullable()
          .optional(),
      }),
    })
  ),
  totalPoints: z.number().optional(),
});

export type YearTopMovieWithPicks = z.infer<typeof yearTopMovieWithPicksSchema>;

// YearTop summary type for displaying all year-top appearances of a movie
export const yearTopSummaryItemSchema = z.object({
  year: z.number(),
  pickType: z.nativeEnum(YearTopPickType),
  totalPoints: z.number(),
  picksCount: z.number(),
  picks: z.array(
    z.object({
      id: z.number(),
      participantId: z.number(),
      year: z.number(),
      pickType: z.nativeEnum(YearTopPickType),
      isTopPosition: z.boolean(),
      createdAt: z.date(),
      participant: z.object({
        id: z.number(),
        displayName: z.string(),
        slug: z.string(),
        year: z.number(),
        userId: z.string().nullable().optional(),
        user: z
          .object({
            image: z.string().nullable(),
            name: z.string().nullable(),
          })
          .nullable()
          .optional(),
      }),
    })
  ),
});

export type YearTopSummaryItem = z.infer<typeof yearTopSummaryItemSchema>;
