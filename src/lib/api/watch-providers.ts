import * as z from 'zod';
import { DEFAULT_WATCH_COUNTRY } from '@/lib/watch-countries';
import { prisma } from '@/lib/db';
import { getCurrentSession } from '@/lib/get-session';
import {
  getMovieWatchProviders,
  type TMDBWatchProviderCountry,
} from '@/lib/tmdb';

export { DEFAULT_WATCH_COUNTRY };

/** Movies refreshed per cron call. Small enough to answer within cron-job.org's 30 s timeout. */
export const WATCH_PROVIDERS_BATCH_SIZE = 150;
export const WATCH_PROVIDERS_MAX_BATCH_SIZE = 500;

/** Parallel TMDB requests while syncing. TMDB allows roughly 50 per second. */
const SYNC_CONCURRENCY = 10;

/** Ways to watch that we keep. Buying is left out on purpose. */
export const WATCH_PROVIDER_KINDS = ['flatrate', 'free', 'ads', 'rent'] as const;

export type WatchProviderKind = (typeof WATCH_PROVIDER_KINDS)[number];

const watchProviderSchema = z.object({
  id: z.number(),
  name: z.string(),
  logoPath: z.string().nullable(),
});

const storedProvidersSchema = z.object({
  flatrate: z.array(watchProviderSchema).default([]),
  free: z.array(watchProviderSchema).default([]),
  ads: z.array(watchProviderSchema).default([]),
  rent: z.array(watchProviderSchema).default([]),
});

export type WatchProvider = z.infer<typeof watchProviderSchema>;
export type StoredWatchProviders = z.infer<typeof storedProvidersSchema>;

export type MovieWatchProvidersView = {
  country: string;
  link: string | null;
  providers: StoredWatchProviders;
};

export function toStoredProviders(
  data: TMDBWatchProviderCountry
): StoredWatchProviders {
  const pick = (kind: WatchProviderKind): WatchProvider[] =>
    (data[kind] ?? [])
      .toSorted(
        (a, b) => (a.display_priority ?? 999) - (b.display_priority ?? 999)
      )
      .map((p) => ({
        id: p.provider_id,
        name: p.provider_name,
        logoPath: p.logo_path,
      }));

  return {
    flatrate: pick('flatrate'),
    free: pick('free'),
    ads: pick('ads'),
    rent: pick('rent'),
  };
}

export function hasAnyProvider(providers: StoredWatchProviders) {
  return WATCH_PROVIDER_KINDS.some((kind) => providers[kind].length > 0);
}

/** Countries worth storing: every member's `watchCountry`, plus the default. */
export async function getTrackedWatchCountries(): Promise<string[]> {
  const rows = await prisma.user.findMany({
    where: { watchCountry: { not: null } },
    select: { watchCountry: true },
    distinct: ['watchCountry'],
  });

  const countries = new Set<string>([DEFAULT_WATCH_COUNTRY]);
  for (const row of rows) {
    const code = row.watchCountry?.trim().toUpperCase();
    if (code && /^[A-Z]{2}$/.test(code)) countries.add(code);
  }
  return [...countries].sort();
}

export type WatchProvidersSyncResult = {
  countries: string[];
  processed: number;
  updated: number;
  failed: number;
};

async function syncMovie(
  movie: { id: number; tmdbId: number },
  countries: string[]
): Promise<boolean> {
  const results = await getMovieWatchProviders(movie.tmdbId);
  if (results === null) return false;

  const rows = countries.flatMap((country) => {
    const data = results[country];
    if (!data) return [];
    const providers = toStoredProviders(data);
    if (!hasAnyProvider(providers)) return [];
    return [{ country, link: data.link ?? null, providers }];
  });

  await prisma.$transaction([
    prisma.movieWatchProviders.deleteMany({
      where: {
        movieId: movie.id,
        country: { notIn: rows.map((row) => row.country) },
      },
    }),
    ...rows.map((row) =>
      prisma.movieWatchProviders.upsert({
        where: { movieId_country: { movieId: movie.id, country: row.country } },
        create: {
          movieId: movie.id,
          country: row.country,
          link: row.link,
          providers: JSON.stringify(row.providers),
        },
        update: { link: row.link, providers: JSON.stringify(row.providers) },
      })
    ),
    prisma.movie.update({
      where: { id: movie.id },
      data: { watchProvidersSyncedAt: new Date() },
    }),
  ]);
  return true;
}

/**
 * Refreshes the `limit` movies synced longest ago (never-synced first).
 * A movie whose TMDB request fails keeps its old sync date, so the next call retries it.
 */
export async function syncWatchProvidersBatch(
  limit = WATCH_PROVIDERS_BATCH_SIZE
): Promise<WatchProvidersSyncResult> {
  const countries = await getTrackedWatchCountries();
  const movies = await prisma.movie.findMany({
    where: { tmdbId: { not: null } },
    select: { id: true, tmdbId: true },
    orderBy: [
      { watchProvidersSyncedAt: { sort: 'asc', nulls: 'first' } },
      { id: 'asc' },
    ],
    take: limit,
  });

  let updated = 0;
  let failed = 0;

  for (let i = 0; i < movies.length; i += SYNC_CONCURRENCY) {
    const chunk = movies.slice(i, i + SYNC_CONCURRENCY);
    const outcomes = await Promise.allSettled(
      chunk.map((movie) =>
        syncMovie({ id: movie.id, tmdbId: movie.tmdbId! }, countries)
      )
    );
    for (const outcome of outcomes) {
      if (outcome.status === 'fulfilled' && outcome.value) updated++;
      else {
        if (outcome.status === 'rejected') {
          console.error('Watch providers sync failed:', outcome.reason);
        }
        failed++;
      }
    }
  }

  return { countries, processed: movies.length, updated, failed };
}

/** "Dónde verla" for the signed-in member's country. */
export async function getWatchProvidersForCurrentUser(
  movieId: number
): Promise<MovieWatchProvidersView | null> {
  const session = await getCurrentSession();
  if (!session?.user) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { watchCountry: true },
  });
  const country =
    user?.watchCountry?.trim().toUpperCase() || DEFAULT_WATCH_COUNTRY;

  const row = await prisma.movieWatchProviders.findUnique({
    where: { movieId_country: { movieId, country } },
    select: { link: true, providers: true },
  });
  if (!row) return null;

  let json: unknown;
  try {
    json = JSON.parse(row.providers);
  } catch {
    return null;
  }
  const parsed = storedProvidersSchema.safeParse(json);
  if (!parsed.success || !hasAnyProvider(parsed.data)) return null;

  return { country, link: row.link, providers: parsed.data };
}
