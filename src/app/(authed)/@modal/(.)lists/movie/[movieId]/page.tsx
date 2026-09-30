import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { MovieDetail, MovieSheet } from '@/components/movie';
import { getListMovieDetailData } from '@/lib/api/movie-detail';

interface ListMovieSheetProps {
  params: Promise<{ movieId: string }>;
  searchParams: Promise<{ listId?: string }>;
}

async function ListMovieSheetContent({
  params,
  searchParams,
}: ListMovieSheetProps) {
  const movieId = parseInt((await params).movieId);
  const { listId } = await searchParams;

  if (isNaN(movieId)) {
    notFound();
  }

  const data = await getListMovieDetailData(movieId, listId);

  if (!data) {
    notFound();
  }

  const { movie, otherLists, yearTopSummary, director, genre } = data;
  const title =
    movie.originalLanguage === 'es' ? movie.originalTitle : movie.title;

  return (
    <MovieSheet
      title={title}
      fullPageHref={`/lists/movie/${movieId}${listId ? `?listId=${listId}` : ''}`}
    >
      <MovieDetail
        compact
        movie={movie}
        rank={movie.rank}
        director={director}
        genre={genre}
        otherLists={otherLists}
        yearTopSummary={yearTopSummary}
      />
    </MovieSheet>
  );
}

export default function ListMovieSheetPage(props: ListMovieSheetProps) {
  return (
    <Suspense>
      <ListMovieSheetContent {...props} />
    </Suspense>
  );
}
