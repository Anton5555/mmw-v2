import { Button, buttonVariants } from '@/components/ui/button';
import type { CalendarProps } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { add, format } from 'date-fns';
import { type Locale, es } from 'date-fns/locale';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Clock } from 'lucide-react';
import * as React from 'react';
import { useImperativeHandle, useRef } from 'react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DayPicker } from 'react-day-picker';

// ---------- utils start ----------
/**
 * regular expression to check for valid hour format (01-23)
 */
function isValidHour(value: string) {
  return /^(0[0-9]|1[0-9]|2[0-3])$/.test(value);
}

/**
 * regular expression to check for valid minute format (00-59)
 */
function isValidMinuteOrSecond(value: string) {
  return /^[0-5][0-9]$/.test(value);
}

type GetValidNumberConfig = { max: number; min?: number; loop?: boolean };

function getValidNumber(
  value: string,
  { max, min = 0, loop = false }: GetValidNumberConfig
) {
  let numericValue = parseInt(value, 10);

  if (!Number.isNaN(numericValue)) {
    if (!loop) {
      if (numericValue > max) numericValue = max;
      if (numericValue < min) numericValue = min;
    } else {
      if (numericValue > max) numericValue = min;
      if (numericValue < min) numericValue = max;
    }
    return numericValue.toString().padStart(2, '0');
  }

  return '00';
}

function getValidHour(value: string) {
  if (isValidHour(value)) return value;
  return getValidNumber(value, { max: 23 });
}

function getValidMinuteOrSecond(value: string) {
  if (isValidMinuteOrSecond(value)) return value;
  return getValidNumber(value, { max: 59 });
}

type GetValidArrowNumberConfig = {
  min: number;
  max: number;
  step: number;
};

function getValidArrowNumber(
  value: string,
  { min, max, step }: GetValidArrowNumberConfig
) {
  let numericValue = parseInt(value, 10);

  if (!Number.isNaN(numericValue)) {
    numericValue += step;
    return getValidNumber(String(numericValue), { min, max, loop: true });
  }

  return '00';
}

function getValidArrowHour(value: string, step: number) {
  return getValidArrowNumber(value, { min: 0, max: 23, step });
}

function getValidArrowMinuteOrSecond(value: string, step: number) {
  return getValidArrowNumber(value, { min: 0, max: 59, step });
}

function setMinutes(date: Date, value: string) {
  const minutes = getValidMinuteOrSecond(value);
  date.setMinutes(parseInt(minutes, 10));
  return date;
}

function setHours(date: Date, value: string) {
  const hours = getValidHour(value);
  date.setHours(parseInt(hours, 10));
  return date;
}

type TimePickerType = 'minutes' | 'hours';

function setDateByType(date: Date, value: string, type: TimePickerType) {
  switch (type) {
    case 'minutes':
      return setMinutes(date, value);
    case 'hours':
      return setHours(date, value);
    default:
      return date;
  }
}

function getDateByType(date: Date | null, type: TimePickerType) {
  if (!date) return '00';
  switch (type) {
    case 'minutes':
      return getValidMinuteOrSecond(String(date.getMinutes()));
    case 'hours':
      return getValidHour(String(date.getHours()));
    default:
      return '00';
  }
}

function getArrowByType(value: string, step: number, type: TimePickerType) {
  switch (type) {
    case 'minutes':
      return getValidArrowMinuteOrSecond(value, step);
    case 'hours':
      return getValidArrowHour(value, step);
    default:
      return '00';
  }
}

function genMonths(
  locale: Pick<Locale, 'options' | 'localize' | 'formatLong'>
) {
  return Array.from({ length: 12 }, (_, i) => ({
    value: i,
    label: format(new Date(2021, i), 'MMMM', { locale }),
  }));
}

function genYears(yearRange = 50) {
  const today = new Date();
  return Array.from({ length: yearRange * 2 + 1 }, (_, i) => ({
    value: today.getFullYear() - yearRange + i,
    label: (today.getFullYear() - yearRange + i).toString(),
  }));
}

// ---------- utils end ----------

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  yearRange = 5,
  ...props
}: CalendarProps & { yearRange?: number }) {
  let locale: Pick<Locale, 'options' | 'localize' | 'formatLong'> = es;

  const { options, localize, formatLong } = props.locale || {};

  if (options && localize && formatLong) {
    locale = {
      options,
      localize,
      formatLong,
    };
  }

  const MONTHS = genMonths(locale);
  const YEARS = genYears(yearRange);

  const disableLeftNavigation = () => {
    const today = new Date();
    const startDate = new Date(today.getFullYear() - yearRange, 0, 1);

    if (props.month) {
      return (
        props.month.getMonth() === startDate.getMonth() &&
        props.month.getFullYear() === startDate.getFullYear()
      );
    }

    return false;
  };

  const disableRightNavigation = () => {
    const today = new Date();
    const endDate = new Date(today.getFullYear() + yearRange, 11, 31);

    if (props.month) {
      return (
        props.month.getMonth() === endDate.getMonth() &&
        props.month.getFullYear() === endDate.getFullYear()
      );
    }

    return false;
  };

  return (
    <DayPicker
      locale={es}
      showOutsideDays={showOutsideDays}
      className={cn('p-3 pointer-events-auto', className)}
      classNames={{
        months:
          'flex flex-col sm:flex-row space-y-4  sm:space-y-0 justify-center',
        month: 'flex flex-col items-center space-y-4',
        month_caption: 'flex justify-center pt-1 relative items-center',
        caption_label: 'text-sm font-medium',
        nav: 'space-x-1 flex items-center ',
        button_previous: cn(
          buttonVariants({ variant: 'outline' }),
          'h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 absolute left-5 top-5',
          disableLeftNavigation() && 'pointer-events-none'
        ),
        button_next: cn(
          buttonVariants({ variant: 'outline' }),
          'h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 absolute right-5 top-5',
          disableRightNavigation() && 'pointer-events-none'
        ),
        month_grid: 'w-full border-collapse space-y-1',
        weekdays: cn('flex', props.showWeekNumber && 'justify-end'),
        weekday:
          'text-muted-foreground rounded-md w-9 font-normal text-[0.8rem] capitalize',
        week: 'flex w-full mt-2',
        day: 'h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20 rounded-1',
        day_button: cn(
          buttonVariants({ variant: 'ghost' }),
          'h-9 w-9 p-0 font-normal aria-selected:opacity-100 rounded-l-md rounded-r-md'
        ),
        range_end: 'day-range-end',
        selected:
          'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground rounded-l-md rounded-r-md',
        today: 'bg-accent text-accent-foreground',
        outside:
          'day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30',
        disabled: 'text-muted-foreground opacity-50',
        range_middle:
          'aria-selected:bg-accent aria-selected:text-accent-foreground',
        hidden: 'invisible',
        ...classNames,
      }}
      components={{
        Chevron: ({ ...props }) =>
          props.orientation === 'left' ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          ),
        MonthCaption: ({ calendarMonth }) => {
          return (
            <div className="inline-flex gap-2">
              <Select
                defaultValue={calendarMonth.date.getMonth().toString()}
                onValueChange={(value) => {
                  const newDate = new Date(calendarMonth.date);
                  newDate.setMonth(Number.parseInt(value, 10));
                  props.onMonthChange?.(newDate);
                }}
              >
                <SelectTrigger className="w-fit gap-1 border-none p-0 focus:bg-accent focus:text-accent-foreground capitalize">
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  {MONTHS.map((month) => (
                    <SelectItem
                      key={month.value}
                      value={month.value.toString()}
                      className="capitalize"
                    >
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                defaultValue={calendarMonth.date.getFullYear().toString()}
                onValueChange={(value) => {
                  const newDate = new Date(calendarMonth.date);
                  newDate.setFullYear(Number.parseInt(value, 10));
                  props.onMonthChange?.(newDate);
                }}
              >
                <SelectTrigger className="w-fit gap-1 border-none p-0 focus:bg-accent focus:text-accent-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {YEARS.map((year) => (
                    <SelectItem key={year.value} value={year.value.toString()}>
                      {year.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          );
        },
      }}
      {...props}
    />
  );
}
Calendar.displayName = 'Calendar';

interface TimePickerInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  picker: TimePickerType;
  date?: Date | null;
  onDateChange?: (date: Date | undefined) => void;
  onRightFocus?: () => void;
  onLeftFocus?: () => void;
}

const TimePickerInput = React.forwardRef<
  HTMLInputElement,
  TimePickerInputProps
>(
  (
    {
      className,
      type = 'tel',
      value,
      id,
      name,
      date = new Date(new Date().setHours(0, 0, 0, 0)),
      onDateChange,
      onChange,
      onKeyDown,
      picker,
      onLeftFocus,
      onRightFocus,
      ...props
    },
    ref
  ) => {
    const [flag, setFlag] = React.useState<boolean>(false);

    /**
     * allow the user to enter the second digit within 2 seconds
     * otherwise start again with entering first digit
     */
    React.useEffect(() => {
      if (flag) {
        const timer = setTimeout(() => {
          setFlag(false);
        }, 2000);

        return () => clearTimeout(timer);
      }
    }, [flag]);

    const calculatedValue = getDateByType(date, picker);

    const calculateNewValue = (key: string) =>
      !flag ? `0${key}` : calculatedValue.slice(1, 2) + key;

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Tab') return;
      e.preventDefault();

      if (e.key === 'ArrowRight') onRightFocus?.();
      if (e.key === 'ArrowLeft') onLeftFocus?.();

      if (['ArrowUp', 'ArrowDown'].includes(e.key)) {
        const step = e.key === 'ArrowUp' ? 1 : -1;
        const newValue = getArrowByType(calculatedValue, step, picker);
        if (flag) setFlag(false);
        const tempDate = date ? new Date(date) : new Date();
        onDateChange?.(setDateByType(tempDate, newValue, picker));
      }

      if (e.key >= '0' && e.key <= '9') {
        const newValue = calculateNewValue(e.key);
        if (flag) onRightFocus?.();
        setFlag((prev) => !prev);
        const tempDate = date ? new Date(date) : new Date();
        onDateChange?.(setDateByType(tempDate, newValue, picker));
      }
    };

    return (
      <Input
        ref={ref}
        id={id || picker}
        name={name || picker}
        className={cn(
          'w-[48px] text-center font-mono text-base tabular-nums caret-transparent focus:bg-accent focus:text-accent-foreground [&::-webkit-inner-spin-button]:appearance-none',
          className
        )}
        value={value || calculatedValue}
        onChange={(e) => {
          e.preventDefault();
          onChange?.(e);
        }}
        type={type}
        inputMode="decimal"
        onKeyDown={(e) => {
          onKeyDown?.(e);
          handleKeyDown(e);
        }}
        {...props}
      />
    );
  }
);

TimePickerInput.displayName = 'TimePickerInput';

interface TimePickerProps {
  date?: Date | null;
  onChange?: (date: Date | undefined) => void;
}

interface TimePickerRef {
  minuteRef: HTMLInputElement | null;
  hourRef: HTMLInputElement | null;
}

const TimePicker = React.forwardRef<TimePickerRef, TimePickerProps>(
  ({ date, onChange }, ref) => {
    const minuteRef = React.useRef<HTMLInputElement>(null);
    const hourRef = React.useRef<HTMLInputElement>(null);

    useImperativeHandle(
      ref,
      () => ({
        minuteRef: minuteRef.current,
        hourRef: hourRef.current,
      }),
      [minuteRef, hourRef]
    );
    return (
      <div className="flex items-center justify-center gap-2">
        <label htmlFor="datetime-picker-hour-input" className="cursor-pointer">
          <Clock className="mr-2 h-4 w-4" />
        </label>

        <TimePickerInput
          picker={'hours'}
          date={date}
          id="datetime-picker-hour-input"
          onDateChange={onChange}
          ref={hourRef}
          onRightFocus={() => minuteRef?.current?.focus()}
        />

        <TimePickerInput
          picker="minutes"
          date={date}
          onDateChange={onChange}
          ref={minuteRef}
          onLeftFocus={() => hourRef?.current?.focus()}
        />
      </div>
    );
  }
);
TimePicker.displayName = 'TimePicker';

type DateTimePickerProps = {
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  disabled?: boolean;
  placeholder?: string;
  /**
   * The year range will be: `This year + yearRange` and `this year - yearRange`.
   * Default is 50.
   * For example:
   * This year is 2024, The year dropdown will be 1974 to 2024 which is generated by `2024 - 50 = 1974` and `2024 + 50 = 2074`.
   * */
  yearRange?: number;
  className?: string;
  /**
   * Show the default month and time when popup the calendar. Default is the current Date().
   **/
  defaultPopupValue?: Date;
  /**
   * Show the time picker. Default is true.
   **/
  displayTime?: boolean;
} & Pick<
  CalendarProps,
  'locale' | 'weekStartsOn' | 'showWeekNumber' | 'showOutsideDays'
>;

type DateTimePickerRef = {
  value?: Date;
} & Omit<HTMLButtonElement, 'value'>;

const DateTimePicker = React.forwardRef<
  Partial<DateTimePickerRef>,
  DateTimePickerProps
>(
  (
    {
      locale = es,
      defaultPopupValue = new Date(new Date().setHours(0, 0, 0, 0)),
      value,
      onChange,
      yearRange = 50,
      disabled = false,
      placeholder = 'Selecciona una fecha',
      className,
      displayTime = true,
      ...props
    },
    ref
  ) => {
    const [month, setMonth] = React.useState<Date>(value ?? defaultPopupValue);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const [displayDate, setDisplayDate] = React.useState<Date | undefined>(
      value ?? undefined
    );
    /**
     * carry over the current time when a user clicks a new day
     * instead of resetting to 00:00
     */
    const handleSelect = (newDay: Date | undefined) => {
      if (!newDay) return;

      if (!defaultPopupValue) {
        newDay.setHours(month?.getHours() ?? 0, month?.getMinutes() ?? 0);

        onChange?.(newDay);
        setMonth(newDay);
        return;
      }

      const diff = newDay.getTime() - defaultPopupValue.getTime();
      const diffInDays = diff / (1000 * 60 * 60 * 24);

      const newDateFull = add(defaultPopupValue, {
        days: Math.ceil(diffInDays),
      });

      newDateFull.setHours(month?.getHours() ?? 0, month?.getMinutes() ?? 0);

      onChange?.(newDateFull);
      setMonth(newDateFull);
    };

    const onSelect = (newDay?: Date) => {
      if (!newDay) return;

      onChange?.(newDay);
      setMonth(newDay);
      setDisplayDate(newDay);
    };

    useImperativeHandle(
      ref,
      () => ({
        ...buttonRef.current,
        value: displayDate,
      }),
      [displayDate]
    );

    const initHourFormat = displayTime ? 'PPP HH:mm' : "dd 'de' MMMM";

    let loc = es;
    const { options, localize, formatLong } = locale;
    if (options && localize && formatLong) {
      loc = {
        ...es,
        options,
        localize,
        formatLong,
      };
    }

    return (
      <Popover>
        <PopoverTrigger asChild disabled={disabled}>
          <Button
            variant="outline"
            className={cn(
              'w-full justify-start text-left font-normal min-w-0',
              !displayDate && 'text-muted-foreground',
              className
            )}
            ref={buttonRef}
          >
            <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
            {displayDate ? (
              <span className="truncate">
                {format(displayDate, initHourFormat, {
                  locale: loc,
                })}
              </span>
            ) : (
              <span className="truncate">{placeholder}</span>
            )}
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-auto p-0">
          <Calendar
            mode="single"
            selected={displayDate}
            month={month}
            onSelect={(newDate) => {
              if (newDate) {
                newDate.setHours(
                  month?.getHours() ?? 0,
                  month?.getMinutes() ?? 0
                );

                onSelect(newDate);
              }
            }}
            onMonthChange={handleSelect}
            yearRange={yearRange}
            locale={locale}
            {...props}
          />
          {displayTime && (
            <div className="border-t border-border p-3">
              <TimePicker
                onChange={(value) => {
                  onChange?.(value);
                  setDisplayDate(value);
                  if (value) {
                    setMonth(value);
                  }
                }}
                date={month}
              />
            </div>
          )}
        </PopoverContent>
      </Popover>
    );
  }
);

DateTimePicker.displayName = 'DateTimePicker';

export { DateTimePicker, TimePickerInput, TimePicker };
export type { TimePickerType, DateTimePickerProps, DateTimePickerRef };
