'use client';

import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ParticipantAvatar, getParticipantDisplayName } from '@/components/participant-avatar';
import { useYearTopParams } from '@/lib/hooks/useYearTopParams';

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

interface YearTopParticipantHeaderProps {
  participants: Participant[];
  year: number;
}

export function YearTopParticipantHeader({
  participants,
  year,
}: YearTopParticipantHeaderProps) {
  const { params, setParams } = useYearTopParams();
  const selectedParticipants = params.participants || [];
  const isSingleParticipant = selectedParticipants.length === 1;

  if (!isSingleParticipant) {
    return null;
  }

  const selectedParticipant = participants.find(
    (p) => p.slug === selectedParticipants[0]
  );

  if (!selectedParticipant) {
    return null;
  }

  return (
    <div className="mb-8">
      <Button
        variant="ghost"
        onClick={() => setParams({ participants: [], page: 1 })}
        className="-ml-3 h-8 gap-1.5 px-3 text-zinc-400 hover:bg-white/5 hover:text-white mb-4"
      >
        <ArrowLeft />
        Todos
      </Button>
      <div className="flex items-center gap-4">
        <ParticipantAvatar
          participant={{
            id: selectedParticipant.id,
            displayName: selectedParticipant.displayName,
            slug: selectedParticipant.slug,
            userId: selectedParticipant.userId ?? null,
            user: selectedParticipant.user,
          }}
          size="lg"
        />
        <div>
          <h2 className="text-2xl font-bold mb-1">
            {getParticipantDisplayName(selectedParticipant)}
          </h2>
          <p className="text-muted-foreground text-sm">
            Lista personal de {year}
          </p>
        </div>
      </div>
    </div>
  );
}
