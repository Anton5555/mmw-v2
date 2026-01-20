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
import { useYearTopParams } from '@/lib/hooks/useYearTopParams';
import { cn } from '@/lib/utils';

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

interface YearTopMovieFiltersProps {
  participants: Participant[];
  availableYears: number[];
}

function FiltersContent({
  participants,
  availableYears,
  params,
  setParams,
}: {
  participants: Participant[];
  availableYears: number[];
  params: {
    year: number;
    pickType: string;
    title: string;
    imdb: string;
    participants: string[];
    page: number;
    limit: number;
  };
  setParams: (
    updates: Partial<{
      year: number;
      pickType: string | null;
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
      {/* Year Selector - Film Strip */}
      <div className="flex flex-col space-y-2">
        <div className="flex items-center gap-4 overflow-x-auto pb-2 scrollbar-hide">
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-[0.3em] shrink-0">
            Cambiar Año:
          </span>
          <div className="flex gap-2">
            {availableYears.map((y) => (
              <button
                key={y}
                onClick={() => setParams({ year: y, page: 1 })}
                className={cn(
                  'min-w-[80px] py-1 px-4 rounded border font-mono text-sm transition-all duration-200',
                  params.year === y
                    ? 'bg-yellow-500 border-yellow-500 text-black font-bold shadow-[0_0_15px_rgba(234,179,8,0.4)]'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-600'
                )}
              >
                {y}
              </button>
            ))}
          </div>
        </div>
      </div>

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
                <ParticipantAvatar
                  participant={{
                    id: participant.id,
                    displayName: participant.displayName,
                    slug: participant.slug,
                    userId: participant.userId ?? null,
                    user: participant.user,
                  }}
                  size="sm"
                />
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

export function YearTopMovieFilters({
  participants,
  availableYears,
}: YearTopMovieFiltersProps) {
  const { params, setParams } = useYearTopParams();
  const [sheetOpen, setSheetOpen] = useState(false);

  // Count active filters for badge
  const activeFiltersCount =
    (params.title ? 1 : 0) +
    (params.imdb ? 1 : 0) +
    params.participants.length;

  const filtersContent = (
    <FiltersContent
      participants={participants}
      availableYears={availableYears}
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

      {/* Desktop: Year Switcher + Floating Glassmorphism Filter Bar */}
      <div className="sticky top-4 z-50 mb-12 hidden md:block">
        <div className="flex flex-col space-y-6 mb-8 border-b border-white/5 pb-8">
          {/* PRESTIGE YEAR SWITCHER */}
          <div className="flex items-center gap-4 overflow-x-auto pb-2 scrollbar-hide">
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-[0.3em] shrink-0">
              Cambiar Año:
            </span>
            <div className="flex gap-2">
              {availableYears.map((y) => (
                <button
                  key={y}
                  onClick={() => setParams({ year: y, page: 1 })}
                  className={cn(
                    'min-w-[80px] py-1 px-4 rounded border font-mono text-sm transition-all duration-200',
                    params.year === y
                      ? 'bg-yellow-500 border-yellow-500 text-black font-bold shadow-[0_0_15px_rgba(234,179,8,0.4)]'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-600'
                  )}
                >
                  {y}
                </button>
              ))}
            </div>
          </div>

          {/* SEARCH & OTHER FILTERS */}
          <div className="p-2 bg-zinc-900/80 backdrop-blur-xl rounded-full border border-white/10 shadow-2xl flex items-center gap-4 px-6">
            <Search className="w-5 h-5 text-muted-foreground shrink-0" />
            <div className="flex-1 flex items-center gap-4">
              <Input
                placeholder="Buscar por título..."
                value={params.title}
                onChange={(e) => {
                  setParams({ title: e.target.value, page: 1 });
                }}
                className="bg-transparent border-0 focus-visible:ring-0 text-white placeholder:text-zinc-500 h-8"
              />
              {activeFiltersCount > 0 && (
                <>
                  <div className="h-6 w-px bg-white/10" />
                  <Badge
                    variant="secondary"
                    className="px-2 py-0.5 text-xs shrink-0"
                  >
                    {activeFiltersCount} filtro{activeFiltersCount > 1 ? 's' : ''}
                  </Badge>
                </>
              )}
            </div>
            <div className="h-6 w-px bg-white/10" />
            <div className="shrink-0">
              <FilterCombobox
                options={participants.map((p) => ({
                  value: p.slug,
                  label: getParticipantDisplayName(p),
                }))}
                selected={params.participants}
                onChange={(values) => {
                  setParams({ participants: values, page: 1 });
                }}
                placeholder="Participantes..."
                emptyMessage="No se encontraron participantes."
                groupLabel="Filtrar por participantes"
                icon={<Users className="h-4 w-4" />}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
