import { getMamMovies } from '@/lib/api/mam';
import { MamMovieCard } from '@/components/mam-movie-card';
import { MamPagination } from '@/components/mam-pagination';
import { Film } from 'lucide-react';

interface MovieGridProps {
  searchParams: {
    title: string;
    imdb: string;
    participants: string[];
    page: number;
    limit: number;
  };
}

export async function MamMovieGrid({ searchParams }: MovieGridProps) {
  // Convert participants array to comma-separated string for API
  const participantsString =
    searchParams.participants.length > 0
      ? searchParams.participants.join(',')
      : undefined;

  const { movies, pagination } = await getMamMovies({
    title: searchParams.title || undefined,
    imdb: searchParams.imdb || undefined,
    participants: participantsString,
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
      {/* Results Count */}
      <div className="mb-6">
        <p className="text-muted-foreground text-sm">
          Mostrando {movies.length} de {pagination.totalCount} películas
        </p>
      </div>

      {/* Movie Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-8">
        {movies.map((movie, index) => (
          <div
            key={movie.id}
            className="animate-fade-in-up"
            style={{ animationDelay: `${index * 50}ms` }}
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
