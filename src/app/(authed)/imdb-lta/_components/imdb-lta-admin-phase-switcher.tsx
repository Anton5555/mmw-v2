'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, Shield } from 'lucide-react';
import { ImdbLtaPhase } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { updateImdbLtaPhaseAction } from '@/lib/actions/imdb-lta/update-phase';
import type { ImdbLtaPhaseValue } from '@/lib/validations/imdb-lta';

const PHASES: {
  value: ImdbLtaPhaseValue;
  label: string;
  hint: string;
}[] = [
  {
    value: 'NOMINATION_OPEN',
    label: 'Nominaciones abiertas',
    hint: 'Se puede armar y guardar listas',
  },
  {
    value: 'NOMINATION_CLOSED',
    label: 'Nominaciones cerradas',
    hint: 'Universo de candidatas congelado',
  },
  {
    value: 'RATING_OPEN',
    label: 'Puntuaciones abiertas',
    hint: 'Se puede puntuar 0–10',
  },
  {
    value: 'RATING_CLOSED',
    label: 'Ranking oficial',
    hint: 'Sin nuevos puntajes; ranking final',
  },
];

type ImdbLtaAdminPhaseSwitcherProps = {
  currentPhase: ImdbLtaPhase;
};

export function ImdbLtaAdminPhaseSwitcher({
  currentPhase,
}: ImdbLtaAdminPhaseSwitcherProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleChange = (phase: ImdbLtaPhaseValue) => {
    if (phase === currentPhase || isPending) return;

    startTransition(async () => {
      try {
        await updateImdbLtaPhaseAction(phase);
        toast.success(`Fase actualizada: ${phase}`);
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : 'No se pudo cambiar la fase'
        );
      }
    });
  };

  return (
    <section className="mb-6 rounded-2xl border border-yellow-500/30 bg-yellow-950/20 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Shield className="h-4 w-4 text-yellow-400" />
        <p className="text-xs font-black uppercase tracking-widest text-yellow-400">
          Admin · Fase IMDB LTA
        </p>
        {isPending && (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-yellow-400" />
        )}
      </div>
      <p className="mb-3 text-xs text-yellow-200/70">
        Solo visible para admins. El cambio aplica al instante para todos.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {PHASES.map((phase) => {
          const active = phase.value === currentPhase;
          return (
            <Button
              key={phase.value}
              type="button"
              variant="outline"
              disabled={isPending || active}
              onClick={() => handleChange(phase.value)}
              className={cn(
                'h-auto flex-col items-start gap-0.5 px-3 py-2.5 text-left whitespace-normal',
                active
                  ? 'border-yellow-500 bg-yellow-500/15 text-yellow-100'
                  : 'border-white/10 bg-zinc-950/40 text-zinc-300 hover:border-yellow-500/40 hover:bg-yellow-500/5'
              )}
            >
              <span className="text-[11px] font-black uppercase tracking-wider">
                {phase.label}
                {active ? ' · actual' : ''}
              </span>
              <span className="text-[10px] font-normal opacity-70">
                {phase.hint}
              </span>
            </Button>
          );
        })}
      </div>
    </section>
  );
}
