'use client';

import { DeleteConfirmationDialog } from '@/components/shared/delete-confirmation-dialog';
import type { BoardPost } from '@/lib/types/board';

type DeletePostDialogProps = {
  post: BoardPost | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
};

export function DeletePostDialog({
  post,
  open,
  onOpenChange,
  onDeleted,
}: DeletePostDialogProps) {
  const handleDelete = async () => {
    if (!post) return;
    const response = await fetch(`/api/board?id=${post.id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete post');
    }
  };

  return (
    <DeleteConfirmationDialog
      title={post?.title}
      description="Esta acción es definitiva. El post-it será removido del tablero de toda la comunidad."
      open={open}
      onOpenChange={onOpenChange}
      onDelete={handleDelete}
      onDeleted={onDeleted}
      successMessage="Post-it eliminado definitivamente"
      errorMessage="No se pudo eliminar el post-it"
    />
  );
}
