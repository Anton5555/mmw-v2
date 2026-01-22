'use client';

import { DeleteConfirmationDialog } from '@/components/shared/delete-confirmation-dialog';
import { deleteEventAction } from '@/lib/actions/events/delete-event';
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
  const handleDelete = async () => {
    if (!event) return;
    await deleteEventAction(event.id);
  };

  return (
    <DeleteConfirmationDialog
      title={event?.title}
      description="Esta acción es definitiva. El evento será removido de la agenda de toda la comunidad."
      open={open}
      onOpenChange={onOpenChange}
      onDelete={handleDelete}
      onDeleted={onDeleted}
      successMessage="Evento cancelado definitivamente"
      errorMessage="No se pudo eliminar el evento"
      loadingText="Borrando..."
    />
  );
}
