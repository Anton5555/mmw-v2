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
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Editar evento</SheetTitle>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de evento</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {EventTypeSchema.options.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type === 'BIRTHDAY'
                            ? 'Cumpleaños'
                            : type === 'ANNIVERSARY'
                            ? 'Aniversario'
                            : type === 'DISCORD'
                            ? 'Evento de Discord'
                            : type === 'IN_PERSON'
                            ? 'Evento presencial'
                            : 'Otro'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="day"
              render={() => (
                <FormItem>
                  <FormLabel>Fecha y hora</FormLabel>
                  <FormControl>
                    <DateTimePicker
                      yearRange={5}
                      onChange={handleDateTimeChange}
                      displayTime={!isDateOnlyEvent}
                      value={getEventDate()}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleSheetClose}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  'Guardar cambios'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
