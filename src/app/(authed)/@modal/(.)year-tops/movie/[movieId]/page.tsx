import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { MovieDetail, MovieSheet } from '@/components/movie';
import { getYearTopMovieDetailData } from '@/lib/api/movie-detail';

interface YearTopMovieSheetProps {
  params: Promise<{ movieId: string }>;
}

async function YearTopMovieSheetContent({ params }: YearTopMovieSheetProps) {
  const movieId = parseInt((await params).movieId);

  if (isNaN(movieId)) {
    notFound();
  }

  const data = await getYearTopMovieDetailData(movieId);

  if (!data) {
    notFound();
  }

  const { movie, otherLists, yearTopSummary, director, genre } = data;
  const title =
    movie.originalLanguage === 'es' ? movie.originalTitle : movie.title;

  return (
    <MovieSheet title={title} fullPageHref={`/year-tops/movie/${movieId}`}>
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

export default function YearTopMovieSheetPage(props: YearTopMovieSheetProps) {
  return (
    <Suspense>
      <YearTopMovieSheetContent {...props} />
    </Suspense>
  );
}
