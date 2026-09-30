import { getMamMovieDetailData } from '@/lib/api/movie-detail';
import { MovieDetail } from '@/components/movie';
import { MamMovieBreadcrumbUpdater } from '@/components/mam-movie-breadcrumb-updater';
import { notFound } from 'next/navigation';

interface MamMoviePageProps {
  params: Promise<{ movieId: string }>;
}

export default async function MamMoviePage({ params }: MamMoviePageProps) {
  const movieId = parseInt((await params).movieId);

  if (isNaN(movieId)) {
    notFound();
  }

  const data = await getMamMovieDetailData(movieId);

  if (!data) {
    notFound();
  }

  const { movie, otherLists, yearTopSummary, director, genre } = data;

  return (
    <>
      <MamMovieBreadcrumbUpdater
        movieTitle={
          movie.originalLanguage === 'es' ? movie.originalTitle : movie.title
        }
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
