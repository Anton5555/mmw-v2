import { getYearTopMovieDetailData } from '@/lib/api/movie-detail';
import { MovieDetail } from '@/components/movie';
import { notFound } from 'next/navigation';

interface YearTopMoviePageProps {
  params: Promise<{ movieId: string }>;
}

export default async function YearTopMoviePage({
  params,
}: YearTopMoviePageProps) {
  const movieId = parseInt((await params).movieId);

  if (isNaN(movieId)) {
    notFound();
  }

  const data = await getYearTopMovieDetailData(movieId);

  if (!data) {
    notFound();
  }

  const { movie, otherLists, yearTopSummary, director, genre } = data;

  return (
    <MovieDetail
      movie={movie}
      rank={movie.rank}
      director={director}
      genre={genre}
      otherLists={otherLists}
      yearTopSummary={yearTopSummary}
    />
  );
}
