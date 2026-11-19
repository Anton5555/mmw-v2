'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users } from 'lucide-react';

import { Button } from '@/components/ui/button';
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

interface YearTopParticipantNavProps {
  participants: Participant[];
  currentType: string;
  year: number;
}

export function YearTopParticipantNav({
  participants,
  currentType,
  year,
}: YearTopParticipantNavProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const handleSelect = (slug: string) => {
    setOpen(false);
    // Navigate to the participant's list with the current type and year
    router.push(`/year-tops/${currentType}?year=${year}&participants=${slug}`);
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="inline-flex items-center gap-2 rounded-sm border-border bg-card px-4 h-10 text-sm font-semibold text-foreground hover:bg-secondary"
        onClick={() => setOpen(true)}
      >
        <Users className="h-4 w-4 text-yellow-500" />
        <span>Explorar por participante</span>
        <span className="ml-2 rounded-sm bg-secondary px-1.5 py-px text-xs font-semibold tabular-nums text-muted-foreground">
          {participants.length}
        </span>
      </Button>

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
