import { z } from 'zod';

export const IMDB_LTA_MIN_NOMINATIONS = 25;
export const IMDB_LTA_MAX_NOMINATIONS = 50;

export const IMDB_ID_REGEX = /^tt\d{7,8}$/;

export const lookupMovieQuerySchema = z.object({
  query: z
    .string()
    .trim()
    .min(1, { error: 'Ingresá un nombre o ID de IMDb' })
    .max(200, { error: 'La búsqueda es demasiado larga' }),
});

export type LookupMovieQuery = z.infer<typeof lookupMovieQuerySchema>;

export const movieIdSchema = z.object({
  movieId: z.number().int().positive(),
});

export type MovieIdInput = z.infer<typeof movieIdSchema>;

export const imdbLtaPhaseSchema = z.enum([
  'NOMINATION_OPEN',
  'NOMINATION_CLOSED',
  'RATING_OPEN',
  'RATING_CLOSED',
]);

export type ImdbLtaPhaseValue = z.infer<typeof imdbLtaPhaseSchema>;

export const updateImdbLtaPhaseSchema = z.object({
  phase: imdbLtaPhaseSchema,
});

export type UpdateImdbLtaPhaseInput = z.infer<typeof updateImdbLtaPhaseSchema>;
