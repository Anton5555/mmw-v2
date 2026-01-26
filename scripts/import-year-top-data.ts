/**
 * Import Year Top Data
 *
 * Imports year top data from JSON files (movies-2024.json and movies-2025.json)
 * into the database, creating YearTopParticipant, YearTopPick, and YearTopMovieStats records.
 *
 * Usage:
 *   npx tsx scripts/import-year-top-data.ts
 *   npx tsx scripts/import-year-top-data.ts --dry-run
 */

import { PrismaClient, YearTopPickType } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Helper to generate slug from display name
function generateSlug(displayName: string): string {
  return displayName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, '') // Trim hyphens
    .substring(0, 50); // Limit length
}

// Manual mapping for IMDb IDs that don't work with TMDB find API
// Format: imdbId -> tmdbId
const MANUAL_IMDB_TO_TMDB_MAP: Record<string, number> = {
  'tt32065524': 1249452,
  'tt36997568': 1450563,
};

// Fetch movie from TMDB by IMDb ID
async function getMovieFromTMDB(imdbId: string): Promise<{
  tmdbId: number;
  title: string;
  release_date: string;
  original_language: string;
  original_title: string;
  poster_path: string;
} | null> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    throw new Error('TMDB_API_KEY not set in environment');
  }

  // Check manual mapping first
  const manualTmdbId = MANUAL_IMDB_TO_TMDB_MAP[imdbId];
  if (manualTmdbId) {
    console.log(`  Using manual mapping for ${imdbId} -> TMDB ID ${manualTmdbId}`);
    return await getMovieFromTMDBById(manualTmdbId, imdbId);
  }

  try {
    const response = await fetch(
      `https://api.themoviedb.org/3/find/${imdbId}?api_key=${apiKey}&external_source=imdb_id`
    );

    if (!response.ok) {
      console.error(`TMDB API error for ${imdbId}: ${response.status}`);
      return null;
    }

    const result = (await response.json()) as {
      movie_results: Array<{
        id: number;
        title: string;
        release_date: string;
        original_language: string;
        original_title: string;
        poster_path: string;
      }>;
    };

    if (!result.movie_results?.[0]) {
      console.error(`No TMDB result for ${imdbId}`);
      return null;
    }

    const movieData = result.movie_results[0];
    return {
      tmdbId: movieData.id,
      title: movieData.title,
      release_date: movieData.release_date,
      original_language: movieData.original_language,
      original_title: movieData.original_title,
      poster_path: movieData.poster_path
        ? `https://image.tmdb.org/t/p/original${movieData.poster_path}`
        : '',
    };
  } catch (error) {
    console.error(`Error fetching TMDB data for ${imdbId}:`, error);
    return null;
  }
}

// Fetch movie from TMDB by TMDB ID (for manual mappings)
async function getMovieFromTMDBById(
  tmdbId: number,
  imdbId: string
): Promise<{
  tmdbId: number;
  title: string;
  release_date: string;
  original_language: string;
  original_title: string;
  poster_path: string;
} | null> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    throw new Error('TMDB_API_KEY not set in environment');
  }

  try {
    const response = await fetch(
      `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${apiKey}`
    );

    if (!response.ok) {
      console.error(`TMDB API error for movie ${tmdbId}: ${response.status}`);
      return null;
    }

    const movieData = (await response.json()) as {
      id: number;
      title: string;
      release_date: string;
      original_language: string;
      original_title: string;
      poster_path: string | null;
    };

    return {
      tmdbId: movieData.id,
      title: movieData.title,
      release_date: movieData.release_date,
      original_language: movieData.original_language,
      original_title: movieData.original_title,
      poster_path: movieData.poster_path
        ? `https://image.tmdb.org/t/p/original${movieData.poster_path}`
        : '',
    };
  } catch (error) {
    console.error(`Error fetching TMDB data for movie ${tmdbId}:`, error);
    return null;
  }
}

// Sleep helper for rate limiting
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Get or create movie by imdbId
async function getOrCreateMovie(imdbId: string | null): Promise<{ movieId: number; wasCreated: boolean } | null> {
  if (!imdbId || !imdbId.trim()) {
    return null;
  }

  // Check if movie already exists
  const existingMovie = await prisma.movie.findUnique({
    where: { imdbId },
    select: { id: true },
  });

  if (existingMovie) {
    return { movieId: existingMovie.id, wasCreated: false };
  }

  // Fetch from TMDB
  console.log(`  Fetching movie data for ${imdbId}...`);
  const movieData = await getMovieFromTMDB(imdbId);
  if (!movieData) {
    console.warn(`  ⚠️  Could not fetch movie data for ${imdbId}`);
    return null;
  }

  // Create movie
  const movie = await prisma.movie.create({
    data: {
      title: movieData.title,
      originalTitle: movieData.original_title,
      originalLanguage: movieData.original_language,
      releaseDate: new Date(movieData.release_date || '1900-01-01'),
      letterboxdUrl: `https://letterboxd.com/tmdb/${movieData.tmdbId}`,
      imdbId,
      posterUrl: movieData.poster_path || '',
      tmdbId: movieData.tmdbId,
    },
  });

  // Rate limiting
  await sleep(250);

  return { movieId: movie.id, wasCreated: true };
}

// Get or create participant
async function getOrCreateParticipant(displayName: string): Promise<number> {
  const slug = generateSlug(displayName);

  const participant = await prisma.yearTopParticipant.upsert({
    where: { slug },
    update: {
      displayName, // Update display name in case it changed
    },
    create: {
      displayName,
      slug,
    },
  });

  return participant.id;
}

// Process picks for a user
async function processUserPicks(
  year: number,
  participantId: number,
  userData: {
    top?: Array<{ rank: number; title: string; imdb_id: string | null }>;
    best_seen?: Array<{ title: string; imdb_id: string | null }>;
    porongas?: Array<{ rank: number; title: string; imdb_id: string | null }>;
  },
  dryRun: boolean
): Promise<{
  top10Picks: number;
  bestSeenPicks: number;
  worst3Picks: number;
  moviesCreated: number;
}> {
  let top10Picks = 0;
  let bestSeenPicks = 0;
  let worst3Picks = 0;
  let moviesCreated = 0;

  // Process TOP_10 picks
  if (userData.top && Array.isArray(userData.top)) {
    for (const movieEntry of userData.top) {
      if (!movieEntry.imdb_id) {
        console.warn(`  ⚠️  Skipping movie "${movieEntry.title}" - no imdb_id`);
        continue;
      }

      const movieResult = await getOrCreateMovie(movieEntry.imdb_id);
      if (!movieResult) {
        console.warn(`  ⚠️  Could not create/find movie for ${movieEntry.imdb_id}`);
        continue;
      }

      if (movieResult.wasCreated) {
        moviesCreated++;
      }

      const isTopPosition = movieEntry.rank === 1;

      if (!dryRun) {
        await prisma.yearTopPick.upsert({
          where: {
            participantId_movieId_year_pickType: {
              participantId,
              movieId: movieResult.movieId,
              year,
              pickType: YearTopPickType.TOP_10,
            },
          },
          update: {
            isTopPosition,
          },
          create: {
            participantId,
            movieId: movieResult.movieId,
            year,
            pickType: YearTopPickType.TOP_10,
            isTopPosition,
          },
        });
      }

      top10Picks++;
    }
  }

  // Process BEST_SEEN picks
  if (userData.best_seen && Array.isArray(userData.best_seen)) {
    for (const movieEntry of userData.best_seen) {
      if (!movieEntry.imdb_id) {
        console.warn(`  ⚠️  Skipping movie "${movieEntry.title}" - no imdb_id`);
        continue;
      }

      const movieResult = await getOrCreateMovie(movieEntry.imdb_id);
      if (!movieResult) {
        console.warn(`  ⚠️  Could not create/find movie for ${movieEntry.imdb_id}`);
        continue;
      }

      if (movieResult.wasCreated) {
        moviesCreated++;
      }

      if (!dryRun) {
        await prisma.yearTopPick.upsert({
          where: {
            participantId_movieId_year_pickType: {
              participantId,
              movieId: movieResult.movieId,
              year,
              pickType: YearTopPickType.BEST_SEEN,
            },
          },
          update: {
            isTopPosition: false,
          },
          create: {
            participantId,
            movieId: movieResult.movieId,
            year,
            pickType: YearTopPickType.BEST_SEEN,
            isTopPosition: false,
          },
        });
      }

      bestSeenPicks++;
    }
  }

  // Process WORST_3 picks
  if (userData.porongas && Array.isArray(userData.porongas)) {
    for (const movieEntry of userData.porongas) {
      if (!movieEntry.imdb_id) {
        console.warn(`  ⚠️  Skipping movie "${movieEntry.title}" - no imdb_id`);
        continue;
      }

      const movieResult = await getOrCreateMovie(movieEntry.imdb_id);
      if (!movieResult) {
        console.warn(`  ⚠️  Could not create/find movie for ${movieEntry.imdb_id}`);
        continue;
      }

      if (movieResult.wasCreated) {
        moviesCreated++;
      }

      const isTopPosition = movieEntry.rank === 1;

      if (!dryRun) {
        await prisma.yearTopPick.upsert({
          where: {
            participantId_movieId_year_pickType: {
              participantId,
              movieId: movieResult.movieId,
              year,
              pickType: YearTopPickType.WORST_3,
            },
          },
          update: {
            isTopPosition,
          },
          create: {
            participantId,
            movieId: movieResult.movieId,
            year,
            pickType: YearTopPickType.WORST_3,
            isTopPosition,
          },
        });
      }

      worst3Picks++;
    }
  }

  return { top10Picks, bestSeenPicks, worst3Picks, moviesCreated };
}

// Calculate and update YearTopMovieStats
async function calculateAndUpdateStats(year: number, dryRun: boolean) {
  console.log(`\n📊 Calculating stats for year ${year}...`);

  // Get all picks for this year, grouped by movie, pickType
  const picks = await prisma.yearTopPick.findMany({
    where: { year },
    select: {
      movieId: true,
      pickType: true,
      isTopPosition: true,
    },
  });

  // Group by movieId and pickType, calculate points
  const statsMap = new Map<string, number>();

  for (const pick of picks) {
    const points = pick.isTopPosition ? 2 : 1;
    const key = `${pick.movieId}-${pick.pickType}`;
    statsMap.set(key, (statsMap.get(key) || 0) + points);
  }

  // Update stats
  let statsUpdated = 0;
  for (const [key, totalPoints] of statsMap.entries()) {
    const [movieIdStr, pickTypeStr] = key.split('-');
    const movieId = parseInt(movieIdStr, 10);
    const pickType = pickTypeStr as YearTopPickType;

    if (!dryRun) {
      await prisma.yearTopMovieStats.upsert({
        where: {
          movieId_year_pickType: {
            movieId,
            year,
            pickType,
          },
        },
        update: {
          totalPoints,
        },
        create: {
          movieId,
          year,
          pickType,
          totalPoints,
        },
      });
    }

    statsUpdated++;
  }

  console.log(`  ✅ Updated ${statsUpdated} stats records`);
  return statsUpdated;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  console.log('🎬 Import Year Top Data');
  console.log('======================\n');
  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }

  const dataDir = path.join(process.cwd(), 'data');
  const files = ['movies-2022.json', 'movies-2023.json'];

  let totalMoviesCreated = 0;
  let totalTop10Picks = 0;
  let totalBestSeenPicks = 0;
  let totalWorst3Picks = 0;
  let totalStatsUpdated = 0;

  for (const filename of files) {
    const filePath = path.join(dataDir, filename);
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️  File not found: ${filePath}`);
      continue;
    }

    console.log(`\n📁 Processing ${filename}...`);
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(fileContent) as {
      year: number;
      users: Record<
        string,
        {
          top?: Array<{ rank: number; title: string; imdb_id: string | null }>;
          best_seen?: Array<{ title: string; imdb_id: string | null }>;
          porongas?: Array<{ rank: number; title: string; imdb_id: string | null }>;
        }
      >;
    };

    const year = data.year;
    console.log(`  Year: ${year}`);
    console.log(`  Users: ${Object.keys(data.users).length}`);

    // Process each user
    for (const [displayName, userData] of Object.entries(data.users)) {
      console.log(`\n  👤 Processing user: ${displayName}`);

      const participantId = await getOrCreateParticipant(displayName);
      const result = await processUserPicks(year, participantId, userData, dryRun);

      totalMoviesCreated += result.moviesCreated;
      totalTop10Picks += result.top10Picks;
      totalBestSeenPicks += result.bestSeenPicks;
      totalWorst3Picks += result.worst3Picks;

      console.log(
        `    ✅ TOP_10: ${result.top10Picks}, BEST_SEEN: ${result.bestSeenPicks}, WORST_3: ${result.worst3Picks}, Movies created: ${result.moviesCreated}`
      );
    }

    // Calculate stats for this year
    const statsCount = await calculateAndUpdateStats(year, dryRun);
    totalStatsUpdated += statsCount;
  }

  // Summary
  console.log('\n\n📊 IMPORT SUMMARY');
  console.log('='.repeat(70));
  console.log(`Movies created: ${totalMoviesCreated}`);
  console.log(`TOP_10 picks: ${totalTop10Picks}`);
  console.log(`BEST_SEEN picks: ${totalBestSeenPicks}`);
  console.log(`WORST_3 picks: ${totalWorst3Picks}`);
  console.log(`Stats records updated: ${totalStatsUpdated}`);

  if (dryRun) {
    console.log('\n✅ Dry run completed. Run without --dry-run to apply changes.');
  } else {
    console.log('\n✅ Import completed successfully!');
  }

  await prisma.$disconnect();
  await pool.end();
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
