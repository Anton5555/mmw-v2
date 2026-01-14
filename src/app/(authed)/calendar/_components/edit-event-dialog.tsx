'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  UpdateEventFormValues,
  updateEventSchema,
} from '@/lib/validations/events';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { updateEventAction } from '@/lib/actions/events/update-event';
import { useState, useEffect } from 'react';
import { EventTypeSchema } from '@/lib/validations/generated';
import { DateTimePicker } from '@/components/datetime-picker';
import { SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Sheet } from '@/components/ui/sheet';
import type { Event } from '@prisma/client';

type EditEventSheetProps = {
  event: Event;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
};

export function EditEventSheet({
  event,
  onOpenChange,
  open,
}: EditEventSheetProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Create a Date object for the event date/time
  const getEventDate = () => {
    const year = event.year || new Date().getFullYear();
    const month = event.month - 1;
    const day = event.day;
    const date = new Date(year, month, day);

    if (event.time) {
      date.setHours(event.time.getHours());
      date.setMinutes(event.time.getMinutes());
    }

    return date;
  };

  // Helper to get default values based on event type
  const getDefaultValues = (): UpdateEventFormValues => {
    const isDateOnlyEvent = ['BIRTHDAY', 'ANNIVERSARY'].includes(event.type);

    if (isDateOnlyEvent) {
      return {
        title: event.title,
        description: event.description || '',
        type: event.type as 'BIRTHDAY' | 'ANNIVERSARY',
        month: event.month,
        day: event.day,
        year: undefined,
        time: undefined,
      };
    } else {
      return {
        title: event.title,
        description: event.description || '',
        type: event.type as 'DISCORD' | 'IN_PERSON' | 'OTHER',
        month: event.month,
        day: event.day,
        year: event.year ?? undefined,
        time: event.time ?? undefined,
      };
    }
  };

  const form = useForm<UpdateEventFormValues>({
    resolver: zodResolver(updateEventSchema),
    defaultValues: getDefaultValues(),
  });

  const eventType = form.watch('type');
  const isDateOnlyEvent = ['BIRTHDAY', 'ANNIVERSARY'].includes(eventType);

  useEffect(() => {
    if (!open) {
      setIsSubmitting(false);
      return;
    }

    // Reset form with event data when opening
    const isDateOnlyEvent = ['BIRTHDAY', 'ANNIVERSARY'].includes(event.type);

    if (isDateOnlyEvent) {
      form.reset({
        title: event.title,
        description: event.description || '',
        type: event.type as 'BIRTHDAY' | 'ANNIVERSARY',
        month: event.month,
        day: event.day,
        year: undefined,
        time: undefined,
      });
    } else {
      form.reset({
        title: event.title,
        description: event.description || '',
        type: event.type as 'DISCORD' | 'IN_PERSON' | 'OTHER',
        month: event.month,
        day: event.day,
        year: event.year ?? undefined,
        time: event.time ?? undefined,
      });
    }
  }, [open, event, form]);

  const onSubmit = async (data: UpdateEventFormValues) => {
    setIsSubmitting(true);
    try {
      await updateEventAction(event.id, data);
      toast.success('Evento actualizado correctamente');
      onOpenChange?.(false);
    } catch (error) {
      console.error('Event update error:', error);
      toast.error(
        error instanceof Error ? error.message : 'Error al actualizar el evento'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDateTimeChange = (date: Date | undefined) => {
    if (!date) return;

    form.setValue('month', date.getMonth() + 1);
    form.setValue('day', date.getDate());

    if (!isDateOnlyEvent) {
      form.setValue('year', date.getFullYear());
      form.setValue('time', date);
    } else {
      form.setValue('year', undefined);
      form.setValue('time', undefined);
    }
  };

  const handleSheetClose = () => {
    onOpenChange?.(false);
  };

  return (
    <Sheet open={open} onOpenChange={handleSheetClose}>
      <SheetContent className="sm:max-w-[540px] border-l border-white/10 bg-zinc-950/95 backdrop-blur-2xl p-0">
        <div className="flex h-full flex-col">
          {/* Premium Header */}
          <SheetHeader className="p-8 border-b border-white/5 space-y-1">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-yellow-500">
              Gestión de Agenda
            </p>
            <SheetTitle className="text-3xl font-black italic tracking-tighter text-white uppercase">
              Editar Evento
            </SheetTitle>
          </SheetHeader>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="flex-1 flex flex-col p-8 space-y-8 overflow-y-auto custom-scrollbar"
            >
              {/* Title Section */}
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                      Título del Evento
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="NOMBRA EL EVENTO..."
                        className="h-12 border-none bg-white/5 text-lg font-bold tracking-tight focus-visible:ring-1 focus-visible:ring-yellow-500 placeholder:text-zinc-700"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-[10px] uppercase font-bold text-red-500" />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                {/* Type Selection */}
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                        Categoría
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="bg-white/5 border-none h-11 focus:ring-1 focus:ring-yellow-500 capitalize">
                            <SelectValue placeholder="Selecciona" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-zinc-900 border-white/10 text-white">
                          {EventTypeSchema.options.map((type) => (
                            <SelectItem
                              key={type}
                              value={type}
                              className="focus:bg-yellow-500 focus:text-black capitalize"
                            >
                              {type.replace('_', ' ')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-[10px] uppercase font-bold text-red-500" />
                    </FormItem>
                  )}
                />

                {/* Date/Time Picker */}
                <FormField
                  control={form.control}
                  name="day"
                  render={() => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                        Cronograma
                      </FormLabel>
                      <FormControl>
                        <DateTimePicker
                          yearRange={5}
                          onChange={handleDateTimeChange}
                          displayTime={!isDateOnlyEvent}
                          value={getEventDate()}
                          className="bg-white/5 border-none h-11 focus:ring-1 focus:ring-yellow-500"
                        />
                      </FormControl>
                      <FormMessage className="text-[10px] uppercase font-bold text-red-500" />
                    </FormItem>
                  )}
                />
              </div>

              {/* Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                      Detalles Adicionales
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Añade notas o requerimientos..."
                        className="min-h-[120px] bg-white/5 border-none resize-none focus-visible:ring-1 focus-visible:ring-yellow-500 placeholder:text-zinc-700"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-[10px] uppercase font-bold text-red-500" />
                  </FormItem>
                )}
              />

              {/* Action Buttons - Fixed at bottom */}
              <div className="pt-8 mt-auto flex gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleSheetClose}
                  className="flex-1 h-12 text-[10px] font-black uppercase tracking-[.2em] hover:bg-white/5"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-[2] h-12 bg-white hover:bg-yellow-500 text-black font-black uppercase tracking-[.2em] transition-all"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Guardar Cambios'
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
