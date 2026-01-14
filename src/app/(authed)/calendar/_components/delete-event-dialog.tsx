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
import { Loader2, Trash2 } from 'lucide-react';
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
      toast.success('Evento cancelado definitivamente');
      onOpenChange(false);
      onDeleted?.();
    } catch (error) {
      toast.error('No se pudo eliminar el evento');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-red-900/50 bg-zinc-950 p-0 overflow-hidden shadow-[0_0_50px_rgba(220,38,38,0.15)]">
        {/* Warning Accent Bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-transparent via-red-600 to-transparent" />

        <div className="p-8 space-y-6">
          <DialogHeader className="space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 border border-red-500/20">
              <Trash2 className="h-6 w-6 text-red-500" />
            </div>

            <div className="space-y-1 text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-red-500/80">
                Confirmación Requerida
              </p>
              <DialogTitle className="text-2xl font-black italic tracking-tighter text-white uppercase">
                ¿Eliminar "{event?.title}"?
              </DialogTitle>
            </div>

            <DialogDescription className="text-center text-zinc-500 text-sm leading-relaxed max-w-[280px] mx-auto font-medium italic">
              Esta acción es definitiva. El evento será removido de la agenda de
              toda la comunidad.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isDeleting}
              className="h-12 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white hover:bg-white/5 transition-all"
            >
              Mantener
            </Button>

            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
              className="h-12 bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-widest shadow-[0_0_20px_rgba(220,38,38,0.3)] transition-all"
            >
              {isDeleting ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Borrando...</span>
                </div>
              ) : (
                'Eliminar'
              )}
            </Button>
          </div>
        </div>

        {/* Subtle bottom detail */}
        <div className="bg-red-950/20 py-2 text-center border-t border-red-900/10">
          <span className="text-[9px] font-black uppercase tracking-[0.3em] text-red-900/60">
            Acción Irreversible
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
