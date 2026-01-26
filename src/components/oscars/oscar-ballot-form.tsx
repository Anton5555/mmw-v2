'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { Check, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { submitBallotAction } from '@/lib/actions/oscars/submit-ballot';
import { toast } from 'sonner';
import type { OscarCategory } from '@/lib/validations/oscars';
import Image from 'next/image';

interface OscarBallotFormProps {
  categories: OscarCategory[];
  editionId: number;
  ceremonyDate: Date | null;
}

// Hours before ceremony when form is blocked (3 hours before)
const HOURS_BEFORE_CEREMONY = 3;

export function OscarBallotForm({
  categories,
  editionId,
  ceremonyDate,
}: OscarBallotFormProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [selections, setSelections] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasReachedReview, setHasReachedReview] = useState(false);
  const [isFormAvailable, setIsFormAvailable] = useState(true);
  const [timeUntilBlocked, setTimeUntilBlocked] = useState<string>('');

  // Check if form should be available based on ceremony date
  // Form is available from now until 3 hours before ceremony
  useEffect(() => {
    if (!ceremonyDate) {
      setIsFormAvailable(true);
      return;
    }

    const checkAvailability = () => {
      const now = new Date();
      const ceremony = new Date(ceremonyDate);
      const hoursBefore = HOURS_BEFORE_CEREMONY;
      const cutoffTime = new Date(ceremony.getTime() - hoursBefore * 60 * 60 * 1000);

      if (now >= cutoffTime) {
        // Form is blocked (within 3 hours of ceremony)
        setIsFormAvailable(false);
        setTimeUntilBlocked('');
      } else {
        // Form is available (more than 3 hours before ceremony)
        setIsFormAvailable(true);
        // Calculate time until form is blocked
        const diff = cutoffTime.getTime() - now.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        
        // Format: "Xd Xh Xm" or "Xh Xm" if no days, or "Xm" if less than an hour
        if (days > 0) {
          setTimeUntilBlocked(`${days}d ${hours}h ${minutes}m`);
        } else if (hours > 0) {
          setTimeUntilBlocked(`${hours}h ${minutes}m`);
        } else {
          setTimeUntilBlocked(`${minutes}m`);
        }
      }
    };

    checkAvailability();
    // Update every minute
    const interval = setInterval(checkAvailability, 60000);

    return () => clearInterval(interval);
  }, [ceremonyDate]);

  const allCategoriesSelected = Object.keys(selections).length === categories.length;
  const isPreviewStep = allCategoriesSelected && currentStep >= categories.length;
  const isLastCategoryStep = currentStep === categories.length - 1;
  const currentCategory = !isPreviewStep ? categories[currentStep] : null;

  const handleSelect = (nomineeId: number, categoryId?: number) => {
    const targetCategoryId = categoryId || currentCategory?.id;
    if (!targetCategoryId) return;
    
    setSelections((prev) => ({
      ...prev,
      [targetCategoryId.toString()]: nomineeId,
    }));
  };

  const handleNext = () => {
    if (!currentCategory) return;
    
    if (isLastCategoryStep && selections[currentCategory.id.toString()]) {
      // Move to preview step
      setCurrentStep(categories.length);
      setHasReachedReview(true);
    } else if (selections[currentCategory.id.toString()]) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (isPreviewStep) {
      // Go back to last category from preview
      setCurrentStep(categories.length - 1);
    } else if (allCategoriesSelected && hasReachedReview) {
      // If all categories are selected and user has reached review, go back to review
      setCurrentStep(categories.length);
    } else if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleBackToReview = () => {
    setCurrentStep(categories.length);
  };

  const handleEditCategory = (categoryIndex: number) => {
    setCurrentStep(categoryIndex);
  };

  const handleSubmit = async () => {
    if (!isFormAvailable) {
      toast.error('El formulario está bloqueado. Se bloquea 3 horas antes de la ceremonia.');
      return;
    }

    if (!allCategoriesSelected) {
      toast.error('Debes seleccionar un nominado para cada categoría');
      return;
    }

    setIsSubmitting(true);
    try {
      // Convert selections to the format expected by the action
      const formattedSelections: Record<string, number> = {};
      for (const [categoryId, nomineeId] of Object.entries(selections)) {
        formattedSelections[categoryId] = nomineeId;
      }

      await submitBallotAction({
        editionId,
        selections: formattedSelections,
      });

      // Redirect with search param to trigger success dialog on the summary page
      router.push('/oscars?submitted=true');
      router.refresh();
    } catch (error) {
      console.error('Error submitting ballot:', error);
      toast.error(
        error instanceof Error ? error.message : 'Error al enviar Los Oscalos'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedNomineeId = currentCategory ? selections[currentCategory.id.toString()] : undefined;

  // Determine if this category should show posters (film categories)
  const showPosters = currentCategory ? (
    currentCategory.slug === 'best-picture' ||
    currentCategory.slug === 'animated-feature-film' ||
    currentCategory.slug === 'documentary-feature-film' ||
    currentCategory.slug === 'international-feature-film' ||
    currentCategory.slug === 'visual-effects' ||
    currentCategory.slug === 'production-design' ||
    currentCategory.slug === 'music-original-score' ||
    currentCategory.slug === 'writing-adapted-screenplay' ||
    currentCategory.slug === 'writing-original-screenplay'
  ) : false;

  // Get selected nominee for a category
  const getSelectedNominee = (categoryId: number) => {
    const nomineeId = selections[categoryId.toString()];
    if (!nomineeId) return null;
    const category = categories.find((c) => c.id === categoryId);
    return category?.nominees.find((n) => n.id === nomineeId);
  };

  return (
    <div className="space-y-8">
      {!isFormAvailable && ceremonyDate && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-xl border border-yellow-500/30 bg-yellow-500/5"
        >
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-yellow-500" />
            <div>
              <h3 className="font-bold text-lg text-yellow-500 mb-1">
                Formulario bloqueado
              </h3>
              <p className="text-zinc-400 text-sm">
                El formulario se bloquea 3 horas antes de la ceremonia. Ya no puedes enviar tus apuestas.
              </p>
              <p className="text-zinc-500 text-xs mt-1">
                Ceremonia: {new Date(ceremonyDate).toLocaleString('es-ES', {
                  dateStyle: 'long',
                  timeStyle: 'short',
                  timeZone: 'America/Los_Angeles',
                })} (hora de Los Ángeles)
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {isFormAvailable && ceremonyDate && timeUntilBlocked && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl border border-zinc-700/50 bg-zinc-900/30"
        >
          <div className="flex items-center gap-3">
            <Clock className="w-4 h-4 text-zinc-400" />
            <p className="text-zinc-400 text-sm">
              El formulario se bloqueará en: <span className="text-white font-semibold">{timeUntilBlocked}</span>
            </p>
          </div>
        </motion.div>
      )}

      {/* Progress Indicator */}
      <div className={cn('flex gap-1 h-1', !isFormAvailable && 'opacity-50')}>
        {categories.map((_, i) => (
          <div
            key={i}
            className={cn(
              'flex-1 transition-all duration-500',
              (i <= currentStep || isPreviewStep) ? 'bg-yellow-500' : 'bg-zinc-800'
            )}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        {isPreviewStep ? (
          // Preview Step
          <motion.div
            key="preview"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className={cn('space-y-6', !isFormAvailable && 'opacity-50 pointer-events-none')}
          >
            <div className="space-y-2">
              <span className="text-yellow-500 font-mono text-sm tracking-widest uppercase">
                Revisión Final
              </span>
              <h2 className="text-3xl font-bold">Revisa tus selecciones</h2>
              <p className="text-zinc-400 text-sm">
                Verifica todas tus predicciones antes de enviar Los Oscalos.
              </p>
            </div>

            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
              {categories.map((category, index) => {
                const selectedNominee = getSelectedNominee(category.id);
                return (
                  <button
                    key={category.id}
                    onClick={() => handleEditCategory(index)}
                    className="w-full text-left p-4 rounded-xl border border-white/5 bg-zinc-900/50 hover:border-white/20 hover:bg-zinc-900/70 transition-all group select-none"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-yellow-500 font-mono tracking-widest uppercase mb-1">
                          Categoría {index + 1}
                        </div>
                        <div className="font-bold text-lg group-hover:text-yellow-500 transition-colors">
                          {category.name}
                        </div>
                        {selectedNominee && (
                          <div className="mt-2 text-zinc-400">
                            <span className="text-white font-semibold">
                              {selectedNominee.name}
                            </span>
                            {selectedNominee.filmTitle && 
                             selectedNominee.filmTitle.trim() !== selectedNominee.name.trim() && (
                              <span className="text-zinc-500 ml-2">
                                • {selectedNominee.filmTitle}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-yellow-500 transition-colors flex-shrink-0" />
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        ) : currentCategory ? (
          // Category Selection Step
          <motion.div
            key={currentCategory.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className={cn('space-y-6', !isFormAvailable && 'opacity-50 pointer-events-none')}
          >
          <div className="space-y-2">
            <span className="text-yellow-500 font-mono text-sm tracking-widest uppercase">
              Categoría {currentStep + 1} de {categories.length}
            </span>
            <h2 className="text-3xl font-bold">{currentCategory.name}</h2>
          </div>

          {showPosters ? (
            // Poster Grid Layout
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {currentCategory.nominees.map((nominee) => {
                const isSelected = selectedNomineeId === nominee.id;
                return (
                  <button
                    key={nominee.id}
                    onClick={() => handleSelect(nominee.id)}
                    className={cn(
                      'relative aspect-[2/3] rounded-xl border-2 transition-all text-left group overflow-hidden select-none',
                      isSelected
                        ? 'bg-yellow-500/10 border-yellow-500 ring-2 ring-yellow-500/50'
                        : 'bg-zinc-900/50 border-white/5 hover:border-white/20 hover:bg-zinc-900/70'
                    )}
                  >
                    {nominee.movie?.posterUrl ? (
                      <Image
                        src={nominee.movie.posterUrl}
                        alt={nominee.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                        <span className="text-zinc-500 text-sm text-center px-2">
                          {nominee.name}
                        </span>
                      </div>
                    )}
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-yellow-500 flex items-center justify-center z-10">
                        <Check className="w-4 h-4 text-black" />
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                      <div className="font-bold text-sm text-white">
                        {nominee.name}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            // Credit Roll List Layout
            <div className="grid grid-cols-1 gap-3">
              {currentCategory.nominees.map((nominee) => {
                const isSelected = selectedNomineeId === nominee.id;
                return (
                  <button
                    key={nominee.id}
                    onClick={() => handleSelect(nominee.id)}
                    className={cn(
                      'flex items-center justify-between p-4 rounded-xl border transition-all text-left group select-none',
                      isSelected
                        ? 'bg-yellow-500/10 border-yellow-500 text-white'
                        : 'bg-zinc-900/50 border-white/5 text-zinc-400 hover:border-white/20 hover:bg-zinc-900/70'
                    )}
                  >
                    <div className="flex-1">
                      <div className="font-bold text-lg group-hover:text-white transition-colors">
                        {nominee.name}
                      </div>
                      {nominee.filmTitle && (
                        <div className="text-sm opacity-60 mt-1">
                          {nominee.filmTitle}
                        </div>
                      )}
                    </div>
                    {isSelected && (
                      <div className="w-6 h-6 rounded-full bg-yellow-500 flex items-center justify-center ml-4">
                        <Check className="w-4 h-4 text-black" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="flex justify-between pt-8 border-t border-white/10">
        <Button
          variant="ghost"
          disabled={currentStep === 0 && !isPreviewStep}
          onClick={handlePrevious}
          className="rounded-full select-none"
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Anterior
        </Button>

        {isPreviewStep ? (
          <Button
            className="bg-white text-black hover:bg-yellow-500 hover:text-black rounded-full px-8 select-none transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isSubmitting || !isFormAvailable}
            onClick={handleSubmit}
          >
            {isSubmitting ? (
              'Enviando...'
            ) : !isFormAvailable ? (
              <>
                <Clock className="w-4 h-4 mr-2" />
                Formulario bloqueado
              </>
            ) : (
              'Enviar Los Oscalos'
            )}
          </Button>
        ) : allCategoriesSelected && hasReachedReview ? (
          <Button
            onClick={handleBackToReview}
            className="bg-yellow-500/10 border border-yellow-500 text-yellow-500 hover:bg-yellow-500/20 hover:border-yellow-400 rounded-full px-8 select-none transition-all duration-200"
          >
            Volver al Resumen
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        ) : isLastCategoryStep ? (
          <Button
            onClick={handleNext}
            disabled={!selectedNomineeId}
            className="bg-zinc-800 text-white hover:bg-zinc-700 rounded-full px-8 select-none transition-all duration-200"
          >
            Ver Resumen
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <div className="flex flex-col items-end gap-2">
            <Button
              onClick={handleNext}
              disabled={!selectedNomineeId}
              className="bg-zinc-800 text-white hover:bg-zinc-700 rounded-full px-8 select-none transition-all duration-200"
            >
              Siguiente Categoría
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
            <p className="text-xs text-zinc-500 text-right">
              Tranqui, podés volver atrás y revisar todo al final
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
