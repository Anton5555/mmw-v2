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
  CreateEventFormValues,
  createEventSchema,
} from '@/lib/validations/events';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { createEventAction } from '@/lib/actions/events/create-event';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { EventTypeSchema } from '@/lib/validations/generated';
import { DateTimePicker } from '@/components/datetime-picker';
import { SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Sheet } from '@/components/ui/sheet';

type CreateEventSheetProps = {
  selectedDate?: Date;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
  onEventCreated?: () => void;
};

export function CreateEventSheet({
  selectedDate,
  onOpenChange,
  open,
  onEventCreated,
}: CreateEventSheetProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CreateEventFormValues>({
    resolver: zodResolver(createEventSchema),
    defaultValues: {
      title: '',
      description: '',
      type: 'OTHER',
      month: selectedDate?.getMonth() ?? new Date().getMonth() + 1,
      day: selectedDate?.getDate() ?? new Date().getDate(),
      time: selectedDate,
    },
  });

  const eventType = form.watch('type');
  const isDateOnlyEvent = ['BIRTHDAY', 'ANNIVERSARY'].includes(eventType);

  useEffect(() => {
    if (selectedDate) {
      form.setValue('month', selectedDate.getMonth() + 1);
      form.setValue('day', selectedDate.getDate());

      if (!isDateOnlyEvent) {
        form.setValue('year', selectedDate.getFullYear());
        form.setValue('time', selectedDate);
      } else {
        form.setValue('year', undefined);
        form.setValue('time', undefined);
      }
    }
  }, [selectedDate, form, isDateOnlyEvent]);

  useEffect(() => {
    if (form.formState.errors) {
      console.log(form.formState.errors);
    }
  }, [form.formState.errors.time]);

  const onSubmit = async (data: CreateEventFormValues) => {
    setIsSubmitting(true);
    try {
      await createEventAction(data);
      toast.success('Evento creado correctamente');
      router.refresh();
      onEventCreated?.();
      onOpenChange?.(false);
      form.reset();
    } catch (error) {
      console.error('Event creation error:', error);
      toast.error(
        error instanceof Error ? error.message : 'Error al crear el evento'
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
    form.reset({
      title: '',
      description: '',
      type: 'OTHER',
      month: new Date().getMonth() + 1,
      day: new Date().getDate(),
      time: undefined,
      year: undefined,
    });
    onOpenChange?.(false);
  };

  return (
    <Sheet open={open} onOpenChange={handleSheetClose}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Crear nuevo evento</SheetTitle>
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
                      {Object.values(EventTypeSchema.Values).map((type) => (
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
                      value={selectedDate}
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
                    Creando evento...
                  </>
                ) : (
                  'Crear evento'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
