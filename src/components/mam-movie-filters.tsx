'use client';

import { useState } from 'react';
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
import {
  ParticipantAvatar,
  getParticipantDisplayName,
} from './participant-avatar';
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
  params,
  setParams,
}: {
  participants: Participant[];
  params: {
    title: string;
    imdb: string;
    participants: string[];
    page: number;
    limit: number;
  };
  setParams: (
    updates: Partial<{
      title: string | null;
      imdb: string | null;
      participants: string[] | null;
      page: number;
      limit: number;
    }>
  ) => void;
}) {
  // Get selected participants for display
  const selectedParticipants = participants.filter((p) =>
    params.participants.includes(p.slug)
  );

  return (
    <div className="space-y-4">
      {/* Search Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar por título..."
            value={params.title}
            onChange={(e) => {
              setParams({ title: e.target.value, page: 1 });
            }}
            className="pl-10"
          />
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar por IMDB ID..."
            value={params.imdb}
            onChange={(e) => {
              setParams({ imdb: e.target.value, page: 1 });
            }}
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
          selected={params.participants}
          onChange={(values) => {
            setParams({ participants: values, page: 1 });
          }}
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
                <span className="text-xs">
                  {getParticipantDisplayName(participant)}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 ml-1"
                  onClick={() => {
                    setParams({
                      participants: params.participants.filter(
                        (s) => s !== participant.slug
                      ),
                      page: 1,
                    });
                  }}
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

  // Count active filters for badge
  const activeFiltersCount =
    (params.title ? 1 : 0) + (params.imdb ? 1 : 0) + params.participants.length;

  const filtersContent = (
    <FiltersContent
      participants={participants}
      params={params}
      setParams={setParams}
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
                <Badge
                  variant="secondary"
                  className="ml-2 px-1.5 py-0.5 text-xs"
                >
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
