'use client';

import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useInView } from 'react-intersection-observer';
import { FocusCards } from './ui/focus-cards';
import { loadMoreMoviesAction } from '@/lib/actions/lists/load-more-movies';
import { Movie } from '@prisma/client';

const ITEMS_PER_PAGE = 20;

interface MovieGridProps {
  initialMovies: Movie[];
  listId: number;
  hasMore: boolean;
  totalMovies: number;
}

export function MovieGrid({
  initialMovies,
  listId,
  hasMore: initialHasMore,
}: MovieGridProps) {
  const [movies, setMovies] = useState(initialMovies);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoading, setIsLoading] = useState(false);

  const { ref, inView } = useInView();

  useEffect(() => {
    const loadMore = async () => {
      if (isLoading || !hasMore) return;

      setIsLoading(true);

      try {
        const result = await loadMoreMoviesAction({
          listId,
          skip: movies.length,
          take: ITEMS_PER_PAGE,
        });

        const newMovies = result.movies;
        if (Array.isArray(newMovies)) {
          setMovies((prev) => [...prev, ...newMovies]);
          setHasMore(!!result.hasMore);
        }
      } catch (error) {
        console.error('Failed to load more movies:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (inView) {
      loadMore();
    }
  }, [inView, hasMore, isLoading, listId, movies.length]);

  return (
    <>
      <FocusCards
        cards={movies.map((movie) => ({
          id: movie.id,
          title:
            movie.originalLanguage === 'es' ? movie.originalTitle : movie.title,
          src: `https://image.tmdb.org/t/p/w500${movie.posterUrl}`,
        }))}
      />

      {hasMore && (
        <div ref={ref} className="mt-8 flex justify-center">
          {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
        </div>
      )}
    </>
  );
}
