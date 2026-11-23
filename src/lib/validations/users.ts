import * as z from 'zod';
import { UserSchema } from './generated';
import { WATCH_COUNTRY_CODES } from '@/lib/watch-countries';

export const profileFormSchema = UserSchema.pick({
  name: true,
  email: true,
}).extend({
  name: z.string().min(1, { error: 'El nombre es requerido' }),
  image: z.union([z.string().nullable(), z.instanceof(File), z.null()]),
  watchCountry: z.enum(WATCH_COUNTRY_CODES, {
    error: 'Elegí un país de la lista',
  }),
});

export type ProfileFormValues = z.infer<typeof profileFormSchema>;
