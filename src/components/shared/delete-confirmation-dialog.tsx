'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

type DeleteConfirmationDialogProps = {
  title: string | null | undefined;
  description: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: () => Promise<void>;
  onDeleted?: () => void;
  successMessage: string;
  errorMessage: string;
  loadingText?: string;
};

export function DeleteConfirmationDialog({
  title,
  description,
  open,
  onOpenChange,
  onDelete,
  onDeleted,
  successMessage,
  errorMessage,
  loadingText = 'Eliminando...',
}: DeleteConfirmationDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!title) return;
    setIsDeleting(true);
    try {
      await onDelete();
      toast.success(successMessage);
      onOpenChange(false);
      onDeleted?.();
    } catch {
      toast.error(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-white/10 bg-zinc-950 sm:max-w-md">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-xl font-semibold tracking-tight text-white">
            ¿Eliminar &ldquo;{title}&rdquo;?
          </DialogTitle>
          <DialogDescription className="text-zinc-400 text-sm">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
            className="text-zinc-400 hover:text-white"
          >
            Cancelar
          </Button>

          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-500"
          >
            {isDeleting ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {loadingText}
              </span>
            ) : (
              'Eliminar'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
