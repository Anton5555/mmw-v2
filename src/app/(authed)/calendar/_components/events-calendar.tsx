'use client';

import * as React from 'react';
import { useCallback, useMemo, useState, useEffect } from 'react';
import {
  getMonth,
  getYear,
  setMonth as setMonthFns,
  setYear,
  addMonths,
  subMonths,
} from 'date-fns';
import { ChevronLeftIcon, ChevronRightIcon, Plus } from 'lucide-react';
import { DayPicker, DayProps, Matcher, TZDate } from 'react-day-picker';

import { cn } from '@/lib/utils';
import { Button, buttonVariants } from '@/components/ui/button';
import { es } from 'react-day-picker/locale';
import { CreateEventSheet } from './create-event-dialog';
import { MonthYearPicker } from '@/components/month-year-picker';
import type { Event } from '@prisma/client';
import { EVENT_COLORS, EVENT_ICONS } from '@/lib/utils/constants';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useEventsParams } from '@/lib/hooks/useEventsParams';

export type CalendarProps = Omit<
  React.ComponentProps<typeof DayPicker>,
  'mode'
>;

export type EventsCalendarProps = {
  min?: Date;
  max?: Date;
  timezone?: string;
  events: Event[];
};

const DayContent = ({
  dayProps,
  events,
}: {
  dayProps: Pick<DayProps, 'className' | 'style' | 'modifiers'>;
  events: Event[];
}) => (
  <div className="relative w-full h-full">
    <span
      {...dayProps}
      className={cn(
        dayProps.className,
        'w-full h-full inline-flex items-center justify-center',
        'lg:h-full'
      )}
    />
    {events.length > 0 && (
      <div className="absolute inset-x-0 bottom-0.5 flex items-center justify-center lg:bottom-2">
        <div className="flex items-center gap-0.5 lg:gap-1">
          {events.slice(0, 3).map((event) => (
            <div
              key={event.id}
              className={cn(
                'w-1.5 h-1.5 rounded-full lg:w-2 lg:h-2',
                `bg-${EVENT_COLORS[event.type]}`
              )}
            />
          ))}
          {events.length > 3 && (
            <span className="text-[10px] leading-none flex items-center lg:text-xs text-muted-foreground font-medium translate-y-[1px]">
              +{events.length - 3}
            </span>
          )}
        </div>
      </div>
    )}
  </div>
);

const EventPopoverContent = ({
  events,
  onCreateEvent,
}: {
  events: Event[];
  onCreateEvent: () => void;
}) => (
  <div className="space-y-4">
    <div className="space-y-2">
      {events.length > 0
        ? events.map((event) => (
            <div key={event.id} className="flex items-start gap-2">
              {(() => {
                const Icon = EVENT_ICONS[event.type];
                return (
                  <Icon
                    className={cn(
                      'w-4 h-4 mt-1',
                      `text-${EVENT_COLORS[event.type]}`
                    )}
                  />
                );
              })()}

              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">{event.title}</h4>
                  {event.time && (
                    <span className="text-sm text-muted-foreground">
                      {event.time.toLocaleTimeString('es', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false,
                      })}
                    </span>
                  )}
                </div>
                {event.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {event.description}
                  </p>
                )}
              </div>
            </div>
          ))
        : 'No hay eventos en este día'}
    </div>
    <Button variant="outline" className="w-full" onClick={onCreateEvent}>
      <Plus className="w-4 h-4 mr-2" />
      Agregar evento
    </Button>
  </div>
);

export function EventsCalendar({
  min,
  max,
  timezone,
  events,
  ...props
}: EventsCalendarProps & CalendarProps) {
  const {
    month: monthParam,
    year: yearParam,
    setEventsParams,
  } = useEventsParams();

  const initDate = useMemo(() => {
    const now = new Date();
    const initialMonth = monthParam ? monthParam - 1 : now.getMonth();
    const initialYear = yearParam ? yearParam : now.getFullYear();
    const initialDate = new Date(initialYear, initialMonth);
    return new TZDate(initialDate, timezone);
  }, [monthParam, yearParam, timezone]);

  const [month, setMonth] = useState<Date>(initDate);
  const [isCreateEventOpen, setIsCreateEventOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>();

  // Update URL when month changes
  useEffect(() => {
    const monthNumber = getMonth(month) + 1;
    const yearNumber = getYear(month);

    setEventsParams({ month: monthNumber, year: yearNumber });
  }, [month, setEventsParams]);

  const endMonth = useMemo(() => {
    return setYear(month, getYear(month) + 1);
  }, [month]);

  const minDate = useMemo(
    () => (min ? new TZDate(min, timezone) : undefined),
    [min, timezone]
  );
  const maxDate = useMemo(
    () => (max ? new TZDate(max, timezone) : undefined),
    [max, timezone]
  );

  const onNextMonth = useCallback(() => {
    setMonth(addMonths(month, 1));
  }, [month]);

  const onPrevMonth = useCallback(() => {
    setMonth(subMonths(month, 1));
  }, [month]);

  const handleMonthChange = (value: string) => {
    const newMonth = parseInt(value, 10);
    let newDate = setMonthFns(month, newMonth - 1); // Adjust for 0-based months

    if (minDate && newDate < minDate) {
      newDate = setYear(newDate, getYear(minDate));
    }

    if (maxDate && newDate > maxDate) {
      newDate = setYear(newDate, getYear(maxDate));
    }

    setMonth(newDate);
  };

  const handleYearChange = (value: string) => {
    const newYear = parseInt(value, 10);
    let newDate = setYear(month, newYear);

    if (minDate && newDate < minDate) {
      newDate = setMonthFns(newDate, getMonth(minDate));
    }

    if (maxDate && newDate > maxDate) {
      newDate = setMonthFns(newDate, getMonth(maxDate));
    }

    setMonth(newDate);
  };

  return (
    <div className="container mx-auto max-w-7xl p-4">
      <div className="lg:rounded-lg lg:border bg-card lg:p-6 shadow-sm">
        <div className="flex items-center justify-between mb-2 lg:mb-8">
          <MonthYearPicker
            month={month}
            handleMonthChange={handleMonthChange}
            handleYearChange={handleYearChange}
            minDate={minDate}
            maxDate={maxDate}
          />

          <div className="flex space-x-2">
            <Button variant="ghost" size="icon" onClick={onPrevMonth}>
              <ChevronLeftIcon />
            </Button>

            <Button variant="ghost" size="icon" onClick={onNextMonth}>
              <ChevronRightIcon />
            </Button>
          </div>
        </div>

        <div className="relative overflow-hidden">
          <DayPicker
            timeZone={timezone}
            mode="single"
            selected={selectedDate}
            locale={es}
            month={month}
            endMonth={endMonth}
            disabled={
              [
                max ? { after: max } : null,
                min ? { before: min } : null,
              ].filter(Boolean) as Matcher[]
            }
            onMonthChange={setMonth}
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
                  <td className="relative h-10 lg:h-24">
                    <Popover open={open} onOpenChange={setOpen}>
                      <PopoverTrigger asChild>
                        <div
                          role="button"
                          tabIndex={0}
                          className="w-full h-full cursor-pointer hover:bg-accent/90 hover:text-accent-foreground rounded-md"
                          onClick={(e: React.MouseEvent) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setOpen(true);
                          }}
                        >
                          <DayContent
                            dayProps={{
                              ...dayProps,
                              className: cn(
                                dayProps.className,
                                'pointer-events-none'
                              ),
                            }}
                            events={dayEvents}
                          />
                        </div>
                      </PopoverTrigger>

                      <PopoverContent className="w-80">
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
              weekdays: 'flex justify-between mt-8',
              weekday:
                'text-muted-foreground rounded-md w-10 lg:w-24 font-normal capitalize',
              week: 'flex w-full justify-between mt-6',
              day: 'h-10 w-10 lg:h-24 lg:w-24 text-center text-sm p-0 relative flex flex-col items-center justify-start overflow-visible [&:has([aria-selected])]:bg-accent focus-within:relative focus-within:z-20',
              day_button: cn(
                buttonVariants({ variant: 'ghost' }),
                'h-10 w-10 lg:size-24 p-0 font-normal aria-selected:opacity-100'
              ),
              selected:
                'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground',
              today:
                'bg-accent/30 text-accent-foreground hover:bg-accent/90 rounded-md',
              outside:
                'day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30',
              disabled: 'text-muted-foreground opacity-50',
              hidden: 'invisible',
            }}
            showOutsideDays={true}
            {...props}
          />
        </div>
      </div>

      <CreateEventSheet
        selectedDate={selectedDate}
        open={isCreateEventOpen}
        onOpenChange={setIsCreateEventOpen}
      />
    </div>
  );
}
