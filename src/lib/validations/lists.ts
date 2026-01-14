import * as z from 'zod';
import { ListSchema } from './generated';

export const createListFormSchema = ListSchema.pick({
  name: true,
  description: true,
  letterboxdUrl: true,
  imgUrl: true,
  tags: true,
  createdBy: true,
}).extend({
  name: z.string().min(1, { error: 'El nombre es requerido' }),
  description: z.string().min(1, { error: 'La descripción es requerida' }),
  letterboxdUrl: z.url({ error: 'Ingresa una URL válida de Letterboxd' }),
  imgUrl: z.url({ error: 'Ingresa una URL válida para la imagen' }),
  tags: z.string().min(1, { error: 'Los tags son requeridos' }),
  createdBy: z.string().min(1, { error: 'Quién solicitó la lista es requerido' }),
  movies: z
    .string()
    .min(1, { error: 'Los IDs de IMDB son requeridos' })
    .refine(
      (value) => {
        const ids = value.split(',').map((id) => id.trim());
        return ids.every((id) => /^tt\d{7,8}$/.test(id));
      },
      {
        error:
          'Los IDs de IMDB deben tener el formato correcto (ej: tt1234567)',
      }
    ),
});

export type CreateListFormValues = z.infer<typeof createListFormSchema>;
