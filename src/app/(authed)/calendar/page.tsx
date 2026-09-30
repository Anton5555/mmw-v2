import { Suspense } from 'react';
import { EVENT_COLORS } from '@/lib/utils/constants';
import { cn } from '@/lib/utils';
import { EventsGrid } from './_components/events-grid';
import { EventsCalendarSkeleton } from './_components/events-calendar-skeleton';
import { NextEvents } from './_components/next-events';
import { getNextEvents } from '@/lib/api/events';
import { loadEventsSearchParams } from '@/lib/searchParams';
import { ChevronDown } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface CalendarPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function CalendarPage({ searchParams }: CalendarPageProps) {
  const params = await loadEventsSearchParams(searchParams);
  const nextEvents = await getNextEvents();

  const suspenseKey = `${params.month}-${params.year}`;

  return (
    <div className="container mx-auto px-4 pb-8 pt-4">
      {/* Side-by-side only when there is real room (the sidebar eats ~256px,
          so a viewport breakpoint like lg leaves the events column too thin) */}
      <div className="grid items-start gap-6 xl:grid-cols-[20rem_minmax(0,1fr)]">
        <aside className="min-w-0">
          <div className="hidden rounded-xl border border-white/10 bg-zinc-900/40 p-5 xl:sticky xl:top-20 xl:block">
            <NextEvents events={nextEvents} />
          </div>

          <Collapsible
            className="rounded-xl border border-white/10 bg-zinc-900/40 xl:hidden"
            defaultOpen
          >
            <div className="flex items-center justify-between gap-3 px-4 py-2">
              <h2 className="text-base font-semibold tracking-tight">
                Próximos eventos
              </h2>
              <CollapsibleTrigger className="group inline-flex size-10 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-white/5 hover:text-white active:scale-[0.95]">
                <ChevronDown className="size-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                <span className="sr-only">Mostrar u ocultar eventos</span>
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent>
              <div className="border-t border-white/10 p-4">
                <NextEvents events={nextEvents} showTitle={false} />
              </div>
            </CollapsibleContent>
          </Collapsible>
        </aside>

        <div className="min-w-0">
          <Suspense key={suspenseKey} fallback={<EventsCalendarSkeleton />}>
            <EventsGrid month={params.month} year={params.year} />
          </Suspense>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 rounded-xl border border-white/10 bg-zinc-900/40 px-4 py-3">
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
