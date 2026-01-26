/**
 * Import 2022 Year Top Data from CSV
 *
 * Imports year top data from CSV file (Top 5 MM 2022 para importar - Lista.csv)
 * into the database, creating YearTopParticipant, YearTopPick, and YearTopMovieStats records.
 *
 * Usage:
 *   npx tsx scripts/import-2022-year-top-csv.ts
 *   npx tsx scripts/import-2022-year-top-csv.ts --dry-run
 */

import { PrismaClient, YearTopPickType } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import { parse as parseCsv } from 'csv-parse/sync';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const YEAR = 2022;

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
async function getOrCreateMovie(imdbId: string | null, dryRun: boolean): Promise<{ movieId: number; wasCreated: boolean } | null> {
  if (!imdbId || !imdbId.trim()) {
    return null;
  }

  // Trim whitespace from IMDB ID
  const trimmedImdbId = imdbId.trim();

  // Check if movie already exists
  const existingMovie = await prisma.movie.findUnique({
    where: { imdbId: trimmedImdbId },
    select: { id: true },
  });

  if (existingMovie) {
    return { movieId: existingMovie.id, wasCreated: false };
  }

  // Fetch from TMDB to validate movie exists
  console.log(`  Fetching movie data for ${trimmedImdbId}...`);
  const movieData = await getMovieFromTMDB(trimmedImdbId);
  if (!movieData) {
    console.warn(`  ⚠️  Could not fetch movie data for ${trimmedImdbId}`);
    return null;
  }

  if (dryRun) {
    console.log(`  ✅ Would create movie: ${movieData.title} (${trimmedImdbId})`);
    // In dry run, return a placeholder ID (won't be used since we don't create picks)
    return { movieId: -1, wasCreated: true };
  }

  // Create movie
  const movie = await prisma.movie.create({
    data: {
      title: movieData.title,
      originalTitle: movieData.original_title,
      originalLanguage: movieData.original_language,
      releaseDate: new Date(movieData.release_date || '1900-01-01'),
      letterboxdUrl: `https://letterboxd.com/tmdb/${movieData.tmdbId}`,
      imdbId: trimmedImdbId,
      posterUrl: movieData.poster_path || '',
      tmdbId: movieData.tmdbId,
    },
  });

  // Rate limiting
  await sleep(250);

  return { movieId: movie.id, wasCreated: true };
}

// Get or create participant
async function getOrCreateParticipant(displayName: string, dryRun: boolean): Promise<number | null> {
  const trimmedDisplayName = displayName.trim();
  if (!trimmedDisplayName) {
    return null;
  }

  const slug = generateSlug(trimmedDisplayName);

  if (dryRun) {
    // In dry run, check if participant exists
    const existing = await prisma.yearTopParticipant.findUnique({
      where: { slug },
      select: { id: true, displayName: true },
    });

    if (existing) {
      console.log(`  ✅ Participant exists: ${existing.displayName} (ID: ${existing.id})`);
      return existing.id;
    } else {
      console.log(`  ➕ Would create participant: ${trimmedDisplayName} (slug: ${slug})`);
      return null; // Return null in dry run to indicate it would be created
    }
  }

  const participant = await prisma.yearTopParticipant.upsert({
    where: { slug },
    update: {
      displayName: trimmedDisplayName, // Update display name in case it changed
    },
    create: {
      displayName: trimmedDisplayName,
      slug,
    },
  });

  return participant.id;
}

// Process picks for a participant
async function processParticipantPicks(
  participantId: number | null,
  displayName: string,
  topPicks: string[],
  porongaPicks: string[],
  dryRun: boolean
): Promise<{
  top10Picks: number;
  worst3Picks: number;
  moviesCreated: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let top10Picks = 0;
  let worst3Picks = 0;
  let moviesCreated = 0;

  if (!participantId) {
    errors.push('Participant not found/created');
    return { top10Picks, worst3Picks, moviesCreated, errors };
  }

  // Process TOP_10 picks (TOP 5 to TOP 1, where TOP 1 is rank 1 and isTopPosition)
  for (let i = 0; i < topPicks.length; i++) {
    const imdbId = topPicks[i];
    if (!imdbId || !imdbId.trim()) {
      continue;
    }

    const rank = topPicks.length - i; // TOP 5 = rank 5, TOP 1 = rank 1
    const isTopPosition = rank === 1;

    const movieResult = await getOrCreateMovie(imdbId, dryRun);
    if (!movieResult) {
      errors.push(`Could not create/find movie for ${imdbId.trim()}`);
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
            year: YEAR,
            pickType: YearTopPickType.TOP_10,
          },
        },
        update: {
          isTopPosition,
        },
        create: {
          participantId,
          movieId: movieResult.movieId,
          year: YEAR,
          pickType: YearTopPickType.TOP_10,
          isTopPosition,
        },
      });
    }

    top10Picks++;
  }

  // Process WORST_3 picks (PORONGA 5 to PORONGA 1, where PORONGA 1 is rank 1 and isTopPosition)
  for (let i = 0; i < porongaPicks.length; i++) {
    const imdbId = porongaPicks[i];
    if (!imdbId || !imdbId.trim()) {
      continue;
    }

    const rank = porongaPicks.length - i; // PORONGA 5 = rank 5, PORONGA 1 = rank 1
    const isTopPosition = rank === 1;

    const movieResult = await getOrCreateMovie(imdbId, dryRun);
    if (!movieResult) {
      errors.push(`Could not create/find movie for ${imdbId.trim()}`);
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
            year: YEAR,
            pickType: YearTopPickType.WORST_3,
          },
        },
        update: {
          isTopPosition,
        },
        create: {
          participantId,
          movieId: movieResult.movieId,
          year: YEAR,
          pickType: YearTopPickType.WORST_3,
          isTopPosition,
        },
      });
    }

    worst3Picks++;
  }

  return { top10Picks, worst3Picks, moviesCreated, errors };
}

// Calculate and update YearTopMovieStats
async function calculateAndUpdateStats(dryRun: boolean) {
  console.log(`\n📊 Calculating stats for year ${YEAR}...`);

  // Get all picks for this year, grouped by movie, pickType
  const picks = await prisma.yearTopPick.findMany({
    where: { year: YEAR },
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
            year: YEAR,
            pickType,
          },
        },
        update: {
          totalPoints,
        },
        create: {
          movieId,
          year: YEAR,
          pickType,
          totalPoints,
        },
      });
    }

    statsUpdated++;
  }

  console.log(`  ✅ ${dryRun ? 'Would update' : 'Updated'} ${statsUpdated} stats records`);
  return statsUpdated;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  console.log('🎬 Import 2022 Year Top Data from CSV');
  console.log('=====================================\n');
  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }

  const csvFilePath = path.join(process.cwd(), 'data', 'Top 5 MM 2022 para importar - Lista.csv');
  if (!fs.existsSync(csvFilePath)) {
    throw new Error(`CSV file not found: ${csvFilePath}`);
  }

  console.log(`📁 Reading CSV file: ${csvFilePath}\n`);

  // Read and parse CSV
  const csvContent = fs.readFileSync(csvFilePath, 'utf8');
  const records = parseCsv(csvContent, {
    skip_empty_lines: true,
    relax_column_count: true,
  }) as string[][];

  // Skip first 2 rows (header rows)
  const dataRows = records.slice(2);

  console.log(`Found ${dataRows.length} participant rows\n`);

  let totalMoviesCreated = 0;
  let totalTop10Picks = 0;
  let totalWorst3Picks = 0;
  let totalStatsUpdated = 0;
  let participantsCreated = 0;
  let participantsFound = 0;
  const allErrors: string[] = [];

  // Process each participant row
  for (const row of dataRows) {
    if (row.length < 2) {
      console.warn(`⚠️  Skipping row with insufficient columns: ${row.join(',')}`);
      continue;
    }

    const displayName = row[0]?.trim();
    if (!displayName) {
      console.warn(`⚠️  Skipping row with empty display name`);
      continue;
    }

    console.log(`\n👤 Processing participant: ${displayName}`);

    // Extract picks
    // Columns: MMITER, TOP 5, TOP 4, TOP 3, TOP 2, TOP 1, PORONGA 5, PORONGA 4, PORONGA 3, PORONGA 2, PORONGA 1
    const topPicks = [row[1], row[2], row[3], row[4], row[5]].filter(Boolean); // TOP 5 to TOP 1
    const porongaPicks = [row[6], row[7], row[8], row[9], row[10]].filter(Boolean); // PORONGA 5 to PORONGA 1

    // Get or create participant
    const participantId = await getOrCreateParticipant(displayName, dryRun);
    
    if (participantId) {
      participantsFound++;
    } else if (!dryRun) {
      // This shouldn't happen in non-dry-run, but handle it
      console.warn(`  ⚠️  Could not create participant: ${displayName}`);
      continue;
    } else {
      participantsCreated++;
    }

    if (participantId) {
      // Process picks
      const result = await processParticipantPicks(participantId, displayName, topPicks, porongaPicks, dryRun);

      totalMoviesCreated += result.moviesCreated;
      totalTop10Picks += result.top10Picks;
      totalWorst3Picks += result.worst3Picks;
      allErrors.push(...result.errors.map((e) => `${displayName}: ${e}`));

      console.log(
        `    ✅ TOP_10: ${result.top10Picks}, WORST_3: ${result.worst3Picks}, Movies ${result.moviesCreated > 0 ? `created: ${result.moviesCreated}` : 'found'}`
      );

      if (result.errors.length > 0) {
        console.log(`    ⚠️  Errors: ${result.errors.join(', ')}`);
      }
    } else {
      // In dry run, still validate movies even if participant doesn't exist
      if (dryRun) {
        console.log(`    🔍 Validating movies (participant would be created)...`);
        const allImdbIds = [...topPicks, ...porongaPicks].filter(Boolean);
        let validatedCount = 0;
        let errorCount = 0;

        for (const imdbId of allImdbIds) {
          const movieResult = await getOrCreateMovie(imdbId, dryRun);
          if (movieResult) {
            validatedCount++;
          } else {
            errorCount++;
            allErrors.push(`${displayName}: Could not validate movie ${imdbId.trim()}`);
          }
        }

        console.log(`    ✅ Validated ${validatedCount} movies${errorCount > 0 ? `, ${errorCount} errors` : ''}`);
        if (errorCount > 0) {
          console.log(`    ⚠️  Some movies could not be validated`);
        }
      } else {
        console.log(`    ⏭️  Skipping picks (participant would be created)`);
      }
    }
  }

  // Calculate stats
  const statsCount = await calculateAndUpdateStats(dryRun);
  totalStatsUpdated += statsCount;

  // Summary
  console.log('\n\n📊 IMPORT SUMMARY');
  console.log('='.repeat(70));
  console.log(`Participants found: ${participantsFound}`);
  if (dryRun) {
    console.log(`Participants that would be created: ${participantsCreated}`);
  }
  console.log(`Movies created: ${totalMoviesCreated}`);
  console.log(`TOP_10 picks: ${totalTop10Picks}`);
  console.log(`WORST_3 picks: ${totalWorst3Picks}`);
  console.log(`Stats records ${dryRun ? 'that would be' : ''} updated: ${totalStatsUpdated}`);

  if (allErrors.length > 0) {
    console.log(`\n⚠️  ERRORS (${allErrors.length}):`);
    allErrors.forEach((error) => console.log(`  - ${error}`));
  }

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
