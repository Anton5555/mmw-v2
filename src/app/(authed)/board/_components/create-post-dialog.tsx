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
  CreateBoardPostFormValues,
  createBoardPostSchema,
} from '@/lib/validations/board';
import { LexicalEditor } from '@/components/board/lexical-editor';
import { Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { createBoardPostAction } from '@/lib/actions/board/create-board-post';

interface CreatePostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CreatePostDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreatePostDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CreateBoardPostFormValues>({
    resolver: zodResolver(createBoardPostSchema),
    defaultValues: {
      title: '',
      description: '',
    },
  });

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      form.reset({
        title: '',
        description: '',
      });
    }
  }, [open, form]);

  const onSubmit = async (data: CreateBoardPostFormValues) => {
    setIsSubmitting(true);
    try {
      await createBoardPostAction(data);
      toast.success('Post-It creado exitosamente');
      form.reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Post creation error:', error);
      toast.error(
        error instanceof Error ? error.message : 'Error al crear el post-it'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] border-white/10 bg-zinc-950">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold tracking-tight text-white">
            Nuevo post-it
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Creá un post-it para el tablero de la comunidad.
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
                  'Crear post-it'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
