import { getListMovieDetailData } from '@/lib/api/movie-detail';
import { MovieDetail } from '@/components/movie';
import { ListMovieBreadcrumbUpdater } from '@/components/list-movie-breadcrumb-updater';
import { notFound } from 'next/navigation';

interface ListMoviePageProps {
  params: Promise<{ movieId: string }>;
  searchParams: Promise<{ listId?: string }>;
}

export default async function ListMoviePage({
  params,
  searchParams,
}: ListMoviePageProps) {
  const movieId = parseInt((await params).movieId);
  const { listId } = await searchParams;

  if (isNaN(movieId)) {
    notFound();
  }

  const data = await getListMovieDetailData(movieId, listId);

  if (!data) {
    notFound();
  }

  const { movie, selectedList, otherLists, yearTopSummary, director, genre } =
    data;

  return (
    <>
      <ListMovieBreadcrumbUpdater
        movieTitle={
          movie.originalLanguage === 'es' ? movie.originalTitle : movie.title
        }
        listName={selectedList?.name}
        listId={selectedList?.id}
      />
      <MovieDetail
        movie={movie}
        rank={movie.rank}
        director={director}
        genre={genre}
        otherLists={otherLists}
        yearTopSummary={yearTopSummary}
      />
    </>
  );
}
