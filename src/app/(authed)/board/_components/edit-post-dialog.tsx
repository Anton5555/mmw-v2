'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import {
  UpdateBoardPostFormValues,
  updateBoardPostSchema,
} from '@/lib/validations/board';
import { LexicalEditor } from '@/components/board/lexical-editor';
import { Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import type { BoardPost } from '@/lib/types/board';
import { updateBoardPostAction } from '@/lib/actions/board/update-board-post';

interface EditPostDialogProps {
  post: BoardPost | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function EditPostDialog({
  post,
  open,
  onOpenChange,
  onSuccess,
}: EditPostDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<UpdateBoardPostFormValues>({
    resolver: zodResolver(updateBoardPostSchema),
    defaultValues: {
      id: '',
      title: '',
      description: '',
    },
  });

  useEffect(() => {
    if (post && open) {
      form.reset({
        id: post.id,
        title: post.title,
        description: post.description,
      });
    } else if (!open) {
      // Reset form when dialog closes
      form.reset({
        id: '',
        title: '',
        description: '',
      });
    }
  }, [post, form, open]);

  const onSubmit = async (data: UpdateBoardPostFormValues) => {
    if (!post) return;

    setIsSubmitting(true);
    try {
      await updateBoardPostAction(data);
      toast.success('Post-It actualizado exitosamente');
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Post update error:', error);
      toast.error(
        error instanceof Error ? error.message : 'Error al actualizar el post-it'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!post) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] border-white/10 bg-zinc-950">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold tracking-tight text-white">
            Editar post-it
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Actualizá el contenido de tu post-it.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="text-sm text-zinc-400">Título</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Título del post-it..."
                      className="h-11 border-white/10 bg-zinc-900 focus-visible:ring-1 focus-visible:ring-yellow-500"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-xs text-red-500" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="text-sm text-zinc-400">
                    Descripción
                  </FormLabel>
                  <FormControl>
                    <LexicalEditor
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Ingresá la descripción..."
                      className="min-h-[120px] bg-zinc-900 border-white/10 focus-visible:ring-1 focus-visible:ring-yellow-500"
                    />
                  </FormControl>
                  <FormMessage className="text-xs text-red-500" />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="hover:bg-white/5"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-white hover:bg-yellow-500 text-black font-medium"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Actualizar post-it'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
