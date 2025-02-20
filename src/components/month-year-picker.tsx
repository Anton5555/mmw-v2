import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { es } from 'date-fns/locale';
import {
  format,
  getMonth,
  getYear,
  startOfMonth,
  setMonth as setMonthFns,
  endOfMonth,
  startOfYear,
  endOfYear,
  setYear,
} from 'date-fns';
import { useMemo } from 'react';

type MonthYearPickerProps = {
  month: Date;
  handleMonthChange: (value: string) => void;
  handleYearChange: (value: string) => void;
  minDate?: Date;
  maxDate?: Date;
};

export function MonthYearPicker({
  month,
  handleMonthChange,
  handleYearChange,
  minDate,
  maxDate,
}: MonthYearPickerProps) {
  const months = useMemo(() => {
    const months = [];
    for (let i = 0; i < 12; i++) {
      let disabled = false;
      const startM = startOfMonth(setMonthFns(month, i));
      const endM = endOfMonth(setMonthFns(month, i));

      if (minDate && endM < minDate) disabled = true;
      if (maxDate && startM > maxDate) disabled = true;

      months.push({
        value: i,
        label: format(new Date(0, i), 'MMMM', { locale: es }),
        disabled,
      });
    }
    return months;
  }, [month, minDate, maxDate]);

  const years = useMemo(() => {
    const years = [];
    const currentYear = new Date().getFullYear();
    for (let i = currentYear; i <= currentYear + 5; i++) {
      let disabled = false;
      const startY = startOfYear(setYear(month, i));
      const endY = endOfYear(setYear(month, i));

      if (minDate && endY < minDate) disabled = true;
      if (maxDate && startY > maxDate) disabled = true;

      years.push({
        value: i,
        label: i.toString(),
        disabled,
      });
    }
    return years;
  }, [month, minDate, maxDate]);

  return (
    <div className="text-md font-bold ms-2 flex items-center gap-2">
      <Select
        value={getMonth(month).toString()}
        onValueChange={handleMonthChange}
      >
        <SelectTrigger className="lg:w-[180px] capitalize">
          <SelectValue>{format(month, 'MMMM', { locale: es })}</SelectValue>
        </SelectTrigger>

        <SelectContent>
          {months.map((month) => (
            <SelectItem
              key={month.value}
              value={month.value.toString()}
              disabled={month.disabled}
              className="capitalize"
            >
              {month.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={getYear(month).toString()}
        onValueChange={handleYearChange}
      >
        <SelectTrigger className="w-[120px]">
          <SelectValue>{format(month, 'yyyy', { locale: es })}</SelectValue>
        </SelectTrigger>

        <SelectContent>
          {years.map((year) => (
            <SelectItem
              key={year.value}
              value={year.value.toString()}
              disabled={year.disabled}
            >
              {year.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
