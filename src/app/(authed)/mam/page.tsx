import { getMamMovies, getMamParticipants } from '@/lib/api/mam';
import { loadMamMoviesSearchParams } from '@/lib/searchParams';
import { MamMovieFilters } from '@/components/mam-movie-filters';
import { MamMovieCard } from '@/components/mam-movie-card';
import { Film } from 'lucide-react';
import Link from 'next/link';

interface MamPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function MamPage({ searchParams }: MamPageProps) {
  // Load and validate search parameters using nuqs
  const { title, imdb, participants, page, limit } =
    await loadMamMoviesSearchParams(searchParams);

  // Fetch data server-side
  const [moviesData, participantsList] = await Promise.all([
    getMamMovies({
      title,
      imdb,
      participants,
      page,
      limit,
    }),
    getMamParticipants(),
  ]);

  const { movies, pagination } = moviesData;

  return (
    <div className="container mx-auto px-4 pb-8 pt-4">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Míralas Antes de Morir</h1>
        <p className="text-muted-foreground">
          A continuación, encontrarás las películas que que hay que ver antes de
          morir.
          <br />
          Son {pagination.totalCount} películas seleccionadas por la comunidad.
        </p>
      </div>

      {/* Filters */}
      <div className="mb-8 p-4 bg-card rounded-lg border">
        <MamMovieFilters participants={participantsList} />
      </div>

      {/* Results Count */}
      <div className="mb-6">
        <p className="text-muted-foreground text-sm">
          Mostrando {movies.length} de {pagination.totalCount} películas
        </p>
      </div>

      {/* Movie Grid */}
      {movies.length === 0 ? (
        <div className="text-center py-12">
          <Film className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">
            No se encontraron películas
          </h3>
          <p className="text-muted-foreground">
            Intenta ajustar tus criterios de búsqueda o revisa más tarde para
            nuevas selecciones.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {movies.map((movie) => (
            <MamMovieCard key={movie.id} movie={movie} rank={movie.rank} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-2">
          {pagination.hasPrevPage && (
            <Link
              href={`/mam?${new URLSearchParams({
                ...Object.fromEntries(
                  Object.entries({ title, imdb, participants }).filter(
                    ([, value]) => value !== ''
                  )
                ),
                page: (page - 1).toString(),
              }).toString()}`}
              className="px-3 py-2 text-sm border rounded-md hover:bg-accent transition-colors"
            >
              Anterior
            </Link>
          )}

          <span className="px-3 py-2 text-sm">
            Página {pagination.page} de {pagination.totalPages}
          </span>

          {pagination.hasNextPage && (
            <Link
              href={`/mam?${new URLSearchParams({
                ...Object.fromEntries(
                  Object.entries({ title, imdb, participants }).filter(
                    ([, value]) => value !== ''
                  )
                ),
                page: (page + 1).toString(),
              }).toString()}`}
              className="px-3 py-2 text-sm border rounded-md hover:bg-accent transition-colors"
            >
              Siguiente
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
