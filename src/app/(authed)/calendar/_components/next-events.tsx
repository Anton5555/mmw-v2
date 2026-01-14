'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Pencil, Trash2 } from 'lucide-react';

import { EVENT_COLORS, EVENT_ICONS } from '@/lib/utils/constants';
import { cn } from '@/lib/utils';
import type { Event } from '@prisma/client';
import { useSession } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { EditEventSheet } from './edit-event-dialog';
import { DeleteEventDialog } from './delete-event-dialog';

type NextEventsProps = {
  events: Event[];
  showTitle?: boolean;
};

export function NextEvents({ events, showTitle = true }: NextEventsProps) {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [deletingEvent, setDeletingEvent] = useState<Event | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

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
    <>
      <div className="space-y-4">
        {showTitle && <h2 className="text-lg font-semibold">Próximos Eventos</h2>}
        <div className="space-y-4">
          {events.map((event) => {
            const Icon = EVENT_ICONS[event.type];
            const isOwner = currentUserId && event.createdBy === currentUserId;

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
                  {isOwner && (
                    <div className="flex gap-2 mt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2"
                        onClick={() => {
                          setEditingEvent(event);
                          setIsEditOpen(true);
                        }}
                      >
                        <Pencil className="w-3 h-3 mr-1" />
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-destructive hover:text-destructive"
                        onClick={() => {
                          setDeletingEvent(event);
                          setIsDeleteOpen(true);
                        }}
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Eliminar
                      </Button>
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
