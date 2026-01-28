'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { motion } from 'motion/react';
import { CheckCircle2, Loader2, Send } from 'lucide-react';
import { setSingleWinnerAction } from '@/lib/actions/oscars/set-winners';
import { toast } from 'sonner';
import type { OscarCategory } from '@/lib/validations/oscars';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface OscarWinnersFormProps {
  categories: OscarCategory[];
  editionId: number;
}

export function OscarWinnersForm({
  categories,
  editionId,
}: OscarWinnersFormProps) {
  const router = useRouter();
  const [submittingCategoryId, setSubmittingCategoryId] = useState<
    number | null
  >(null);
  const [selectedNomineeByCategory, setSelectedNomineeByCategory] = useState<
    Record<number, number>
  >({});

  const pending = categories
    .filter((c) => c.winnerId == null)
    .sort((a, b) => a.order - b.order);
  const announced = categories
    .filter((c) => c.winnerId != null)
    .sort((a, b) => a.order - b.order);

  const handleWinnerChange = (categoryId: number, nomineeId: string) => {
    if (nomineeId === '') {
      setSelectedNomineeByCategory((prev) => {
        const next = { ...prev };
        delete next[categoryId];
        return next;
      });
    } else {
      setSelectedNomineeByCategory((prev) => ({
        ...prev,
        [categoryId]: parseInt(nomineeId, 10),
      }));
    }
  };

  const handleSubmit = async (category: OscarCategory) => {
    const nomineeId = selectedNomineeByCategory[category.id];
    if (nomineeId == null) {
      toast.error('Selecciona un ganador para esta categoría');
      return;
    }

    setSubmittingCategoryId(category.id);
    try {
      await setSingleWinnerAction({
        editionId,
        categoryId: category.id,
        nomineeId,
      });
      toast.success(`Ganador de "${category.name}" guardado`);
      setSelectedNomineeByCategory((prev) => {
        const next = { ...prev };
        delete next[category.id];
        return next;
      });
      router.refresh();
    } catch (error) {
      console.error('Error setting winner:', error);
      toast.error(
        error instanceof Error ? error.message : 'Error al guardar el ganador',
      );
    } finally {
      setSubmittingCategoryId(null);
    }
  };

  const getWinnerNominee = (category: OscarCategory) => {
    if (!category.winnerId) return null;
    return category.nominees.find((n) => n.id === category.winnerId!);
  };

  return (
    <div className="space-y-10">
      {/* Pendientes */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-4"
      >
        <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-500">
          Pendientes ({pending.length})
        </h2>
        <div className="grid grid-cols-1 gap-4">
          {pending.map((category) => {
            const selectedId = selectedNomineeByCategory[category.id];
            const selectedNominee = selectedId
              ? category.nominees.find((n) => n.id === selectedId)
              : null;
            const isSubmitting = submittingCategoryId === category.id;

            return (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: category.order * 0.02 }}
                className="rounded-xl border border-white/5 bg-zinc-900/50 p-6 transition-all"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 text-xs font-mono uppercase tracking-widest text-yellow-500/70">
                      Categoría {category.order}
                    </div>
                    <h3 className="mb-4 font-bold text-xl">{category.name}</h3>
                    <Select
                      value={selectedId?.toString() ?? ''}
                      onValueChange={(value) =>
                        handleWinnerChange(category.id, value)
                      }
                      disabled={isSubmitting}
                    >
                      <SelectTrigger className="w-full border-white/10 bg-zinc-800/50 text-white hover:border-white/20 hover:bg-zinc-800 sm:max-w-md">
                        <SelectValue placeholder="Selecciona el ganador..." />
                      </SelectTrigger>
                      <SelectContent className="border-white/10 bg-zinc-900">
                        {category.nominees.map((nominee) => (
                          <SelectItem
                            key={nominee.id}
                            value={nominee.id.toString()}
                            className="focus:bg-zinc-800 focus:text-yellow-500 text-white"
                          >
                            <div className="flex flex-col">
                              <span className="font-semibold">
                                {nominee.name}
                              </span>
                              {nominee.filmTitle &&
                                nominee.filmTitle.trim() !==
                                  nominee.name.trim() && (
                                  <span className="text-xs text-zinc-400">
                                    {nominee.filmTitle}
                                  </span>
                                )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={() => handleSubmit(category)}
                    disabled={!selectedNominee || isSubmitting}
                    className="shrink-0 rounded-full bg-white px-6 text-black transition-all duration-200 hover:bg-yellow-500 hover:text-black select-none"
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Enviar
                      </>
                    )}
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>
        {pending.length === 0 && (
          <p className="rounded-xl border border-white/5 bg-zinc-900/30 px-4 py-6 text-center text-sm text-zinc-500">
            No hay categorías pendientes. Todas tienen ganador asignado.
          </p>
        )}
      </motion.section>

      {/* Anunciados */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="space-y-4"
      >
        <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-500">
          Anunciados ({announced.length})
        </h2>
        <div className="grid grid-cols-1 gap-4">
          {announced.map((category) => {
            const winner = getWinnerNominee(category);
            return (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: category.order * 0.02 }}
                className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-6 transition-all"
              >
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-yellow-500" />
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 text-xs font-mono uppercase tracking-widest text-yellow-500/70">
                      Categoría {category.order}
                    </div>
                    <h3 className="font-bold text-xl">{category.name}</h3>
                    {winner && (
                      <p className="mt-2 text-zinc-300">
                        <span className="font-semibold text-yellow-500">
                          Ganador:
                        </span>{' '}
                        {winner.name}
                        {winner.filmTitle &&
                          winner.filmTitle.trim() !== winner.name.trim() && (
                            <span className="ml-2 text-zinc-500">
                              • {winner.filmTitle}
                            </span>
                          )}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
        {announced.length === 0 && (
          <p className="rounded-xl border border-white/5 bg-zinc-900/30 px-4 py-6 text-center text-sm text-zinc-500">
            Aún no se ha anunciado ningún ganador.
          </p>
        )}
      </motion.section>

      <div className="border-t border-white/10 pt-6 text-center text-sm text-zinc-500">
        <p>
          {announced.length} de {categories.length} categorías con ganador
          anunciado
        </p>
        <p className="mt-1 text-xs">
          Envía un ganador por categoría. No se puede editar una vez enviado.
        </p>
      </div>
    </div>
  );
}
