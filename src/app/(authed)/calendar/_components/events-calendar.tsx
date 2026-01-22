'use client';

import * as React from 'react';
import { useState } from 'react';
import {
  getMonth,
  getYear,
  setMonth as setMonthFns,
  setYear,
  addMonths,
  subMonths,
} from 'date-fns';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  Plus,
  Pencil,
  Trash2,
} from 'lucide-react';
import { DayPicker, DayProps, Matcher, TZDate } from 'react-day-picker';

import { cn } from '@/lib/utils';
import { Button, buttonVariants } from '@/components/ui/button';
import { es } from 'react-day-picker/locale';
import { CreateEventSheet } from './create-event-dialog';
import { EditEventSheet } from './edit-event-dialog';
import { DeleteEventDialog } from './delete-event-dialog';
import { MonthYearPicker } from '@/components/month-year-picker';
import type { Event } from '@prisma/client';
import { EVENT_COLORS } from '@/lib/utils/constants';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useQueryStates } from 'nuqs';
import { eventsSearchParams } from '@/lib/searchParams';
import { useSession } from '@/lib/auth-client';

export type CalendarProps = Omit<
  React.ComponentProps<typeof DayPicker>,
  'mode'
>;

export type EventsCalendarProps = {
  events: Event[];
  min?: Date;
  max?: Date;
  timezone?: string;
};

// Color map for inline styles (since Tailwind doesn't support dynamic bg- classes)
const getColorClass = (color: string): string => {
  const colorMap: Record<string, string> = {
    'blue-500': 'bg-blue-500',
    'green-500': 'bg-green-500',
    'amber-500': 'bg-amber-500',
    'red-500': 'bg-red-500',
    'fuchsia-500': 'bg-fuchsia-500',
  };
  return colorMap[color] || 'bg-gray-500';
};

// Get glow shadow style for event bars
const getGlowStyle = (color: string): React.CSSProperties => {
  const glowMap: Record<string, string> = {
    'blue-500':
      '0 0 10px rgba(59, 130, 246, 0.5), 0 0 20px rgba(59, 130, 246, 0.3)',
    'green-500':
      '0 0 10px rgba(34, 197, 94, 0.5), 0 0 20px rgba(34, 197, 94, 0.3)',
    'amber-500':
      '0 0 10px rgba(245, 158, 11, 0.5), 0 0 20px rgba(245, 158, 11, 0.3)',
    'red-500':
      '0 0 10px rgba(239, 68, 68, 0.5), 0 0 20px rgba(239, 68, 68, 0.3)',
    'fuchsia-500':
      '0 0 10px rgba(217, 70, 239, 0.5), 0 0 20px rgba(217, 70, 239, 0.3)',
  };
  return { boxShadow: glowMap[color] || '0 0 10px rgba(156, 163, 175, 0.5)' };
};

const DayContent = ({
  dayProps,
  events,
}: {
  dayProps: Pick<DayProps, 'className' | 'style' | 'modifiers'> & {
    date?: Date;
  };
  events: Event[];
}) => {
  const dayDate = dayProps.date;
  const isToday = dayProps.modifiers.today;

  return (
    <div className="group relative flex h-full w-full flex-col items-center justify-center gap-1 p-2 lg:items-start lg:justify-start lg:p-3 overflow-hidden rounded-xl transition-all duration-300">
      {/* Date Label */}
      <span
        className={cn(
          'text-sm font-bold lg:text-xl transition-all duration-300 group-hover:translate-x-1 z-10',
          isToday ? 'text-yellow-500' : 'text-zinc-400 group-hover:text-white'
        )}
      >
        {isToday ? 'Hoy' : dayDate?.getDate() ?? ''}
      </span>

      {/* Event Glow Stack - Much thicker and more visible */}
      {events.length > 0 && (
        <div className="absolute inset-x-2 bottom-2 flex flex-col gap-1 lg:bottom-4 lg:inset-x-3 w-[calc(100%-1rem)] lg:w-[calc(100%-1.5rem)]">
          {events.slice(0, 3).map((event) => (
            <div
              key={event.id}
              className={cn(
                'h-1 w-full rounded-full transition-all duration-500 group-hover:h-1.5',
                getColorClass(EVENT_COLORS[event.type])
              )}
              style={getGlowStyle(EVENT_COLORS[event.type])}
            />
          ))}
          {events.length > 3 && (
            <p className="text-[10px] font-black text-zinc-600 uppercase tracking-tighter lg:text-[11px] mt-0.5">
              + {events.length - 3} más
            </p>
          )}
        </div>
      )}

      {/* Background Hover Aura */}
      <div
        className="absolute inset-0 -z-10 opacity-0 transition-opacity duration-500 group-hover:opacity-100 rounded-xl"
        style={{
          background:
            'radial-gradient(circle at center, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 50%, transparent 100%)',
        }}
      />
    </div>
  );
};

const EventPopoverContent = ({
  events,
  onCreateEvent,
}: {
  events: Event[];
  onCreateEvent: () => void;
}) => {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [deletingEvent, setDeletingEvent] = useState<Event | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  return (
    <>
      <div className="flex flex-col overflow-hidden rounded-xl shadow-2xl">
        {/* Premium Header */}
        <div className="bg-white/5 p-4 border-b border-white/10">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-yellow-500">
            Agenda del Día
          </h3>
        </div>

        {/* Events List */}
        <div className="max-h-[300px] overflow-y-auto p-2 space-y-2 custom-scrollbar">
          {events.length > 0 ? (
            events.map((event) => {
              const isOwner =
                currentUserId && event.createdBy === currentUserId;
              return (
                <div
                  key={event.id}
                  className="group relative rounded-lg bg-zinc-900/50 p-3 border border-white/5 hover:border-white/20 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'h-2 w-2 rounded-full shrink-0',
                        getColorClass(EVENT_COLORS[event.type])
                      )}
                    />
                    <h4 className="font-bold text-sm text-zinc-100 italic uppercase tracking-tighter flex-1">
                      {event.title}
                    </h4>
                  </div>
                  {event.time && (
                    <p className="mt-1 text-[10px] text-zinc-500 font-mono">
                      {event.time.toLocaleTimeString('es', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false,
                      })}
                    </p>
                  )}
                  {event.description && (
                    <p className="mt-1.5 text-xs text-zinc-400 line-clamp-2">
                      {event.description}
                    </p>
                  )}
                  {isOwner && (
                    <div className="flex gap-2 mt-3 pt-3 border-t border-white/5">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs hover:bg-white/10"
                        onClick={() => {
                          setEditingEvent(event);
                          setIsEditOpen(true);
                        }}
                      >
                        <Pencil className="w-3 h-3 mr-1" />
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        onClick={() => {
                          setDeletingEvent(event);
                          setIsDeleteOpen(true);
                        }}
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Eliminar
                      </Button>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <p className="py-8 text-center text-xs text-zinc-500 italic">
              No hay eventos programados.
            </p>
          )}
        </div>

        {/* Add Event Button */}
        <button
          onClick={onCreateEvent}
          className="flex items-center justify-center gap-2 bg-white p-4 text-[10px] font-black uppercase tracking-widest text-black transition-colors hover:bg-yellow-500"
        >
          <Plus className="h-4 w-4 stroke-[3px]" />
          Agregar Evento
        </button>
      </div>

      {editingEvent && (
        <EditEventSheet
          event={editingEvent}
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
        />
      )}

      <DeleteEventDialog
        event={deletingEvent}
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        onDeleted={() => {
          setDeletingEvent(null);
        }}
      />
    </>
  );
};

export function EventsCalendar({
  events,
  min,
  max,
  timezone,
  ...props
}: EventsCalendarProps & CalendarProps) {
  const [params, setParams] = useQueryStates(eventsSearchParams, {
    shallow: false,
  });

  const currentMonthDate = React.useMemo(
    () => new Date(params.year, params.month - 1),
    [params.month, params.year]
  );

  const monthDate = new TZDate(currentMonthDate, timezone);
  const [isCreateEventOpen, setIsCreateEventOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>();

  const endMonth = setYear(monthDate, getYear(monthDate) + 1);
  const minDate = min ? new TZDate(min, timezone) : undefined;
  const maxDate = max ? new TZDate(max, timezone) : undefined;

  const onNextMonth = () => {
    const next = addMonths(currentMonthDate, 1);
    setParams({ month: getMonth(next) + 1, year: getYear(next) });
  };

  const onPrevMonth = () => {
    const prev = subMonths(currentMonthDate, 1);
    setParams({ month: getMonth(prev) + 1, year: getYear(prev) });
  };

  const handleMonthChange = (value: string) => {
    const newMonth = parseInt(value, 10);
    let newDate = setMonthFns(currentMonthDate, newMonth);

    if (minDate && newDate < minDate) {
      newDate = setYear(newDate, getYear(minDate));
    }

    if (maxDate && newDate > maxDate) {
      newDate = setYear(newDate, getYear(maxDate));
    }

    setParams({ month: getMonth(newDate) + 1, year: getYear(newDate) });
  };

  const handleYearChange = (value: string) => {
    const newYear = parseInt(value, 10);
    let newDate = setYear(currentMonthDate, newYear);

    if (minDate && newDate < minDate) {
      newDate = setMonthFns(newDate, getMonth(minDate));
    }

    if (maxDate && newDate > maxDate) {
      newDate = setMonthFns(newDate, getMonth(maxDate));
    }

    setParams({ month: getMonth(newDate) + 1, year: getYear(newDate) });
  };

  return (
    <div className="relative min-h-[600px] overflow-hidden rounded-4xl border border-white/5 bg-zinc-950/50 p-4 backdrop-blur-xl lg:p-8 shadow-2xl">
      {/* Header Section */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <MonthYearPicker
            month={monthDate}
            handleMonthChange={handleMonthChange}
            handleYearChange={handleYearChange}
            minDate={minDate}
            maxDate={maxDate}
          />
        </div>

        <div className="flex items-center gap-2 bg-zinc-900/50 p-1 rounded-full border border-white/5">
          <Button
            variant="ghost"
            size="icon"
            onClick={onPrevMonth}
            className="rounded-full hover:bg-white/10"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </Button>
          <div className="h-4 w-px bg-white/10" />
          <Button
            variant="ghost"
            size="icon"
            onClick={onNextMonth}
            className="rounded-full hover:bg-white/10"
          >
            <ChevronRightIcon className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <DayPicker
        timeZone={timezone}
        mode="single"
        selected={selectedDate}
        locale={es}
        month={monthDate}
        endMonth={endMonth}
        disabled={
          [max ? { after: max } : null, min ? { before: min } : null].filter(
            Boolean
          ) as Matcher[]
        }
        onMonthChange={(date) =>
          setParams({ month: getMonth(date) + 1, year: getYear(date) })
        }
        components={{
          Day: ({ day, ...dayProps }) => {
            const dayEvents = events.filter((event) => {
              const monthMatches = event.month === day.date!.getMonth() + 1;
              const dayMatches = event.day === day.date!.getDate();
              const yearMatches =
                !event.year || event.year === day.date!.getFullYear();
              return monthMatches && dayMatches && yearMatches;
            });

            const handleCreateEvent = () => {
              setSelectedDate(day.date);
              setIsCreateEventOpen(true);
            };

            const [open, setOpen] = useState(false);

            return (
              <td className="relative w-full p-0">
                <Popover open={open} onOpenChange={setOpen}>
                  <PopoverTrigger asChild>
                    <div
                      role="button"
                      tabIndex={0}
                      className="group relative h-16 w-full lg:h-32 cursor-pointer outline-none"
                      onClick={(e: React.MouseEvent) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setOpen(true);
                      }}
                    >
                      <DayContent
                        dayProps={{
                          ...dayProps,
                          date: day.date,
                          className: cn(
                            dayProps.className,
                            'pointer-events-none'
                          ),
                        }}
                        events={dayEvents}
                      />
                    </div>
                  </PopoverTrigger>

                  <PopoverContent className="w-80 border-white/10 bg-zinc-950/95 p-0 backdrop-blur-xl">
                    <EventPopoverContent
                      events={dayEvents}
                      onCreateEvent={() => {
                        setOpen(false);
                        handleCreateEvent();
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </td>
            );
          },
        }}
        classNames={{
          root: 'w-full',
          dropdowns: 'flex w-full gap-2',
          months: 'flex w-full h-fit',
          month: 'flex flex-col w-full',
          month_caption: 'hidden',
          button_previous: 'hidden',
          button_next: 'hidden',
          month_grid: 'w-full border-collapse',
          weekdays: 'flex justify-between mb-4 border-b border-white/5 pb-2',
          weekday:
            'text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 w-full text-center',
          week: 'flex w-full justify-between gap-2 mt-2',
          day: 'h-16 w-full lg:h-32 text-center text-sm p-0 relative flex flex-col items-center justify-start overflow-hidden rounded-xl transition-all duration-300',
          day_button: cn(
            buttonVariants({ variant: 'ghost' }),
            'h-full w-full p-0 font-normal aria-selected:opacity-100'
          ),
          selected:
            'bg-white text-black font-bold shadow-[0_0_20px_rgba(255,255,255,0.3)]',
          today:
            'bg-yellow-500/10 text-yellow-500 font-bold ring-1 ring-inset ring-yellow-500/20',
          outside: 'opacity-20 grayscale pointer-events-none',
          disabled: 'text-zinc-600 opacity-50',
          hidden: 'invisible',
        }}
        showOutsideDays={true}
        {...props}
      />

      <CreateEventSheet
        selectedDate={selectedDate}
        open={isCreateEventOpen}
        onOpenChange={setIsCreateEventOpen}
      />
    </div>
  );
}
