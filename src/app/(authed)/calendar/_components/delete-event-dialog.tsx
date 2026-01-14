'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { deleteEventAction } from '@/lib/actions/events/delete-event';
import { toast } from 'sonner';
import type { Event } from '@prisma/client';

type DeleteEventDialogProps = {
  event: Event | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
};

export function DeleteEventDialog({
  event,
  open,
  onOpenChange,
  onDeleted,
}: DeleteEventDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!event) return;

    setIsDeleting(true);
    try {
      await deleteEventAction(event.id);
      toast.success('Evento eliminado correctamente');
      onOpenChange(false);
      onDeleted?.();
    } catch (error) {
      console.error('Event deletion error:', error);
      toast.error(
        error instanceof Error ? error.message : 'Error al eliminar el evento'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Eliminar evento</DialogTitle>
          <DialogDescription>
            ¿Estás seguro de que deseas eliminar el evento "{event?.title}"? Esta
            acción no se puede deshacer.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Eliminando...
              </>
            ) : (
              'Eliminar'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
