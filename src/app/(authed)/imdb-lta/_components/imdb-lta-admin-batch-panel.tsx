'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, RefreshCw, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { rotateBatchNowAction } from '@/lib/actions/imdb-lta/rotate-batch';

type ImdbLtaAdminBatchPanelProps = {
  openBatch: {
    number: number;
    openedAt: string;
    movieCount: number;
    announced: boolean;
  } | null;
  ratingOpen: boolean;
};

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ImdbLtaAdminBatchPanel({
  openBatch,
  ratingOpen,
}: ImdbLtaAdminBatchPanelProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleRotate = () => {
    if (isPending) return;
    startTransition(async () => {
      try {
        const result = await rotateBatchNowAction();
        if (
          !result.rotation.rotated &&
          result.rotation.reason?.includes('anuncio')
        ) {
          toast.success(
            `Anuncio del lote #${result.rotation.openedBatchNumber} enviado`
          );
        } else if (result.rotation.openedBatchNumber) {
          toast.success(`Lote #${result.rotation.openedBatchNumber} abierto`);
        } else if (result.rotation.queueEmpty) {
          toast.message('Cola vacía: no hay más películas para lotear');
        } else {
          toast.message(result.rotation.reason ?? 'Sin cambios');
        }
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : 'No se pudo rotar el lote'
        );
      }
    });
  };

  return (
    <section className="mb-6 rounded-2xl border border-yellow-500/30 bg-yellow-950/20 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Shield className="h-4 w-4 text-yellow-400" />
        <p className="text-xs font-black uppercase tracking-widest text-yellow-400">
          Admin · Lote
        </p>
        {isPending && (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-yellow-400" />
        )}
      </div>

      {openBatch ? (
        <div className="mb-3 space-y-1 text-sm text-yellow-100">
          <p>
            Lote <span className="font-bold">#{openBatch.number}</span> abierto
            · {openBatch.movieCount} películas · desde{' '}
            {formatWhen(openBatch.openedAt)}
          </p>
          {!openBatch.announced && (
            <p className="text-xs text-amber-300">
              Telegram pendiente — el botón reintenta el anuncio sin abrir otro
              lote.
            </p>
          )}
        </div>
      ) : (
        <p className="mb-3 text-sm text-yellow-200/70">
          No hay lote abierto.
          {ratingOpen
            ? ' Usá el botón para abrir el primero.'
            : ' Abrí la fase de puntajes primero.'}
      </p>
      )}

      <p className="mb-3 text-xs text-yellow-200/60">
        La rotación es a mano (vos u otro admin). Cerrás el lote, mandás los
        resultados al grupo de Telegram y abrís el siguiente.
      </p>

      <Button
        type="button"
        variant="outline"
        disabled={isPending || !ratingOpen}
        onClick={handleRotate}
        className="border-yellow-500/40 bg-yellow-500/10 text-yellow-100 hover:bg-yellow-500/20"
      >
        {isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <RefreshCw className="mr-2 h-4 w-4" />
        )}
        {openBatch && !openBatch.announced
          ? 'Reintentar anuncio Telegram'
          : openBatch
            ? 'Cerrar lote y abrir el siguiente'
            : 'Abrir primer lote'}
      </Button>
    </section>
  );
}
