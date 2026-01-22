import { getUserMamPicks } from '@/lib/api/mam';
import { loadMamMoviesSearchParams } from '@/lib/searchParams';
import { MamMovieCard } from '@/components/mam-movie-card';
import { Film } from 'lucide-react';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

interface MyListPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function MyListPage({ searchParams }: MyListPageProps) {
  // Get current user session
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return redirect('/sign-in');
  }

  const userId = session.user.id;

  // Load and validate search parameters
  const { title, imdb, page, limit } = await loadMamMoviesSearchParams(
    searchParams
  );

  // Fetch user's picks
  const moviesData = await getUserMamPicks(userId, {
    title,
    imdb,
    page,
    limit,
  });

  const { movies, pagination } = moviesData;

  return (
    <div className="container mx-auto px-4 pb-8 pt-4">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Mi Lista</h1>
        <p className="text-muted-foreground">
          Tus películas seleccionadas para Míralas Antes de Morir.
        </p>
      </div>

      {/* Results Count */}
      {movies.length > 0 && (
        <div className="mb-6">
          <p className="text-muted-foreground text-sm">
            Mostrando {movies.length} de {pagination.totalCount} películas
          </p>
        </div>
      )}

      {/* Movie Grid */}
      {movies.length === 0 ? (
        <div className="text-center py-12">
          <Film className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">
            No tienes películas en tu lista
          </h3>
          <p className="text-muted-foreground">
            Las películas que selecciones aparecerán aquí con tus reseñas.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {movies.map((movie) => {
            // Extract user's pick data (should only be one pick per movie for user's list)
            const userPick = movie.picks[0]
              ? {
                  review: movie.picks[0].review,
                  score: movie.picks[0].score,
                }
              : undefined;

            return (
              <MamMovieCard
                key={movie.id}
                movie={movie}
                userPick={userPick}
                showReview={true}
              />
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-2">
          {pagination.hasPrevPage && (
            <Link
              href={`/mam/my-list?${new URLSearchParams({
                ...Object.fromEntries(
                  Object.entries({ title, imdb }).filter(
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
              href={`/mam/my-list?${new URLSearchParams({
                ...Object.fromEntries(
                  Object.entries({ title, imdb }).filter(
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
