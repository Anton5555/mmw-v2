import { getMamMovies } from '@/lib/api/mam';
import { MamMovieCard } from '@/components/mam-movie-card';
import { MamPagination } from '@/components/mam-pagination';
import { Film } from 'lucide-react';
import { staggerDelay } from '@/lib/utils';
import { MamRandomMovieButton } from '@/components/mam/mam-random-movie-button';

interface MovieGridProps {
  searchParams: {
    title: string;
    imdb: string;
    participants: string[];
    genre: string[];
    director: string[];
    country: string[];
    page: number;
    limit: number;
  };
}

export async function MamMovieGrid({ searchParams }: MovieGridProps) {
  // Convert arrays to comma-separated strings for API
  const participantsString =
    searchParams.participants.length > 0
      ? searchParams.participants.join(',')
      : undefined;
  const genreString =
    searchParams.genre.length > 0
      ? searchParams.genre.join(',')
      : undefined;
  const directorString =
    searchParams.director.length > 0
      ? searchParams.director.join(',')
      : undefined;
  const countryString =
    searchParams.country.length > 0
      ? searchParams.country.join(',')
      : undefined;

  const { movies, pagination } = await getMamMovies({
    title: searchParams.title || undefined,
    imdb: searchParams.imdb || undefined,
    participants: participantsString,
    genre: genreString,
    director: directorString,
    country: countryString,
    page: searchParams.page,
    limit: searchParams.limit,
  });

  if (movies.length === 0) {
    return (
      <div className="text-center py-12">
        <Film className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">
          No se encontraron películas
        </h3>
        <p className="text-muted-foreground">
          Intenta ajustar tus criterios de búsqueda
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Results Count & Random Pick */}
      <div className="mb-6 flex items-center justify-between gap-3">
        <p className="text-sm tabular-nums text-muted-foreground">
          <span className="text-zinc-200">{movies.length}</span> de{' '}
          {pagination.totalCount} películas
        </p>
        <MamRandomMovieButton movies={movies} />
      </div>

      {/* Movie Grid */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,9.5rem),1fr))] gap-x-4 gap-y-8">
        {movies.map((movie, index) => (
          <div
            key={movie.id}
            className="animate-fade-in-up"
            style={staggerDelay(index)}
          >
            <MamMovieCard movie={movie} rank={movie.rank} />
          </div>
        ))}
      </div>

      {/* Pagination */}
      <MamPagination
        currentPage={pagination.page}
        totalPages={pagination.totalPages}
        hasPrevPage={pagination.hasPrevPage}
        hasNextPage={pagination.hasNextPage}
      />
    </>
  );
}
