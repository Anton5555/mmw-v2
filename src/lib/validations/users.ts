import * as z from 'zod';

export const profileFormSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  email: z.string().email().readonly(),
  image: z.union([z.string().nullable(), z.instanceof(File), z.null()]),
});

export type ProfileFormValues = z.infer<typeof profileFormSchema>;
