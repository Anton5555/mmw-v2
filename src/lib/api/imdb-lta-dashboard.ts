import { prisma } from '@/lib/db';
import type { CandidateMovieStats } from '@/lib/api/imdb-lta';

/**
 * Personal stats for the IMDB LTA Inicio tab.
 *
 * Anti-bias rule: everything here is about the viewer or about which movies
 * have been released. Never read group fields (averageScore, ratingCount,
 * nominationCount) and never order movies by score. See DECISIONS.md.
 */

/** Below this many own scores in a bucket we hide "tu promedio" (too noisy). */
export const DASHBOARD_MIN_SCORES_FOR_BUCKET_AVERAGE = 3;
const TOP_BUCKETS = 8;
const WEEKS_OF_ACTIVITY = 12;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export type DashboardLote = {
  number: number;
  isOpen: boolean;
  movieCount: number;
  watchedCount: number;
  complete: boolean;
};

export type DashboardBucket = {
  label: string;
  releasedCount: number;
  watchedCount: number;
  /** Own average in this bucket. Null below the minimum number of scores. */
  myAverage: number | null;
};

export type DashboardWeek = {
  /** Monday 00:00 UTC of that week. */
  weekStart: Date;
  count: number;
};

export type DashboardStats = {
  /** Movies that appeared in a lote (open or closed). */
  inScopeCount: number;
  scoredCount: number;
  notSeenCount: number;
  lotes: DashboardLote[];
  completedLotes: number;
  /** Index = score 0..10, value = how many times you gave it. */
  scoreHistogram: number[];
  myAverage: number | null;
  mostUsedScore: number | null;
  byDecade: DashboardBucket[];
  byGenre: DashboardBucket[];
  byCountry: DashboardBucket[];
  missingGenre: number;
  missingCountry: number;
  weekly: DashboardWeek[];
  thisWeekCount: number;
};

export type DashboardMeta = {
  batchMovies: {
    movieId: number;
    batch: { number: number; status: 'OPEN' | 'CLOSED' };
  }[];
  genres: { movieId: number; name: string }[];
  countries: { movieId: number; code: string; name: string }[];
  /** The viewer's own ratings (in scope), only the timestamp matters. */
  myRatingDates: Date[];
};

export async function loadDashboardMeta(
  userId: string,
  movieIds: number[]
): Promise<DashboardMeta> {
  if (movieIds.length === 0) {
    return { batchMovies: [], genres: [], countries: [], myRatingDates: [] };
  }
  const inIds = { movieId: { in: movieIds } };
  const [batchMovies, genres, countries, myRatings] = await Promise.all([
    prisma.imdbLtaBatchMovie.findMany({
      where: inIds,
      select: { movieId: true, batch: { select: { number: true, status: true } } },
    }),
    prisma.movieGenre.findMany({
      where: inIds,
      select: { movieId: true, genre: { select: { name: true } } },
    }),
    prisma.movieCountry.findMany({
      where: inIds,
      select: {
        movieId: true,
        country: { select: { code: true, name: true } },
      },
    }),
    prisma.imdbLtaRating.findMany({
      where: { userId, ...inIds },
      select: { createdAt: true },
    }),
  ]);

  return {
    batchMovies,
    genres: genres.map((g) => ({ movieId: g.movieId, name: g.genre.name })),
    countries: countries.map((c) => ({
      movieId: c.movieId,
      code: c.country.code,
      name: c.country.name,
    })),
    myRatingDates: myRatings.map((r) => r.createdAt),
  };
}

/** The only movie fields this module may look at. Keeps group data out by type. */
type PersonalMovie = Pick<
  CandidateMovieStats,
  'id' | 'releaseDate' | 'batchState' | 'userScore' | 'userSkipped'
>;

type BucketAcc = { released: number; watched: number; scoreSum: number };

function addToBucket(
  acc: Map<string, BucketAcc>,
  label: string,
  movie: PersonalMovie
) {
  const bucket = acc.get(label) ?? { released: 0, watched: 0, scoreSum: 0 };
  bucket.released += 1;
  if (movie.userScore !== null) {
    bucket.watched += 1;
    bucket.scoreSum += movie.userScore;
  }
  acc.set(label, bucket);
}

function toBucket(label: string, b: BucketAcc): DashboardBucket {
  return {
    label,
    releasedCount: b.released,
    watchedCount: b.watched,
    myAverage:
      b.watched >= DASHBOARD_MIN_SCORES_FOR_BUCKET_AVERAGE
        ? round1(b.scoreSum / b.watched)
        : null,
  };
}

/** Sort by released count desc, then label. Never by score. */
function topBuckets(acc: Map<string, BucketAcc>): DashboardBucket[] {
  const sorted = [...acc.entries()]
    .map(([label, b]) => toBucket(label, b))
    .toSorted(
      (a, b) =>
        b.releasedCount - a.releasedCount ||
        a.label.localeCompare(b.label, 'es', { sensitivity: 'base' })
    );
  if (sorted.length <= TOP_BUCKETS + 1) return sorted;
  // "Otros" counts movie-tags, not distinct movies, same as the visible rows.
  const rest = sorted.slice(TOP_BUCKETS);
  const others = rest.reduce<BucketAcc>(
    (sum, b) => ({
      released: sum.released + b.releasedCount,
      watched: sum.watched + b.watchedCount,
      scoreSum: sum.scoreSum,
    }),
    { released: 0, watched: 0, scoreSum: 0 }
  );
  return [
    ...sorted.slice(0, TOP_BUCKETS),
    // No average for Otros: it mixes unrelated groups.
    { label: 'Otros', releasedCount: others.released, watchedCount: others.watched, myAverage: null },
  ];
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

let regionNames: Intl.DisplayNames | null = null;
function countryLabel(code: string, fallback: string): string {
  try {
    regionNames ??= new Intl.DisplayNames(['es'], { type: 'region' });
    return regionNames.of(code.toUpperCase()) ?? fallback;
  } catch {
    return fallback;
  }
}

function startOfWeekUtc(date: Date): number {
  const d = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
  const day = (d.getUTCDay() + 6) % 7; // Monday = 0
  return d.getTime() - day * 24 * 60 * 60 * 1000;
}

export function summarizeDashboard(
  all: PersonalMovie[],
  meta: DashboardMeta,
  now: Date = new Date()
): DashboardStats {
  const inScope = all.filter((m) => m.batchState !== 'locked');
  const byId = new Map(inScope.map((m) => [m.id, m]));

  // Lotes: a re-queued movie counts in every lote it appeared in.
  const loteAcc = new Map<
    number,
    { isOpen: boolean; movieIds: Set<number> }
  >();
  for (const row of meta.batchMovies) {
    if (!byId.has(row.movieId)) continue;
    const lote = loteAcc.get(row.batch.number) ?? {
      isOpen: row.batch.status === 'OPEN',
      movieIds: new Set<number>(),
    };
    lote.movieIds.add(row.movieId);
    loteAcc.set(row.batch.number, lote);
  }
  const lotes: DashboardLote[] = [...loteAcc.entries()]
    .toSorted(([a], [b]) => a - b)
    .map(([number, lote]) => {
      let watchedCount = 0;
      for (const id of lote.movieIds) {
        if (byId.get(id)?.userScore != null) watchedCount += 1;
      }
      const movieCount = lote.movieIds.size;
      return {
        number,
        isOpen: lote.isOpen,
        movieCount,
        watchedCount,
        complete: movieCount > 0 && watchedCount === movieCount,
      };
    });

  // Own scores.
  const scoreHistogram = Array.from({ length: 11 }, () => 0);
  let scoreSum = 0;
  let scoredCount = 0;
  let notSeenCount = 0;
  for (const movie of inScope) {
    if (movie.userScore !== null) {
      const s = Math.min(10, Math.max(0, Math.round(movie.userScore)));
      scoreHistogram[s] += 1;
      scoreSum += movie.userScore;
      scoredCount += 1;
    } else if (movie.userSkipped) {
      notSeenCount += 1;
    }
  }
  let mostUsedScore: number | null = null;
  scoreHistogram.forEach((count, score) => {
    if (count === 0) return;
    // Ties go to the higher score; the choice is arbitrary but stable.
    if (mostUsedScore === null || count >= scoreHistogram[mostUsedScore]) {
      mostUsedScore = score;
    }
  });

  // Composition.
  const decadeAcc = new Map<string, BucketAcc>();
  for (const movie of inScope) {
    const year = new Date(movie.releaseDate).getUTCFullYear();
    if (!Number.isFinite(year)) continue;
    addToBucket(decadeAcc, `${Math.floor(year / 10) * 10}s`, movie);
  }
  const byDecade = [...decadeAcc.entries()]
    .toSorted(([a], [b]) => a.localeCompare(b))
    .map(([label, b]) => toBucket(label, b));

  const genreAcc = new Map<string, BucketAcc>();
  const withGenre = new Set<number>();
  for (const g of meta.genres) {
    const movie = byId.get(g.movieId);
    if (!movie) continue;
    withGenre.add(movie.id);
    addToBucket(genreAcc, g.name, movie);
  }

  const countryAcc = new Map<string, BucketAcc>();
  const withCountry = new Set<number>();
  for (const c of meta.countries) {
    const movie = byId.get(c.movieId);
    if (!movie) continue;
    withCountry.add(movie.id);
    addToBucket(countryAcc, countryLabel(c.code, c.name), movie);
  }

  // Weekly activity, oldest first, the current week last.
  const thisWeek = startOfWeekUtc(now);
  const weekly: DashboardWeek[] = Array.from(
    { length: WEEKS_OF_ACTIVITY },
    (_, i) => ({
      weekStart: new Date(thisWeek - (WEEKS_OF_ACTIVITY - 1 - i) * WEEK_MS),
      count: 0,
    })
  );
  for (const date of meta.myRatingDates) {
    const offset = Math.round((thisWeek - startOfWeekUtc(date)) / WEEK_MS);
    const index = WEEKS_OF_ACTIVITY - 1 - offset;
    if (index >= 0 && index < WEEKS_OF_ACTIVITY) weekly[index].count += 1;
  }

  return {
    inScopeCount: inScope.length,
    scoredCount,
    notSeenCount,
    lotes,
    completedLotes: lotes.filter((l) => l.complete).length,
    scoreHistogram,
    myAverage: scoredCount === 0 ? null : round1(scoreSum / scoredCount),
    mostUsedScore,
    byDecade,
    byGenre: topBuckets(genreAcc),
    byCountry: topBuckets(countryAcc),
    missingGenre: inScope.length - withGenre.size,
    missingCountry: inScope.length - withCountry.size,
    weekly,
    thisWeekCount: weekly[WEEKS_OF_ACTIVITY - 1].count,
  };
}
