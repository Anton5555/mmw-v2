'use client';

import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FilterCombobox } from '@/components/ui/filter-combobox';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Search, Users, X, SlidersHorizontal } from 'lucide-react';
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

function FiltersContent({
  participants,
  titleInput,
  setTitleInput,
  imdbInput,
  setImdbInput,
  selectedParticipantSlugs,
  handleParticipantsChange,
  selectedParticipants,
  clearParticipantFilter,
}: {
  participants: Participant[];
  titleInput: string;
  setTitleInput: (value: string) => void;
  imdbInput: string;
  setImdbInput: (value: string) => void;
  selectedParticipantSlugs: string[];
  handleParticipantsChange: (values: string[]) => void;
  selectedParticipants: Participant[];
  clearParticipantFilter: (slug: string) => void;
}) {
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

export function MamMovieFilters({ participants }: MamMovieFiltersProps) {
  const { params, setParams } = useMamMoviesParams();
  const [sheetOpen, setSheetOpen] = useState(false);

  // Local state for search inputs (debounced)
  const [titleInput, setTitleInput] = useState(params.title || '');
  const [imdbInput, setImdbInput] = useState(params.imdb || '');

  // Track previous params to detect external changes (e.g., browser back/forward)
  const prevParamsRef = useRef({ title: params.title, imdb: params.imdb });
  const isInternalUpdateRef = useRef(false);

  // Sync local state with URL params when they change externally
  useEffect(() => {
    // Only update if params changed externally (not from our own setParams calls)
    if (!isInternalUpdateRef.current) {
      if (prevParamsRef.current.title !== params.title) {
        setTitleInput(params.title || '');
      }
      if (prevParamsRef.current.imdb !== params.imdb) {
        setImdbInput(params.imdb || '');
      }
    }
    isInternalUpdateRef.current = false;
    prevParamsRef.current = { title: params.title, imdb: params.imdb };
  }, [params.title, params.imdb]);

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
      isInternalUpdateRef.current = true;
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
      isInternalUpdateRef.current = true;
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

  // Count active filters for badge
  const activeFiltersCount =
    (titleInput ? 1 : 0) +
    (imdbInput ? 1 : 0) +
    selectedParticipantSlugs.length;

  const filtersContent = (
    <FiltersContent
      participants={participants}
      titleInput={titleInput}
      setTitleInput={setTitleInput}
      imdbInput={imdbInput}
      setImdbInput={setImdbInput}
      selectedParticipantSlugs={selectedParticipantSlugs}
      handleParticipantsChange={handleParticipantsChange}
      selectedParticipants={selectedParticipants}
      clearParticipantFilter={clearParticipantFilter}
    />
  );

  return (
    <>
      {/* Mobile: Sheet with trigger button */}
      <div className="md:hidden">
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="w-full justify-start">
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              Filtros
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-2 px-1.5 py-0.5 text-xs">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[90vh] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Filtros</SheetTitle>
            </SheetHeader>
            <div className="mt-6">{filtersContent}</div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop: Show filters inline */}
      <div className="hidden md:block">{filtersContent}</div>
    </>
  );
}
