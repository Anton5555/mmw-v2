import { getYearTopMovies } from '@/lib/api/year-top';
import { YearTopMovieCard } from '@/components/year-top-movie-card';
import { YearTopPagination } from '@/components/year-top-pagination';
import { Film } from 'lucide-react';
import { YearTopPickType } from '@prisma/client';

interface YearTopMovieGridProps {
  searchParams: {
    year: number;
    pickType: string;
    title: string;
    imdb: string;
    participants: string[];
    page: number;
    limit: number;
  };
}

export async function YearTopMovieGrid({ searchParams }: YearTopMovieGridProps) {
  // Convert participants array to comma-separated string for API
  const participantsString =
    searchParams.participants.length > 0
      ? searchParams.participants.join(',')
      : undefined;

  // Validate pickType
  const pickType = searchParams.pickType as YearTopPickType;
  if (!Object.values(YearTopPickType).includes(pickType)) {
    return (
      <div className="text-center py-12">
        <Film className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">Tipo de lista inválido</h3>
      </div>
    );
  }

  const { movies, pagination } = await getYearTopMovies({
    year: searchParams.year,
    pickType,
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

  // Validate picks exist for all movies before rendering
  const validMovies = movies.filter(movie => {
    return movie.picks && Array.isArray(movie.picks);
  });
  
  return (
    <>
      {/* Results Count */}
      <div className="mb-6">
        <p className="text-muted-foreground text-sm">
          Mostrando {validMovies.length} de {pagination.totalCount} películas
        </p>
      </div>

      {/* Movie Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-8">
        {validMovies.map((movie, index) => (
          <div
            key={movie.id}
            className="animate-fade-in-up"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <YearTopMovieCard movie={movie} totalPoints={movie.totalPoints} />
          </div>
        ))}
      </div>

      {/* Pagination */}
      <YearTopPagination
        currentPage={pagination.page}
        totalPages={pagination.totalPages}
        hasPrevPage={pagination.hasPrevPage}
        hasNextPage={pagination.hasNextPage}
      />
    </>
  );
}
