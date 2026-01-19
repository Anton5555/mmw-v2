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
      <DialogContent className="sm:max-w-[540px] border-white/10 bg-zinc-950/95 backdrop-blur-2xl">
        <DialogHeader>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-yellow-500">
            Post-It del Tablero
          </p>
          <DialogTitle className="text-3xl font-black italic tracking-tighter text-white uppercase">
            Editar Post-It
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Actualiza el contenido de tu post-it.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                    Título
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="TÍTULO DEL POST-IT..."
                      className="h-12 border-none bg-white/5 text-lg font-bold tracking-tight focus-visible:ring-1 focus-visible:ring-yellow-500 placeholder:text-zinc-700"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-[10px] uppercase font-bold text-red-500" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                    Descripción
                  </FormLabel>
                  <FormControl>
                    <LexicalEditor
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Ingresa la descripción..."
                      className="min-h-[120px] bg-white/5 border-none focus-visible:ring-1 focus-visible:ring-yellow-500"
                    />
                  </FormControl>
                  <FormMessage className="text-[10px] uppercase font-bold text-red-500" />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="h-12 text-[10px] font-black uppercase tracking-[.2em] hover:bg-white/5"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-12 bg-white hover:bg-yellow-500 text-black font-black uppercase tracking-[.2em] transition-all"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Actualizar Post-It'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
