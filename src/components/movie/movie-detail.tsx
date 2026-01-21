'use client';

import { cn } from '@/lib/utils';
import type { MamMovieWithPicks } from '@/lib/validations/mam';
import type { List as ListType } from '@/lib/validations/generated';
import type { YearTopSummaryItem } from '@/lib/validations/year-top';
import { MovieHero } from './movie-hero';
import { MovieReviewsSection } from './movie-reviews-section';
import { MovieSidebar } from './movie-sidebar';

interface MovieDetailProps {
  movie: MamMovieWithPicks;
  rank?: number;
  director?: string;
  genre?: string;
  otherLists?: ListType[];
  yearTopSummary?: YearTopSummaryItem[];
}

export function MovieDetail({
  movie,
  rank,
  director,
  genre,
  otherLists = [],
  yearTopSummary = [],
}: MovieDetailProps) {
  const hasPicks = movie.picks && movie.picks.length > 0;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <MovieHero movie={movie} rank={rank} director={director} genre={genre} />

      <section className="container mx-auto px-4 py-12 md:px-8">
        <div
          className={cn(
            'grid gap-12',
            hasPicks
              ? 'lg:grid-cols-[1fr_380px]'
              : 'max-w-3xl mx-auto'
          )}
        >
          {/* Main Content: Reviews & Votes */}
          {hasPicks && (
            <MovieReviewsSection picks={movie.picks} />
          )}

          {/* Sidebar: Stats, Tops, and Lists */}
          <MovieSidebar
            totalPoints={movie.totalPoints}
            totalPicks={movie.totalPicks}
            yearTopSummary={yearTopSummary}
            otherLists={otherLists}
          />
        </div>
      </section>
    </div>
  );
}
