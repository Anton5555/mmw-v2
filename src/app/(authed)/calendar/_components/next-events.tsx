'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Pencil, Trash2 } from 'lucide-react';

import { EVENT_COLORS, EVENT_ICONS } from '@/lib/utils/constants';
import { cn } from '@/lib/utils';
import type { Event } from '@prisma/client';
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
      <div className="flex h-[200px] flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-zinc-900/50">
        <p className="text-sm text-zinc-500">No hay próximos eventos</p>
      </div>
    );
  }

  return (
    <>
      <div className="relative space-y-6">
        {showTitle && (
          <div className="flex items-center justify-between px-2">
            <h2 className="text-sm font-medium text-zinc-400">
              Próximos eventos
            </h2>
            <div className="h-px flex-1 bg-white/10 ml-4" />
          </div>
        )}

        <div className="relative space-y-4 pl-4">
          <div className="absolute left-[21px] top-2 bottom-2 w-px bg-zinc-800" />

          {events.map((event) => {
            const Icon = EVENT_ICONS[event.type];
            const isOwner = currentUserId && event.createdBy === currentUserId;
            const year = event.year || new Date().getFullYear();
            const eventDate = new Date(year, event.month - 1, event.day);

            return (
              <div
                key={event.id}
                className="group relative flex items-start gap-4"
              >
                <div className="relative z-10 flex flex-col items-center justify-center rounded-lg bg-zinc-950 border border-white/10 p-2 min-w-[44px]">
                  <span className="text-[10px] font-medium uppercase text-zinc-500 leading-none">
                    {format(eventDate, 'MMM', { locale: es })}
                  </span>
                  <span className="text-lg font-semibold text-white leading-tight">
                    {format(eventDate, 'dd')}
                  </span>
                </div>

                <div className="flex-1 space-y-2 rounded-xl bg-zinc-900 p-4 border border-white/10 transition-colors group-hover:border-white/20">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            'h-1.5 w-1.5 rounded-full',
                            getColorClass(EVENT_COLORS[event.type])
                          )}
                        />
                        <h3 className="text-sm font-semibold tracking-tight text-white">
                          {event.title}
                        </h3>
                      </div>

                      {event.time && (
                        <p className="text-xs font-mono text-yellow-500/80">
                          {event.time.toLocaleTimeString('es', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}{' '}
                          hs
                        </p>
                      )}
                    </div>

                    <Icon
                      className={cn(
                        'h-5 w-5 opacity-20 transition-opacity group-hover:opacity-100',
                        getTextColorClass(EVENT_COLORS[event.type])
                      )}
                    />
                  </div>

                  {event.description && (
                    <p className="text-xs leading-relaxed text-zinc-400 line-clamp-2">
                      {event.description}
                    </p>
                  )}

                  {isOwner && (
                    <div className="flex gap-3 pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => {
                          setEditingEvent(event);
                          setIsEditOpen(true);
                        }}
                        className="text-xs text-zinc-500 hover:text-white transition-colors flex items-center gap-1"
                      >
                        <Pencil className="w-3 h-3" /> Editar
                      </button>
                      <button
                        onClick={() => {
                          setDeletingEvent(event);
                          setIsDeleteOpen(true);
                        }}
                        className="text-xs text-zinc-500 hover:text-red-500 transition-colors flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" /> Eliminar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
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
