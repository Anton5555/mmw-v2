'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FilterCombobox } from '@/components/ui/filter-combobox';
import { Search, Users, X } from 'lucide-react';
import { ParticipantAvatar, getParticipantDisplayName } from './participant-avatar';
import { useMamMoviesParams } from '@/lib/hooks/useMamMoviesParams';

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

interface MamMovieFiltersProps {
  participants: Participant[];
}

export function MamMovieFilters({ participants }: MamMovieFiltersProps) {
  const { params, setParams } = useMamMoviesParams();

  // Local state for search inputs (debounced)
  const [titleInput, setTitleInput] = useState(params.title || '');
  const [imdbInput, setImdbInput] = useState(params.imdb || '');

  // Sync local state with URL params when they change (e.g., browser back/forward)
  useEffect(() => {
    setTitleInput(params.title || '');
  }, [params.title]);

  useEffect(() => {
    setImdbInput(params.imdb || '');
  }, [params.imdb]);

  // Get current participants
  const selectedParticipantSlugs = params.participants
    ? params.participants.split(',').filter(Boolean)
    : [];

  const selectedParticipants = participants.filter((p) =>
    selectedParticipantSlugs.includes(p.slug)
  );

  // Debounced search effect for title
  useEffect(() => {
    const timer = setTimeout(() => {
      setParams({
        title: titleInput || null,
        page: 1, // Reset to first page when filtering
      });
    }, 500);

    return () => clearTimeout(timer);
  }, [titleInput, setParams]);

  // Debounced search effect for imdb
  useEffect(() => {
    const timer = setTimeout(() => {
      setParams({
        imdb: imdbInput || null,
        page: 1, // Reset to first page when filtering
      });
    }, 500);

    return () => clearTimeout(timer);
  }, [imdbInput, setParams]);

  const handleParticipantsChange = (values: string[]) => {
    setParams({
      participants: values.length > 0 ? values.join(',') : null,
      page: 1, // Reset to first page when filtering
    });
  };

  const clearParticipantFilter = (slug: string) => {
    const currentSlugs = selectedParticipantSlugs.filter((s) => s !== slug);
    setParams({
      participants: currentSlugs.length > 0 ? currentSlugs.join(',') : null,
      page: 1, // Reset to first page when filtering
    });
  };

  return (
    <div className="space-y-4">
      {/* Search Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar por título..."
            value={titleInput}
            onChange={(e) => setTitleInput(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar por IMDB ID..."
            value={imdbInput}
            onChange={(e) => setImdbInput(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Participant Filter */}
      <div className="flex items-center gap-4 flex-wrap">
        <FilterCombobox
          options={participants.map((p) => ({
            value: p.slug,
            label: getParticipantDisplayName(p),
          }))}
          selected={selectedParticipantSlugs}
          onChange={handleParticipantsChange}
          placeholder="Buscar participantes..."
          emptyMessage="No se encontraron participantes."
          groupLabel="Filtrar por participantes"
          icon={<Users className="h-4 w-4" />}
        />

        {/* Selected Participants with Avatars */}
        {selectedParticipants.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {selectedParticipants.map((participant) => (
              <Badge
                key={participant.id}
                variant="secondary"
                className="flex items-center gap-1"
              >
                <ParticipantAvatar participant={participant} size="sm" />
                <span className="text-xs">{getParticipantDisplayName(participant)}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 ml-1"
                  onClick={() => clearParticipantFilter(participant.slug)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
