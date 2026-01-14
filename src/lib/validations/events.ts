import { z } from 'zod';
import { EventTypeSchema } from './generated';

export const getMonthEventsSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(1900).max(2100),
});

export type GetMonthEventsSchema = z.infer<typeof getMonthEventsSchema>;

export const createEventSchema = z
  .object({
    title: z.string().min(1, { error: 'El título es requerido' }),
    description: z.string().optional(),
    month: z.number().int().min(1).max(12),
    day: z.number().int().min(1).max(31),
    type: EventTypeSchema,
  })
  .and(
    z.discriminatedUnion('type', [
      z.object({
        type: z.enum(['BIRTHDAY', 'ANNIVERSARY']),
        year: z.undefined(),
        time: z.undefined(),
      }),
      z.object({
        type: z.enum(['DISCORD', 'IN_PERSON', 'OTHER']),
        year: z.number().int().min(1900).max(2100).optional(),
        time: z.date().optional(),
      }),
    ])
  );

export type CreateEventFormValues = z.infer<typeof createEventSchema>;
