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

/** Live typeahead suggestions (min 2 chars to avoid noisy queries). */
export const searchNominationsQuerySchema = z.object({
  query: z
    .string()
    .trim()
    .min(2, { error: 'Ingresá al menos 2 caracteres' })
    .max(200, { error: 'La búsqueda es demasiado larga' }),
});

export type SearchNominationsQuery = z.infer<
  typeof searchNominationsQuerySchema
>;

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

/** Minimum distinct-user ratings for a movie to qualify for the official ranking. */
export const IMDB_LTA_MIN_RATINGS_TO_QUALIFY = 5;

export const imdbLtaRatingFilterSchema = z.enum([
  'unrated',
  'no_scores',
  'low',
  'close',
  'qualified',
  'mine_done',
]);

export type ImdbLtaRatingFilter = z.infer<typeof imdbLtaRatingFilterSchema>;

export const submitRatingSchema = z.object({
  movieId: z.number().int().positive(),
  score: z
    .number()
    .int({ error: 'El puntaje debe ser un número entero' })
    .min(0, { error: 'El puntaje mínimo es 0' })
    .max(10, { error: 'El puntaje máximo es 10' }),
});

export type SubmitRatingInput = z.infer<typeof submitRatingSchema>;

export const listRateableCandidatesSchema = z.object({
  filter: imdbLtaRatingFilterSchema.default('unrated'),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(30),
});

export type ListRateableCandidatesInput = z.infer<
  typeof listRateableCandidatesSchema
>;
