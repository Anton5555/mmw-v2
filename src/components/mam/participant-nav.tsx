'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users } from 'lucide-react';

import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command';
import {
  ParticipantAvatar,
  getParticipantDisplayName,
} from '@/components/participant-avatar';

interface Participant {
  id: number;
  displayName: string;
  slug: string;
  userId?: string | null;
  user?: {
    image: string | null;
    name: string | null;
  } | null;
}

interface ParticipantNavProps {
  participants: Participant[];
  className?: string;
}

export function ParticipantNav({ participants, className }: ParticipantNavProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const handleSelect = (slug: string) => {
    setOpen(false);
    router.push(`/mam/participant/${slug}`);
  };

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={() => setOpen(true)}
      >
        <Users className="text-yellow-500" />
        <span>Participantes</span>
        <span className="hidden rounded-full bg-white/10 px-1.5 py-px sm:inline text-[10px] font-semibold tabular-nums text-zinc-300">
          {participants.length}
        </span>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Buscar participante..." />
        <CommandList>
          <CommandEmpty>No se encontraron resultados.</CommandEmpty>
          <CommandGroup heading="Participantes">
            {participants.map((participant) => {
              const displayName = getParticipantDisplayName(participant);
              return (
                <CommandItem
                  key={participant.id}
                  value={`${displayName} ${participant.slug}`}
                  onSelect={() => handleSelect(participant.slug)}
                  onClick={() => handleSelect(participant.slug)}
                  className="cursor-pointer !opacity-100 hover:bg-accent hover:text-accent-foreground aria-selected:bg-accent aria-selected:text-accent-foreground data-[disabled]:pointer-events-auto data-[disabled]:opacity-100"
                >
                  <ParticipantAvatar
                    participant={participant}
                    size="sm"
                    className="mr-2 shrink-0"
                  />
                  <span className="flex-1 font-medium">
                    {displayName}
                  </span>
                  <span className="text-xs text-zinc-400">
                    →
                  </span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}

