import { z } from 'zod';

export const createBoardPostSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string(), // Serialized Lexical editor state
});

export type CreateBoardPostFormValues = z.infer<typeof createBoardPostSchema>;

export const updateBoardPostSchema = z.object({
  id: z.string(),
  title: z.string().min(1, 'Title is required').optional(),
  description: z.string().optional(), // Serialized Lexical editor state
});

export type UpdateBoardPostFormValues = z.infer<typeof updateBoardPostSchema>;

export const updateBoardPostReorderSchema = z.array(
  z.object({
    id: z.string(),
    order: z.number().int().min(0),
  })
);

export type UpdateBoardPostReorderFormValues = z.infer<
  typeof updateBoardPostReorderSchema
>;

export const deleteBoardPostSchema = z.object({
  id: z.string(),
});

export type DeleteBoardPostFormValues = z.infer<typeof deleteBoardPostSchema>;
