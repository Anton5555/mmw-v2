'use client';

import { useState } from 'react';
import ReactCountryFlag from 'react-country-flag';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FilterCombobox } from '@/components/ui/filter-combobox';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import {
  Search,
  Users,
  X,
  SlidersHorizontal,
  Film,
  User,
  Globe2,
} from 'lucide-react';
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

interface Genre {
  id: number;
  name: string;
}

interface Director {
  id: number;
  name: string;
}

interface Country {
  code: string;
  name: string;
}

interface MamMovieFiltersProps {
  participants: Participant[];
  genres: Genre[];
  directors: Director[];
  countries: Country[];
}

function FiltersContent({
  participants,
  genres,
  directors,
  countries,
  params,
  setParams,
}: {
  participants: Participant[];
  genres: Genre[];
  directors: Director[];
  countries: Country[];
  params: {
    title: string;
    imdb: string;
    participants: string[];
    genre: string[];
    director: string[];
    country: string[];
    page: number;
    limit: number;
  };
  setParams: (
    updates: Partial<{
      title: string | null;
      imdb: string | null;
      participants: string[] | null;
      genre: string[] | null;
      director: string[] | null;
      country: string[] | null;
      page: number;
      limit: number;
    }>
  ) => void;
}) {
  // Get selected participants for display
  const selectedParticipants = participants.filter((p) =>
    params.participants.includes(p.slug)
  );

  // Get selected genres for display
  const selectedGenres = genres.filter((g) => params.genre.includes(g.name));

  // Get selected directors for display
  const selectedDirectors = directors.filter((d) =>
    params.director.includes(d.name)
  );

  // Get selected countries for display
  const selectedCountries = countries.filter((c) =>
    params.country.includes(c.code)
  );

  const hasAnyFilters =
    selectedParticipants.length > 0 ||
    selectedGenres.length > 0 ||
    selectedDirectors.length > 0 ||
    selectedCountries.length > 0;

  return (
    <div className="space-y-8 pb-10">
      {/* Section: Text Search */}
      <div className="space-y-3">
        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
          Búsqueda directa
        </label>
        <div className="grid grid-cols-2 gap-2">
          <Input
            placeholder="Título"
            className="bg-zinc-800/50 border-0 rounded-xl h-12 text-sm"
            value={params.title}
            onChange={(e) => setParams({ title: e.target.value, page: 1 })}
          />
          <Input
            placeholder="IMDB ID"
            className="bg-zinc-800/50 border-0 rounded-xl h-12 text-sm"
            value={params.imdb}
            onChange={(e) => setParams({ imdb: e.target.value, page: 1 })}
          />
        </div>
      </div>

      {/* Section: Selectors in a Grid */}
      <div className="space-y-4">
        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
          Categorías y créditos
        </label>
        <div className="flex flex-col gap-3">
          {/* Participantes */}
          <div className="flex items-center justify-between p-1 bg-zinc-800/30 rounded-2xl border border-white/5">
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
              groupLabel="Participantes"
              icon={<Users className="h-4 w-4" />}
              className="w-full justify-start h-12 border-0"
            />
          </div>

          {/* Géneros */}
          <div className="flex items-center justify-between p-1 bg-zinc-800/30 rounded-2xl border border-white/5">
            <FilterCombobox
              options={genres.map((g) => ({
                value: g.name,
                label: g.name,
              }))}
              selected={params.genre}
              onChange={(values) => {
                setParams({ genre: values, page: 1 });
              }}
              placeholder="Buscar géneros..."
              emptyMessage="No se encontraron géneros."
              groupLabel="Géneros"
              icon={<Film className="h-4 w-4" />}
              className="w-full justify-start h-12 border-0"
            />
          </div>

          {/* Directores */}
          <div className="flex items-center justify-between p-1 bg-zinc-800/30 rounded-2xl border border-white/5">
            <FilterCombobox
              options={directors.map((d) => ({
                value: d.name,
                label: d.name,
              }))}
              selected={params.director}
              onChange={(values) => {
                setParams({ director: values, page: 1 });
              }}
              placeholder="Buscar directores..."
              emptyMessage="No se encontraron directores."
              groupLabel="Directores"
              icon={<User className="h-4 w-4" />}
              className="w-full justify-start h-12 border-0"
            />
          </div>

          {/* Países */}
          <div className="flex items-center justify-between p-1 bg-zinc-800/30 rounded-2xl border border-white/5">
            <FilterCombobox
              options={countries.map((c) => ({
                value: c.code,
                label: c.name,
              }))}
              selected={params.country}
              onChange={(values) => {
                setParams({ country: values, page: 1 });
              }}
              placeholder="Buscar países..."
              emptyMessage="No se encontraron países."
              groupLabel="Países"
              icon={<Globe2 className="h-4 w-4" />}
              className="w-full justify-start h-12 border-0"
            />
          </div>
        </div>
      </div>

      {/* Active Badges Summary */}
      {hasAnyFilters && (
        <div className="pt-4 border-t border-white/5">
          <div className="flex flex-wrap gap-2">
            {selectedParticipants.map((participant) => (
              <Badge
                key={participant.id}
                variant="secondary"
                className="flex items-center gap-1 bg-white/5 text-zinc-400"
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

            {selectedGenres.map((genre) => (
              <Badge
                key={genre.id}
                variant="secondary"
                className="flex items-center gap-1 bg-white/5 text-zinc-400"
              >
                <span className="text-xs">{genre.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 ml-1"
                  onClick={() => {
                    setParams({
                      genre: params.genre.filter((g) => g !== genre.name),
                      page: 1,
                    });
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}

            {selectedDirectors.map((director) => (
              <Badge
                key={director.id}
                variant="secondary"
                className="flex items-center gap-1 bg-white/5 text-zinc-400"
              >
                <span className="text-xs">{director.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 ml-1"
                  onClick={() => {
                    setParams({
                      director: params.director.filter(
                        (d) => d !== director.name
                      ),
                      page: 1,
                    });
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}

            {selectedCountries.map((country) => (
              <Badge
                key={country.code}
                variant="secondary"
                className="flex items-center gap-1 bg-white/5 text-zinc-400"
              >
                <ReactCountryFlag
                  countryCode={country.code}
                  svg
                  className="rounded-[2px] shadow-sm"
                  style={{
                    width: '1rem',
                    height: '0.75rem',
                  }}
                  aria-label={country.name}
                />
                <span className="text-xs">{country.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 ml-1"
                  onClick={() => {
                    setParams({
                      country: params.country.filter((c) => c !== country.code),
                      page: 1,
                    });
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function MamMovieFilters({
  participants,
  genres,
  directors,
  countries,
}: MamMovieFiltersProps) {
  const { params, setParams } = useMamMoviesParams();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Count active filters for badge
  const activeFiltersCount =
    (params.title ? 1 : 0) +
    (params.imdb ? 1 : 0) +
    params.participants.length +
    params.genre.length +
    params.director.length +
    params.country.length;

  const filtersContent = (
    <FiltersContent
      participants={participants}
      genres={genres}
      directors={directors}
      countries={countries}
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

      {/* Desktop: Multi-Select Command Bar */}
      <div className="sticky top-6 z-50 mb-12 hidden md:block">
        <div className="p-2 bg-zinc-900/60 backdrop-blur-2xl rounded-full border border-white/10 shadow-2xl flex items-center gap-3 px-6">
          <Search className="w-5 h-5 text-zinc-500 shrink-0" />
          {/* Main Search Input */}
          <Input
            placeholder="Buscar por título o IMDB..."
            value={params.title}
            onChange={(e) => {
              setParams({ title: e.target.value, page: 1 });
            }}
            className="bg-transparent border-0 focus-visible:ring-0 text-white placeholder:text-zinc-600 w-48 text-sm h-8"
          />

          <div className="h-6 w-px bg-white/10 mx-2" />

          {/* The Filter Grid - Only icons/labels until clicked */}
          <div className="flex-1 flex items-center gap-2 overflow-x-auto no-scrollbar">
            <FilterCombobox
              options={participants.map((p) => ({
                value: p.slug,
                label: getParticipantDisplayName(p),
              }))}
              selected={params.participants}
              onChange={(values) => {
                setParams({ participants: values, page: 1 });
              }}
              placeholder="Participantes"
              emptyMessage="No se encontraron participantes."
              groupLabel="Participantes"
              icon={<Users className="h-3.5 w-3.5" />}
              className="border-0 bg-transparent hover:bg-white/5 rounded-full"
            />

            <FilterCombobox
              options={genres.map((g) => ({
                value: g.name,
                label: g.name,
              }))}
              selected={params.genre}
              onChange={(values) => {
                setParams({ genre: values, page: 1 });
              }}
              placeholder="Géneros"
              emptyMessage="No se encontraron géneros."
              groupLabel="Géneros"
              icon={<Film className="h-3.5 w-3.5" />}
              className="border-0 bg-transparent hover:bg-white/5 rounded-full"
            />

            <FilterCombobox
              options={directors.map((d) => ({
                value: d.name,
                label: d.name,
              }))}
              selected={params.director}
              onChange={(values) => {
                setParams({ director: values, page: 1 });
              }}
              placeholder="Directores"
              emptyMessage="No se encontraron directores."
              groupLabel="Directores"
              icon={<User className="h-3.5 w-3.5" />}
              className="border-0 bg-transparent hover:bg-white/5 rounded-full"
            />

            <FilterCombobox
              options={countries.map((c) => ({
                value: c.code,
                label: c.name,
              }))}
              selected={params.country}
              onChange={(values) => {
                setParams({ country: values, page: 1 });
              }}
              placeholder="Países"
              emptyMessage="No se encontraron países."
              groupLabel="Países"
              icon={<Globe2 className="h-3.5 w-3.5" />}
              className="border-0 bg-transparent hover:bg-white/5 rounded-full"
            />
          </div>

          {/* Clear All Button (Only shows if activeFilters > 0) */}
          {activeFiltersCount > 0 && (
            <Button
              variant="ghost"
              onClick={() =>
                setParams({
                  title: '',
                  imdb: '',
                  participants: [],
                  genre: [],
                  director: [],
                  country: [],
                  page: 1,
                })
              }
              className="h-8 w-8 p-0 rounded-full hover:bg-red-500/10 hover:text-red-500 ml-2"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
