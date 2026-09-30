import { getMonthEvents } from '@/lib/api/events';
import { EventsCalendar } from './events-calendar';

interface EventsGridProps {
  month: number;
  year: number;
  timezone?: string;
  min?: Date;
  max?: Date;
}

export async function EventsGrid({
  month,
  year,
  timezone,
  min,
  max,
}: EventsGridProps) {
  const events = await getMonthEvents({ month, year });

  return (
    <EventsCalendar
      events={events}
      timezone={timezone}
      min={min}
      max={max}
    />
  );
}
