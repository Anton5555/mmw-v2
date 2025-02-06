import * as z from 'zod';
import { UserSchema } from './generated';

export const profileFormSchema = UserSchema.pick({
  name: true,
  email: true,
}).extend({
  name: z.string().min(1, 'El nombre es requerido'),
  image: z.union([z.string().nullable(), z.instanceof(File), z.null()]),
});

export type ProfileFormValues = z.infer<typeof profileFormSchema>;
