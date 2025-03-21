import { EVENT_COLORS } from '@/lib/utils/constants';
import { cn } from '@/lib/utils';
import { EventsCalendar } from './_components/events-calendar';
import { NextEvents } from './_components/next-events';
import { getNextEvents } from '@/lib/api/events';
import { ChevronDown } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

export default async function CalendarPage() {
  const nextEvents = await getNextEvents();

  return (
    <div className="container mx-auto lg:px-4 pb-8 pt-4">
      <div className="lg:grid lg:grid-cols-4 lg:gap-6">
        <div className="lg:col-span-1 mb-6 lg:mb-0">
          <div className="hidden lg:block bg-card rounded-lg border shadow-sm p-6 h-full">
            <NextEvents events={nextEvents} />
          </div>

          <div className="lg:hidden">
            <Collapsible
              className="bg-card rounded-none border-b border-t"
              defaultOpen={true}
            >
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-lg font-semibold">Próximos Eventos</h2>
                <CollapsibleTrigger className="rounded-none h-8 w-8 inline-flex items-center justify-center transition-colors hover:bg-accent hover:text-accent-foreground">
                  <ChevronDown className="h-4 w-4 transition-transform duration-200 data-[state=open]:rotate-180" />
                  <span className="sr-only">Toggle events</span>
                </CollapsibleTrigger>
              </div>
              <CollapsibleContent>
                <div className="p-4">
                  <NextEvents events={nextEvents} showTitle={false} />
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </div>

        <div className="lg:col-span-3">
          <EventsCalendar />
        </div>
      </div>

      <div className="flex flex-wrap gap-4 items-center justify-center bg-card p-4 rounded-lg shadow-sm mt-6">
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
