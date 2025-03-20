import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import { EVENT_COLORS, EVENT_ICONS } from '@/lib/utils/constants';
import { cn } from '@/lib/utils';
import type { Event } from '@prisma/client';

type NextEventsProps = {
  events: Event[];
  showTitle?: boolean;
};

export function NextEvents({ events, showTitle = true }: NextEventsProps) {
  const formatEventDate = (event: Event) => {
    const year = event.year || new Date().getFullYear();
    const eventDate = new Date(year, event.month - 1, event.day);

    return format(eventDate, 'd MMMM yyyy', { locale: es });
  };

  if (events.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        No hay próximos eventos
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showTitle && <h2 className="text-lg font-semibold">Próximos Eventos</h2>}
      <div className="space-y-4">
        {events.map((event) => {
          const Icon = EVENT_ICONS[event.type];

          return (
            <div
              key={event.id}
              className="flex items-start gap-3 p-3 rounded-md hover:bg-accent/50 transition-colors"
            >
              <div
                className={cn(
                  'rounded-full p-2',
                  `bg-${EVENT_COLORS[event.type]}/10`
                )}
              >
                <Icon
                  className={cn('w-5 h-5', `text-${EVENT_COLORS[event.type]}`)}
                />
              </div>

              <div className="flex-1">
                <h3 className="font-medium">{event.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {formatEventDate(event)}
                </p>
                {event.time && (
                  <p className="text-sm text-muted-foreground">
                    {event.time.toLocaleTimeString('es', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false,
                    })}
                  </p>
                )}
                {event.description && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {event.description}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
