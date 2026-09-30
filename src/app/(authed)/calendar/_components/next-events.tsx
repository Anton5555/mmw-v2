'use client';

import { useState } from 'react';
import { differenceInCalendarDays, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarX2, Pencil, Trash2 } from 'lucide-react';

import { EVENT_COLORS, EVENT_ICONS } from '@/lib/utils/constants';
import { cn } from '@/lib/utils';
import type { Event } from '@generated/prisma/client';
import { useSession } from '@/lib/auth-client';
import { EditEventSheet } from './edit-event-dialog';
import { DeleteEventDialog } from './delete-event-dialog';

type NextEventsProps = {
  events: Event[];
  showTitle?: boolean;
};

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

const getTextColorClass = (color: string): string => {
  const colorMap: Record<string, string> = {
    'blue-500': 'text-blue-500',
    'green-500': 'text-green-500',
    'amber-500': 'text-amber-500',
    'red-500': 'text-red-500',
    'fuchsia-500': 'text-fuchsia-500',
  };
  return colorMap[color] || 'text-gray-500';
};

export function NextEvents({ events, showTitle = true }: NextEventsProps) {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [deletingEvent, setDeletingEvent] = useState<Event | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  if (events.length === 0) {
    return (
      <div className="flex h-[160px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/10 bg-zinc-900/50">
        <CalendarX2 className="size-5 text-zinc-600" />
        <p className="text-sm text-zinc-500">No hay próximos eventos</p>
      </div>
    );
  }

  const today = new Date();

  return (
    <>
      <div className="space-y-4">
        {showTitle && (
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-base font-semibold tracking-tight text-white">
              Próximos eventos
            </h2>
            <span className="text-xs tabular-nums text-zinc-500">
              {events.length}
            </span>
          </div>
        )}

        {/* One column in the side panel, two when the list sits above the calendar */}
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
          {events.map((event) => {
            const Icon = EVENT_ICONS[event.type];
            const color = EVENT_COLORS[event.type];
            const isOwner = currentUserId && event.createdBy === currentUserId;

            // Yearly events (no year) have already happened this year once
            // their date passes; show them at their next occurrence.
            let eventDate = new Date(
              event.year || today.getFullYear(),
              event.month - 1,
              event.day
            );
            if (!event.year && differenceInCalendarDays(eventDate, today) < 0) {
              eventDate = new Date(
                today.getFullYear() + 1,
                event.month - 1,
                event.day
              );
            }
            const daysAway = differenceInCalendarDays(eventDate, today);
            const relative =
              daysAway === 0
                ? 'Hoy'
                : daysAway === 1
                ? 'Mañana'
                : daysAway <= 60
                ? `En ${daysAway} días`
                : null;

            return (
              <li
                key={event.id}
                className="group relative flex gap-3 overflow-hidden rounded-xl border border-white/10 bg-zinc-900/60 p-3 transition-colors hover:border-white/20 hover:bg-zinc-900"
              >
                <span
                  aria-hidden
                  className={cn(
                    'absolute inset-y-0 left-0 w-0.5',
                    getColorClass(color)
                  )}
                />

                <div className="flex size-12 shrink-0 flex-col items-center justify-center rounded-lg border border-white/10 bg-zinc-950">
                  <span className="text-[10px] font-medium uppercase leading-none tracking-wider text-zinc-500">
                    {format(eventDate, 'MMM', { locale: es })}
                  </span>
                  <span className="mt-0.5 text-lg font-semibold leading-none tabular-nums text-white">
                    {format(eventDate, 'dd')}
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-pretty text-sm font-semibold leading-snug tracking-tight text-white">
                      {event.title}
                    </h3>
                    <Icon
                      aria-hidden
                      className={cn(
                        'mt-0.5 size-4 shrink-0 opacity-60',
                        getTextColorClass(color)
                      )}
                    />
                  </div>

                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-zinc-500">
                    {relative && (
                      <span
                        className={cn(
                          daysAway <= 1 ? 'font-medium text-yellow-500' : ''
                        )}
                      >
                        {relative}
                      </span>
                    )}
                    {event.time && (
                      <span className="font-mono tabular-nums text-zinc-400">
                        {event.time.toLocaleTimeString('es', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        hs
                      </span>
                    )}
                  </p>

                  {event.description && (
                    <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-zinc-400">
                      {event.description}
                    </p>
                  )}

                  {isOwner && (
                    // Always visible on touch; revealed on hover/focus with a mouse
                    <div className="-mb-1 mt-1 flex gap-1 transition-opacity pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100 group-focus-within:opacity-100">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingEvent(event);
                          setIsEditOpen(true);
                        }}
                        className="-ml-2 flex h-8 items-center gap-1.5 rounded-md px-2 text-xs text-zinc-400 transition-colors hover:bg-white/5 hover:text-white active:scale-[0.97]"
                      >
                        <Pencil className="size-3" /> Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDeletingEvent(event);
                          setIsDeleteOpen(true);
                        }}
                        className="flex h-8 items-center gap-1.5 rounded-md px-2 text-xs text-zinc-400 transition-colors hover:bg-red-500/10 hover:text-red-400 active:scale-[0.97]"
                      >
                        <Trash2 className="size-3" /> Eliminar
                      </button>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
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
}
