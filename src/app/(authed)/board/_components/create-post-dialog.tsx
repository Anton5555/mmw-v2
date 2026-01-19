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
import { useState } from 'react';
import { toast } from 'sonner';

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

  const onSubmit = async (data: CreateBoardPostFormValues) => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/board', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create post');
      }

      toast.success('Post-It created successfully');
      form.reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Post creation error:', error);
      toast.error(
        error instanceof Error ? error.message : 'Error creating post'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] border-white/10 bg-zinc-950/95 backdrop-blur-2xl">
        <DialogHeader>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-yellow-500">
            Board Post-It
          </p>
          <DialogTitle className="text-3xl font-black italic tracking-tighter text-white uppercase">
            New Post-It
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Create a new post-it for the community board.
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
                    Title
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="POST-IT TITLE..."
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
                    Description
                  </FormLabel>
                  <FormControl>
                    <LexicalEditor
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Enter description..."
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
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-12 bg-white hover:bg-yellow-500 text-black font-black uppercase tracking-[.2em] transition-all"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Create Post-It'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
