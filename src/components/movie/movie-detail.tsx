'use client';

import { cn } from '@/lib/utils';
import type { MamMovieWithPicks } from '@/lib/validations/mam';
import type { List as ListType } from '@/lib/validations/generated';
import type { YearTopSummaryItem } from '@/lib/validations/year-top';
import type { MovieWatchProvidersView } from '@/lib/api/watch-providers';
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
  watchProviders?: MovieWatchProvidersView | null;
  /** Compact layout for the details sheet. */
  compact?: boolean;
}

export function MovieDetail({
  movie,
  rank,
  director,
  genre,
  otherLists = [],
  yearTopSummary = [],
  watchProviders = null,
  compact = false,
}: MovieDetailProps) {
  const hasPicks = movie.picks && movie.picks.length > 0;

  const sidebar = (
    <MovieSidebar
      totalPoints={movie.totalPoints}
      totalPicks={movie.totalPicks}
      yearTopSummary={yearTopSummary}
      otherLists={otherLists}
      watchProviders={watchProviders}
      compact={compact}
    />
  );

  return (
    <div
      className={cn('bg-background text-white', !compact && 'min-h-svh')}
    >
      <MovieHero
        movie={movie}
        rank={rank}
        director={director}
        genre={genre}
        compact={compact}
      />

      <section
        className={cn(
          compact ? 'px-4 py-8' : 'container mx-auto px-4 py-12'
        )}
      >
        <div
          className={cn(
            'grid gap-12',
            compact
              ? 'gap-8'
              : hasPicks
                ? 'lg:grid-cols-[1fr_380px]'
                : 'max-w-3xl mx-auto'
          )}
        >
          {compact && sidebar}
          {/* Main Content: Reviews & Votes */}
          {hasPicks && (
            <MovieReviewsSection picks={movie.picks} />
          )}

          {!compact && sidebar}
        </div>
      </section>
    </div>
  );
}
