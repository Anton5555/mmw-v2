import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { MovieDetail, MovieSheet } from '@/components/movie';
import { getMamMovieDetailData } from '@/lib/api/movie-detail';

interface MamMovieSheetProps {
  params: Promise<{ movieId: string }>;
}

async function MamMovieSheetContent({ params }: MamMovieSheetProps) {
  const movieId = parseInt((await params).movieId);

  if (isNaN(movieId)) {
    notFound();
  }

  const data = await getMamMovieDetailData(movieId);

  if (!data) {
    notFound();
  }

  const { movie, otherLists, yearTopSummary, director, genre } = data;
  const title =
    movie.originalLanguage === 'es' ? movie.originalTitle : movie.title;

  return (
    <MovieSheet title={title} fullPageHref={`/mam/movie/${movieId}`}>
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

export default function MamMovieSheetPage(props: MamMovieSheetProps) {
  return (
    <Suspense>
      <MamMovieSheetContent {...props} />
    </Suspense>
  );
}
