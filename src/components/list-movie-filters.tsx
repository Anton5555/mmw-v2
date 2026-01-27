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
import { Search, Film, User, X, SlidersHorizontal } from 'lucide-react';
import { useListMoviesParams } from '@/lib/hooks/useListMoviesParams';

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

interface ListMovieFiltersProps {
  genres: Genre[];
  directors: Director[];
  countries: Country[];
}

function FiltersContent({
  genres,
  directors,
  countries,
  params,
  setParams,
}: {
  genres: Genre[];
  directors: Director[];
  countries: Country[];
  params: {
    title: string;
    genre: string[];
    director: string[];
    country: string[];
  };
  setParams: (
    updates: Partial<{
      title: string | null;
      genre: string[] | null;
      director: string[] | null;
      country: string[] | null;
    }>
  ) => void;
}) {
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

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="grid grid-cols-1 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-500 h-4 w-4" />
          <Input
            placeholder="Buscar por título..."
            value={params.title}
            onChange={(e) => {
              setParams({ title: e.target.value });
            }}
            className="pl-10 bg-zinc-800/50 border-zinc-700/50 text-white placeholder:text-zinc-500 focus-visible:ring-1 focus-visible:ring-white/20"
          />
        </div>
      </div>

      {/* Genre Filter */}
      <div className="flex items-center gap-4 flex-wrap">
        <FilterCombobox
          options={genres.map((g) => ({
            value: g.name,
            label: g.name,
          }))}
          selected={params.genre}
          onChange={(values) => {
            setParams({ genre: values });
          }}
          placeholder="Buscar géneros..."
          emptyMessage="No se encontraron géneros."
          groupLabel="Filtrar por géneros"
          icon={<Film className="h-4 w-4" />}
        />

        {/* Selected Genres */}
        {selectedGenres.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {selectedGenres.map((genre) => (
              <Badge
                key={genre.id}
                variant="secondary"
                className="flex items-center gap-1"
              >
                <span className="text-xs">{genre.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 ml-1"
                  onClick={() => {
                    setParams({
                      genre: params.genre.filter((g) => g !== genre.name),
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

      {/* Director Filter */}
      <div className="flex items-center gap-4 flex-wrap">
        <FilterCombobox
          options={directors.map((d) => ({
            value: d.name,
            label: d.name,
          }))}
          selected={params.director}
          onChange={(values) => {
            setParams({ director: values });
          }}
          placeholder="Buscar directores..."
          emptyMessage="No se encontraron directores."
          groupLabel="Filtrar por directores"
          icon={<User className="h-4 w-4" />}
        />

        {/* Selected Directors */}
        {selectedDirectors.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {selectedDirectors.map((director) => (
              <Badge
                key={director.id}
                variant="secondary"
                className="flex items-center gap-1"
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

      {/* Country Filter */}
      <div className="flex items-center gap-4 flex-wrap">
        <FilterCombobox
          options={countries.map((c) => ({
            value: c.code,
            label: c.name,
          }))}
          selected={params.country}
          onChange={(values) => {
            setParams({ country: values });
          }}
          placeholder="Buscar países..."
          emptyMessage="No se encontraron países."
          groupLabel="Filtrar por países"
          icon={<Film className="h-4 w-4" />}
        />

        {/* Selected Countries */}
        {selectedCountries.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {selectedCountries.map((country) => (
              <Badge
                key={country.code}
                variant="secondary"
                className="flex items-center gap-1"
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

export function ListMovieFilters({
  genres,
  directors,
  countries,
}: ListMovieFiltersProps) {
  const { params, setParams } = useListMoviesParams();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Count active filters for badge
  const activeFiltersCount =
    (params.title ? 1 : 0) +
    params.genre.length +
    params.director.length +
    params.country.length;

  const filtersContent = (
    <FiltersContent
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

      {/* Desktop: Floating Glassmorphism Filter Bar */}
      <div className="sticky top-4 z-50 mb-12 hidden md:block">
        <div className="p-2 bg-zinc-900/80 backdrop-blur-xl rounded-full border border-white/10 shadow-2xl flex items-center gap-4 px-6">
          <Search className="w-5 h-5 text-muted-foreground shrink-0" />
          <div className="flex-1 flex items-center gap-4">
            <Input
              placeholder="Buscar por título..."
              value={params.title}
              onChange={(e) => {
                setParams({ title: e.target.value });
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
          <div className="shrink-0 flex items-center gap-2">
            <FilterCombobox
              options={genres.map((g) => ({
                value: g.name,
                label: g.name,
              }))}
              selected={params.genre}
              onChange={(values) => {
                setParams({ genre: values });
              }}
              placeholder="Géneros..."
              emptyMessage="No se encontraron géneros."
              groupLabel="Filtrar por géneros"
              icon={<Film className="h-4 w-4" />}
            />
            <FilterCombobox
              options={directors.map((d) => ({
                value: d.name,
                label: d.name,
              }))}
              selected={params.director}
              onChange={(values) => {
                setParams({ director: values });
              }}
              placeholder="Directores..."
              emptyMessage="No se encontraron directores."
              groupLabel="Filtrar por directores"
              icon={<User className="h-4 w-4" />}
            />
            <FilterCombobox
              options={countries.map((c) => ({
                value: c.code,
                label: c.name,
              }))}
              selected={params.country}
              onChange={(values) => {
                setParams({ country: values });
              }}
              placeholder="Países..."
              emptyMessage="No se encontraron países."
              groupLabel="Filtrar por países"
              icon={<Film className="h-4 w-4" />}
            />
          </div>
        </div>
      </div>
    </>
  );
}
