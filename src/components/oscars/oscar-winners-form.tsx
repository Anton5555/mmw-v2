'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { motion } from 'motion/react';
import { CheckCircle2, Save } from 'lucide-react';
import { setWinnersAction } from '@/lib/actions/oscars/set-winners';
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
  const [winners, setWinners] = useState<Record<string, number>>(() => {
    // Initialize with current winners
    const initial: Record<string, number> = {};
    categories.forEach((category) => {
      if (category.winnerId) {
        initial[category.id.toString()] = category.winnerId;
      }
    });
    return initial;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleWinnerChange = (categoryId: number, nomineeId: string) => {
    if (nomineeId === '') {
      // Clear winner if empty string (placeholder selected)
      setWinners((prev) => {
        const updated = { ...prev };
        delete updated[categoryId.toString()];
        return updated;
      });
    } else {
      setWinners((prev) => ({
        ...prev,
        [categoryId.toString()]: parseInt(nomineeId, 10),
      }));
    }
  };

  const handleSubmit = async () => {
    if (Object.keys(winners).length === 0) {
      toast.error('Debes seleccionar al menos un ganador');
      return;
    }

    setIsSubmitting(true);
    try {
      await setWinnersAction({
        editionId,
        winners,
      });

      toast.success('Ganadores guardados exitosamente');
      router.refresh();
    } catch (error) {
      console.error('Error setting winners:', error);
      toast.error(
        error instanceof Error ? error.message : 'Error al guardar los ganadores'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSelectedNominee = (category: OscarCategory) => {
    const winnerId = winners[category.id.toString()];
    if (!winnerId) return null;
    return category.nominees.find((n) => n.id === winnerId);
  };

  const hasWinner = (category: OscarCategory) => {
    return !!winners[category.id.toString()];
  };

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6"
      >
        <div className="grid grid-cols-1 gap-4">
          {categories.map((category) => {
            const selectedNominee = getSelectedNominee(category);
            const categoryHasWinner = hasWinner(category);

            return (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: category.order * 0.02 }}
                className={cn(
                  'p-6 rounded-xl border transition-all',
                  categoryHasWinner
                    ? 'bg-yellow-500/5 border-yellow-500/30'
                    : 'bg-zinc-900/50 border-white/5'
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="text-xs text-yellow-500 font-mono tracking-widest uppercase">
                        Categoría {category.order}
                      </div>
                      {categoryHasWinner && (
                        <CheckCircle2 className="w-4 h-4 text-yellow-500" />
                      )}
                    </div>
                    <h3 className="font-bold text-xl mb-4">{category.name}</h3>

                    <Select
                      value={
                        selectedNominee
                          ? selectedNominee.id.toString()
                          : undefined
                      }
                      onValueChange={(value) =>
                        handleWinnerChange(category.id, value)
                      }
                    >
                      <SelectTrigger
                        className={cn(
                          'w-full bg-zinc-800/50 border-white/10 text-white hover:bg-zinc-800 hover:border-white/20',
                          categoryHasWinner && 'border-yellow-500/50'
                        )}
                      >
                        <SelectValue placeholder="Selecciona el ganador..." />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-white/10">
                        {category.nominees.map((nominee) => (
                          <SelectItem
                            key={nominee.id}
                            value={nominee.id.toString()}
                            className="text-white focus:bg-zinc-800 focus:text-yellow-500"
                          >
                            <div className="flex flex-col">
                              <span className="font-semibold">{nominee.name}</span>
                              {nominee.filmTitle && 
                               nominee.filmTitle.trim() !== nominee.name.trim() && (
                                <span className="text-xs text-zinc-400">
                                  {nominee.filmTitle}
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {selectedNominee && (
                      <div className="mt-3 text-sm text-zinc-400">
                        <span className="text-yellow-500 font-semibold">
                          Ganador seleccionado:
                        </span>{' '}
                        <span className="text-white">
                          {selectedNominee.name}
                          {selectedNominee.filmTitle && 
                           selectedNominee.filmTitle.trim() !== selectedNominee.name.trim() && (
                            <span className="text-zinc-500 ml-2">
                              • {selectedNominee.filmTitle}
                            </span>
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      <div className="flex justify-center pt-8 border-t border-white/10">
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="bg-white text-black hover:bg-yellow-500 hover:text-black rounded-full px-8 select-none transition-all duration-200"
        >
          {isSubmitting ? (
            'Guardando...'
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Guardar Ganadores
            </>
          )}
        </Button>
      </div>

      <div className="text-center text-sm text-zinc-500 pt-4">
        <p>
          {Object.keys(winners).length} de {categories.length} categorías con
          ganador seleccionado
        </p>
        <p className="text-xs mt-1">
          Puedes guardar parcialmente. Los ganadores se actualizarán en tiempo
          real.
        </p>
      </div>
    </div>
  );
}
