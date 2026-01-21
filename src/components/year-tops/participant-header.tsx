'use client';

import { Button } from '@/components/ui/button';
import { ParticipantAvatar, getParticipantDisplayName } from '@/components/participant-avatar';
import { useYearTopParams } from '@/lib/hooks/useYearTopParams';

interface Participant {
  id: number;
  displayName: string;
  slug: string;
  year: number;
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
      <div className="flex items-center gap-4 mb-4">
        <Button
          variant="outline"
          onClick={() => setParams({ participants: [], page: 1 })}
          className="rounded-full border-white/20 bg-white/10 text-white hover:bg-white/20"
        >
          <span className="font-bold tracking-tight">← Volver a todos</span>
        </Button>
      </div>
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
