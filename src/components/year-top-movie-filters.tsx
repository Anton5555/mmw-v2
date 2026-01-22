'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { Search, SlidersHorizontal } from 'lucide-react';
import { useYearTopParams } from '@/lib/hooks/useYearTopParams';
import { cn } from '@/lib/utils';

interface YearTopMovieFiltersProps {
  participants: unknown[]; // Kept for backward compatibility but not used
  availableYears: number[];
}

function FiltersContent({
  availableYears,
  params,
  setParams,
}: {
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
      <div className="grid grid-cols-1 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-500 h-4 w-4" />
          <Input
            placeholder="Buscar por título..."
            value={params.title}
            onChange={(e) => {
              setParams({ title: e.target.value, page: 1 });
            }}
            className="pl-10 bg-zinc-800/50 border-zinc-700/50 text-white placeholder:text-zinc-500 focus-visible:ring-1 focus-visible:ring-white/20"
          />
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-500 h-4 w-4" />
          <Input
            placeholder="Buscar por IMDB ID..."
            value={params.imdb}
            onChange={(e) => {
              setParams({ imdb: e.target.value, page: 1 });
            }}
            className="pl-10 bg-zinc-800/50 border-zinc-700/50 text-white placeholder:text-zinc-500 focus-visible:ring-1 focus-visible:ring-white/20"
          />
        </div>
      </div>

    </div>
  );
}

export function YearTopMovieFilters({
  availableYears,
}: YearTopMovieFiltersProps) {
  const { params, setParams } = useYearTopParams();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Count active filters for badge
  const activeFiltersCount =
    (params.title ? 1 : 0) +
    (params.imdb ? 1 : 0);

  const filtersContent = (
    <FiltersContent
      availableYears={availableYears}
      params={params}
      setParams={setParams}
    />
  );

  return (
    <>
      {/* Mobile: Drawer with trigger button */}
      <div className="md:hidden">
        <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
          <DrawerTrigger asChild>
            <button className="w-full bg-zinc-900/80 backdrop-blur-xl rounded-full border border-white/10 shadow-2xl flex items-center gap-3 px-6 py-3 text-white hover:bg-zinc-800/80 transition-colors">
              <SlidersHorizontal className="h-4 w-4 shrink-0" />
              <span className="flex-1 text-left">Filtros</span>
              {activeFiltersCount > 0 && (
                <Badge
                  variant="secondary"
                  className="px-2 py-0.5 text-xs shrink-0"
                >
                  {activeFiltersCount}
                </Badge>
              )}
            </button>
          </DrawerTrigger>
          <DrawerContent className="max-h-[60vh] bg-zinc-900/95 backdrop-blur-xl border-t border-white/10">
            <DrawerHeader className="text-left pb-4">
              <DrawerTitle className="text-white">Filtros</DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-6 overflow-y-auto">{filtersContent}</div>
          </DrawerContent>
        </Drawer>
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
          </div>
        </div>
      </div>
    </>
  );
}
