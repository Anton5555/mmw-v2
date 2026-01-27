import { getListMovies } from '@/lib/api/lists';
import { MovieGrid } from './movie-grid';
import { Film } from 'lucide-react';

interface ListMovieGridProps {
  listId: number;
  title?: string;
  genre?: string;
  director?: string;
  country?: string;
}

const ITEMS_PER_PAGE = 20;

export async function ListMovieGrid({
  listId,
  title,
  genre,
  director,
  country,
}: ListMovieGridProps) {
  const { movies, totalMovies, hasMore } = await getListMovies({
    listId,
    take: ITEMS_PER_PAGE,
    skip: 0,
    title,
    genre,
    director,
    country,
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
    <MovieGrid
      initialMovies={movies}
      listId={listId}
      hasMore={hasMore}
      totalMovies={totalMovies}
    />
  );
}
