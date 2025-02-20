import { getMonthEvents } from '@/lib/api/events';
import { loadEventsSearchParams } from '@/lib/searchParams';
import { SearchParams } from 'nuqs/server';
import { EVENT_COLORS } from '@/lib/utils/constants';
import { cn } from '@/lib/utils';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

import { EventsCalendar } from './_components/events-calendar';

type PageProps = {
  searchParams: Promise<SearchParams>;
};

export default async function CalendarPage({ searchParams }: PageProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const isAdmin = session?.user.role === 'admin';

  if (!isAdmin) {
    return (
      <div className="container mx-auto lg:px-4 pb-8 pt-4 flex flex-col items-center justify-center min-h-[50vh]">
        <h2 className="text-2xl font-semibold text-center mb-4">
          Muy pronto...
        </h2>
        <p className="text-muted-foreground text-center">
          Esta sección estará disponible próximamente.
        </p>
      </div>
    );
  }

  const { month, year } = await loadEventsSearchParams(searchParams);

  const events = await getMonthEvents({
    month,
    year,
  });

  return (
    <div className="container mx-auto lg:px-4 pb-8 pt-4">
      <div className="mx-auto">
        <EventsCalendar events={events} />
      </div>

      <div className="flex flex-wrap gap-4 items-center justify-center bg-card p-4 rounded-lg shadow-sm">
        {Object.entries(EVENT_COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-2">
            <div className={cn('w-3 h-3 rounded-full', `bg-${color}`)} />

            <span className="text-sm text-muted-foreground">
              {type === 'BIRTHDAY'
                ? 'Cumpleaños'
                : type === 'ANNIVERSARY'
                ? 'Aniversario'
                : type === 'DISCORD'
                ? 'Evento de Discord'
                : type === 'IN_PERSON'
                ? 'Evento presencial'
                : 'Otro'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
