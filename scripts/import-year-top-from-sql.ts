/**
 * Import YearTop data from SQL backup files into the database.
 *
 * This script:
 * 1. Extracts data from SQL backup files (YearTopPick, YearTopParticipant, YearTopMovieStats)
 * 2. Matches old movieIds to imdbIds via JSON files
 * 3. Gets or creates movies by imdbId
 * 4. Maps participants by slug/userId
 * 5. Imports data with remapped IDs
 *
 * Usage:
 *   npx tsx scripts/import-year-top-from-sql.ts --json-dir "data" --dry-run
 *   npx tsx scripts/import-year-top-from-sql.ts --json-dir "data"
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

// Interfaces for SQL data
interface SqlPick {
  id: number;
  participantId: number;
  movieId: number;
  year: number;
  pickType: YearTopPickType;
  isTopPosition: boolean;
  createdAt: Date;
}

interface SqlParticipant {
  id: number;
  year: number;
  displayName: string;
  slug: string;
  userId: string | null;
  createdAt: Date;
}

interface SqlStats {
  id: number;
  movieId: number;
  year: number;
  pickType: YearTopPickType;
  totalPoints: number;
}

// Interfaces for JSON data
interface MoviePick {
  position: number;
  movieName: string;
  tmdbId: number | null;
  tmdbTitle: string | null;
  imdbId: string | null;
  releaseDate: string | null;
  posterUrl?: string | null;
  originalLanguage?: string | null;
  originalTitle?: string | null;
}

interface ParticipantData {
  name: string;
  topPicks: MoviePick[];
  worstPicks: MoviePick[];
  bestSeen?: MoviePick[];
}

interface ProcessedData {
  year: number;
  participants: ParticipantData[];
}

function parseArgs(argv: string[]) {
  let jsonDir: string | undefined = undefined;
  let dryRun = false;
  let help = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === '--help' || arg === '-h') {
      help = true;
      continue;
    }

    if (arg === '--dry-run') {
      dryRun = true;
      continue;
    }

    if (arg === '--json-dir') {
      const next = argv[i + 1];
      if (!next) throw new Error('Missing value for --json-dir');
      jsonDir = next;
      i++;
      continue;
    }

    if (arg.startsWith('--json-dir=')) {
      jsonDir = arg.slice('--json-dir='.length);
      continue;
    }
  }

  return { jsonDir, dryRun, help };
}

function printHelp() {
  console.log(`
Usage: npx tsx scripts/import-year-top-from-sql.ts [options]

Options:
  --json-dir <path>   Directory containing JSON files (required)
  --dry-run           Run without making database changes
  --help, -h          Show this help message

Example:
  npx tsx scripts/import-year-top-from-sql.ts --json-dir data --dry-run
  npx tsx scripts/import-year-top-from-sql.ts --json-dir data
`);
}

/**
 * Extract picks from SQL INSERT statement
 */
function extractPicksFromSql(filePath: string): SqlPick[] {
  const content = fs.readFileSync(filePath, 'utf8');
  const picks: SqlPick[] = [];

  // Match: ('id', 'participantId', 'movieId', 'year', 'pickType', 'isTopPosition', 'createdAt')
  const regex = /\(['"](\d+)['"],\s*['"](\d+)['"],\s*['"](\d+)['"],\s*['"](\d+)['"],\s*['"](TOP_10|BEST_SEEN|WORST_3)['"],\s*['"](true|false)['"],\s*['"]([^'"]+)['"]\)/g;

  let match;
  while ((match = regex.exec(content)) !== null) {
    picks.push({
      id: parseInt(match[1], 10),
      participantId: parseInt(match[2], 10),
      movieId: parseInt(match[3], 10),
      year: parseInt(match[4], 10),
      pickType: match[5] as YearTopPickType,
      isTopPosition: match[6] === 'true',
      createdAt: new Date(match[7]),
    });
  }

  return picks;
}

/**
 * Extract participants from SQL INSERT statement
 */
function extractParticipantsFromSql(filePath: string): SqlParticipant[] {
  const content = fs.readFileSync(filePath, 'utf8');
  const participants: SqlParticipant[] = [];

  // Match: ('id', 'year', 'displayName', 'slug', 'userId', 'createdAt')
  // userId can be null
  // Pattern: either 'null' or a quoted string
  const regex = /\(['"](\d+)['"],\s*['"](\d+)['"],\s*['"]([^'"]*)['"],\s*['"]([^'"]*)['"],\s*(null|['"]([^'"]*)['"]),\s*['"]([^'"]+)['"]\)/g;

  let match;
  while ((match = regex.exec(content)) !== null) {
    // match[5] is either 'null' or the quoted string like 'abc'
    // match[6] is the unquoted string if userId is not null
    const userId = match[5] === 'null' ? null : (match[6] || null);
    participants.push({
      id: parseInt(match[1], 10),
      year: parseInt(match[2], 10),
      displayName: match[3],
      slug: match[4],
      userId: userId,
      createdAt: new Date(match[7]),
    });
  }

  return participants;
}

/**
 * Extract stats from SQL INSERT statement
 */
function extractStatsFromSql(filePath: string): SqlStats[] {
  const content = fs.readFileSync(filePath, 'utf8');
  const stats: SqlStats[] = [];

  // Match: ('id', 'movieId', 'year', 'pickType', 'totalPoints')
  const regex = /\(['"](\d+)['"],\s*['"](\d+)['"],\s*['"](\d+)['"],\s*['"](TOP_10|BEST_SEEN|WORST_3)['"],\s*['"](\d+)['"]\)/g;

  let match;
  while ((match = regex.exec(content)) !== null) {
    stats.push({
      id: parseInt(match[1], 10),
      movieId: parseInt(match[2], 10),
      year: parseInt(match[3], 10),
      pickType: match[4] as YearTopPickType,
      totalPoints: parseInt(match[5], 10),
    });
  }

  return stats;
}

/**
 * Load all processed JSON files from directory
 */
function loadJsonFiles(jsonDir: string): Map<number, ProcessedData> {
  const jsonFiles = fs.readdirSync(jsonDir).filter((f) => f.startsWith('year-top-') && f.endsWith('-processed.json'));
  const dataByYear = new Map<number, ProcessedData>();

  for (const file of jsonFiles) {
    const filePath = path.join(jsonDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const data: ProcessedData = JSON.parse(content);
    dataByYear.set(data.year, data);
  }

  return dataByYear;
}

/**
 * Match SQL picks to JSON picks and extract imdbIds
 * Returns mapping: oldMovieId -> imdbId
 */
function matchPicksToJson(
  sqlPicks: SqlPick[],
  sqlParticipants: SqlParticipant[],
  jsonDataByYear: Map<number, ProcessedData>
): Map<number, string> {
  const movieIdToImdbId = new Map<number, string>();
  const unmatchedPicks: SqlPick[] = [];

  // Create lookup map for participants: oldParticipantId -> displayName
  const participantIdToName = new Map<number, string>();
  for (const p of sqlParticipants) {
    participantIdToName.set(p.id, p.displayName);
  }

  for (const sqlPick of sqlPicks) {
    const participantName = participantIdToName.get(sqlPick.participantId);
    if (!participantName) {
      unmatchedPicks.push(sqlPick);
      continue;
    }

    const jsonData = jsonDataByYear.get(sqlPick.year);
    if (!jsonData) {
      unmatchedPicks.push(sqlPick);
      continue;
    }

    // Find participant in JSON
    const jsonParticipant = jsonData.participants.find((p) => {
      // Try exact match first
      if (p.name === participantName) return true;
      // Try case-insensitive
      if (p.name.toLowerCase() === participantName.toLowerCase()) return true;
      // Try with @ prefix stripped
      if (p.name.replace(/^@+/, '').trim() === participantName) return true;
      return false;
    });

    if (!jsonParticipant) {
      unmatchedPicks.push(sqlPick);
      continue;
    }

    // Determine which picks array to use
    let picksArray: MoviePick[] = [];
    if (sqlPick.pickType === 'TOP_10') {
      picksArray = jsonParticipant.topPicks || [];
    } else if (sqlPick.pickType === 'WORST_3') {
      picksArray = jsonParticipant.worstPicks || [];
    } else if (sqlPick.pickType === 'BEST_SEEN') {
      picksArray = jsonParticipant.bestSeen || [];
    }

    // Match by position
    // SQL picks are ordered: lowest position first, highest position last (isTopPosition=true)
    // JSON picks have position 1 = highest/best, position N = lowest/worst
    // So we need to reverse the order: SQL position 1 (first, lowest) = JSON position N (last)
    
    // Get all picks for this participant/year/type, sorted by SQL id (which reflects insertion order)
    const sameTypePicks = sqlPicks
      .filter(
        (p) =>
          p.participantId === sqlPick.participantId &&
          p.year === sqlPick.year &&
          p.pickType === sqlPick.pickType
      )
      .sort((a, b) => a.id - b.id); // Sort by SQL id to get insertion order

    // Find index of current pick in the sorted list
    const pickIndex = sameTypePicks.findIndex((p) => p.id === sqlPick.id);
    
    if (pickIndex === -1) {
      unmatchedPicks.push(sqlPick);
      continue;
    }

    // Calculate JSON position
    // For TOP_10: SQL has 10 picks, JSON has positions 1-10 (1 is best)
    //   SQL order: [10, 9, 8, ..., 2, 1] -> JSON positions: [10, 9, 8, ..., 2, 1]
    //   So: JSON position = total - pickIndex
    // For WORST_3: SQL has 3 picks, JSON has positions 1-3 (1 is worst)
    //   SQL order: [3, 2, 1] -> JSON positions: [3, 2, 1]
    //   So: JSON position = total - pickIndex
    // For BEST_SEEN: usually 1 pick, position 1
    const totalPicks = sameTypePicks.length;
    const jsonPosition = totalPicks - pickIndex;

    const matchedPick = picksArray.find((p) => p.position === jsonPosition);

    if (matchedPick && matchedPick.imdbId) {
      movieIdToImdbId.set(sqlPick.movieId, matchedPick.imdbId);
    } else {
      unmatchedPicks.push(sqlPick);
    }
  }

  if (unmatchedPicks.length > 0) {
    console.warn(`⚠️  Could not match ${unmatchedPicks.length} picks to JSON data`);
  }

  return movieIdToImdbId;
}

/**
 * Get or create movie by imdbId
 */
async function getOrCreateMovieByImdbId(
  imdbId: string,
  jsonData?: MoviePick,
  dryRun: boolean = false
): Promise<number | null> {
  // Check if movie already exists
  const existingMovie = await prisma.movie.findUnique({
    where: { imdbId },
    select: { id: true },
  });

  if (existingMovie) {
    return existingMovie.id;
  }

  if (dryRun) {
    return -1; // Placeholder for dry run
  }

  // Use JSON data if available, otherwise fetch from TMDB
  if (jsonData && jsonData.imdbId === imdbId) {
    const titleForUrl = (jsonData.originalTitle || jsonData.tmdbTitle || jsonData.movieName)
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');

    const movie = await prisma.movie.create({
      data: {
        title: jsonData.tmdbTitle || jsonData.movieName,
        originalTitle: jsonData.originalTitle || jsonData.tmdbTitle || jsonData.movieName,
        originalLanguage: jsonData.originalLanguage || 'en',
        releaseDate: jsonData.releaseDate ? new Date(jsonData.releaseDate) : new Date('1900-01-01'),
        letterboxdUrl: jsonData.tmdbId
          ? `https://letterboxd.com/tmdb/${jsonData.tmdbId}`
          : `https://letterboxd.com/film/${titleForUrl}/`,
        imdbId: imdbId,
        posterUrl: jsonData.posterUrl || '',
        tmdbId: jsonData.tmdbId || null,
      },
    });

    return movie.id;
  }

  // Fallback to TMDB API
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    console.warn(`⚠️  TMDB_API_KEY not set, cannot fetch movie data for ${imdbId}`);
    return null;
  }

  try {
    const response = await fetch(
      `https://api.themoviedb.org/3/find/${imdbId}?api_key=${apiKey}&external_source=imdb_id`
    );

    if (!response.ok) {
      console.warn(`⚠️  TMDB lookup failed for ${imdbId}: ${response.status}`);
      return null;
    }

    const result = (await response.json()) as {
      movie_results: Array<{
        id: number;
        title: string;
        release_date: string;
        original_language: string;
        original_title: string;
        poster_path: string | null;
      }>;
    };

    if (!result.movie_results?.[0]) {
      console.warn(`⚠️  No TMDB result for ${imdbId}`);
      return null;
    }

    const tmdbData = result.movie_results[0];
    const titleForUrl = (tmdbData.original_title || tmdbData.title)
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');

    const movie = await prisma.movie.create({
      data: {
        title: tmdbData.title,
        originalTitle: tmdbData.original_title || tmdbData.title,
        originalLanguage: tmdbData.original_language || 'en',
        releaseDate: tmdbData.release_date ? new Date(tmdbData.release_date) : new Date(),
        letterboxdUrl: `https://letterboxd.com/tmdb/${tmdbData.id}`,
        imdbId: imdbId,
        posterUrl: tmdbData.poster_path
          ? `https://image.tmdb.org/t/p/original${tmdbData.poster_path}`
          : '',
        tmdbId: tmdbData.id,
      },
    });

    return movie.id;
  } catch (error) {
    console.warn(`⚠️  Error fetching TMDB data for ${imdbId}:`, error);
    return null;
  }
}

/**
 * Get or create participant
 */
async function getOrCreateParticipant(
  participantData: SqlParticipant,
  dryRun: boolean
): Promise<number | null> {
  // Try to find by slug first
  let existing = await prisma.yearTopParticipant.findUnique({
    where: { slug: participantData.slug },
    select: { id: true },
  });

  // If not found and has userId, try by userId
  if (!existing && participantData.userId) {
    existing = await prisma.yearTopParticipant.findUnique({
      where: { userId: participantData.userId },
      select: { id: true },
    });
  }

  if (existing) {
    return existing.id;
  }

  if (dryRun) {
    return -1; // Placeholder for dry run
  }

  const participant = await prisma.yearTopParticipant.create({
    data: {
      displayName: participantData.displayName,
      slug: participantData.slug,
      userId: participantData.userId,
    },
  });

  return participant.id;
}

/**
 * Build movie ID mapping: oldMovieId -> newMovieId
 */
async function buildMovieIdMapping(
  oldMovieIds: Set<number>,
  movieIdToImdbId: Map<number, string>,
  jsonDataByYear: Map<number, ProcessedData>,
  dryRun: boolean = false
): Promise<Map<number, number>> {
  const mapping = new Map<number, number>();
  const imdbIdToJsonData = new Map<string, MoviePick>();

  // Build lookup for JSON movie data by imdbId
  for (const jsonData of jsonDataByYear.values()) {
    for (const participant of jsonData.participants) {
      for (const pick of [...(participant.topPicks || []), ...(participant.worstPicks || []), ...(participant.bestSeen || [])]) {
        if (pick.imdbId) {
          imdbIdToJsonData.set(pick.imdbId, pick);
        }
      }
    }
  }

  for (const oldMovieId of oldMovieIds) {
    const imdbId = movieIdToImdbId.get(oldMovieId);
    if (!imdbId) {
      console.warn(`⚠️  No imdbId found for old movieId ${oldMovieId}`);
      continue;
    }

    const jsonData = imdbIdToJsonData.get(imdbId);
    const newMovieId = await getOrCreateMovieByImdbId(imdbId, jsonData, dryRun);

    if (newMovieId) {
      mapping.set(oldMovieId, newMovieId);
    } else {
      console.warn(`⚠️  Could not get or create movie for imdbId ${imdbId} (old movieId ${oldMovieId})`);
    }
  }

  return mapping;
}

/**
 * Build participant ID mapping: oldParticipantId -> newParticipantId
 */
async function buildParticipantIdMapping(
  sqlParticipants: SqlParticipant[],
  dryRun: boolean
): Promise<Map<number, number>> {
  const mapping = new Map<number, number>();

  for (const sqlParticipant of sqlParticipants) {
    const newParticipantId = await getOrCreateParticipant(sqlParticipant, dryRun);
    if (newParticipantId) {
      mapping.set(sqlParticipant.id, newParticipantId);
    } else {
      console.warn(`⚠️  Could not get or create participant ${sqlParticipant.displayName} (old id ${sqlParticipant.id})`);
    }
  }

  return mapping;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printHelp();
    return;
  }

  if (!args.jsonDir) {
    throw new Error('--json-dir is required');
  }

  console.log('🔄 Import YearTop Data from SQL Backups');
  console.log('========================================\n');
  if (args.dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }

  // Load SQL backup files
  const dataDir = path.join(process.cwd(), 'data');
  const picksPath = path.join(dataDir, 'YearTopPick_rows.sql');
  const participantsPath = path.join(dataDir, 'YearTopParticipant_rows.sql');
  const statsPath = path.join(dataDir, 'YearTopMovieStats_rows.sql');

  if (!fs.existsSync(picksPath) || !fs.existsSync(participantsPath) || !fs.existsSync(statsPath)) {
    throw new Error('SQL backup files not found in data/ directory');
  }

  console.log('📄 Loading SQL backup files...');
  const sqlPicks = extractPicksFromSql(picksPath);
  const sqlParticipants = extractParticipantsFromSql(participantsPath);
  const sqlStats = extractStatsFromSql(statsPath);

  console.log(`  ✅ Loaded ${sqlPicks.length} picks`);
  console.log(`  ✅ Loaded ${sqlParticipants.length} participants`);
  console.log(`  ✅ Loaded ${sqlStats.length} stats\n`);

  // Load JSON files
  const jsonDir = path.resolve(args.jsonDir);
  if (!fs.existsSync(jsonDir)) {
    throw new Error(`JSON directory not found: ${jsonDir}`);
  }

  console.log('📄 Loading JSON files...');
  const jsonDataByYear = loadJsonFiles(jsonDir);
  console.log(`  ✅ Loaded ${jsonDataByYear.size} JSON files\n`);

  // Match picks to JSON to get imdbIds
  console.log('🔗 Matching SQL picks to JSON data...');
  const movieIdToImdbId = matchPicksToJson(sqlPicks, sqlParticipants, jsonDataByYear);
  console.log(`  ✅ Matched ${movieIdToImdbId.size} movies to imdbIds\n`);

  // Collect all unique movie IDs
  const allMovieIds = new Set<number>();
  for (const pick of sqlPicks) {
    allMovieIds.add(pick.movieId);
  }
  for (const stat of sqlStats) {
    allMovieIds.add(stat.movieId);
  }

  // Build movie ID mapping
  console.log('🎬 Getting or creating movies...');
  const movieIdMapping = await buildMovieIdMapping(allMovieIds, movieIdToImdbId, jsonDataByYear, args.dryRun);
  console.log(`  ✅ Mapped ${movieIdMapping.size} movies\n`);

  // Build participant ID mapping
  console.log('👥 Getting or creating participants...');
  const participantIdMapping = await buildParticipantIdMapping(sqlParticipants, args.dryRun);
  console.log(`  ✅ Mapped ${participantIdMapping.size} participants\n`);

  if (args.dryRun) {
    console.log('✅ Dry run completed. Run without --dry-run to import data.');
    await prisma.$disconnect();
    await pool.end();
    return;
  }

  // Participants are already created during mapping, so we just report
  console.log('📥 Participants...');
  console.log(`  ✅ ${participantIdMapping.size} participants ready\n`);

  // Import picks
  console.log('📥 Importing picks...');
  let picksCreated = 0;
  let picksSkipped = 0;
  const pickErrors: Array<{ pick: SqlPick; error: string }> = [];

  for (const sqlPick of sqlPicks) {
    const newParticipantId = participantIdMapping.get(sqlPick.participantId);
    const newMovieId = movieIdMapping.get(sqlPick.movieId);

    if (!newParticipantId || newParticipantId === -1 || !newMovieId || newMovieId === -1) {
      pickErrors.push({
        pick: sqlPick,
        error: `Missing mapping: participantId=${sqlPick.participantId}->${newParticipantId}, movieId=${sqlPick.movieId}->${newMovieId}`,
      });
      continue;
    }

    try {
      await prisma.yearTopPick.create({
        data: {
          participantId: newParticipantId,
          movieId: newMovieId,
          year: sqlPick.year,
          pickType: sqlPick.pickType,
          isTopPosition: sqlPick.isTopPosition,
        },
      });
      picksCreated++;
    } catch (error) {
      // Might be duplicate, check
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (errorMsg.includes('Unique constraint')) {
        picksSkipped++;
      } else {
        pickErrors.push({ pick: sqlPick, error: errorMsg });
      }
    }
  }

  console.log(`  ✅ Created ${picksCreated}, skipped ${picksSkipped}`);
  if (pickErrors.length > 0) {
    console.log(`  ⚠️  ${pickErrors.length} errors`);
    for (const err of pickErrors.slice(0, 10)) {
      console.log(`     - Pick ${err.pick.id}: ${err.error}`);
    }
    if (pickErrors.length > 10) {
      console.log(`     ... and ${pickErrors.length - 10} more`);
    }
  }
  console.log();

  // Import stats
  console.log('📥 Importing stats...');
  let statsCreated = 0;
  let statsSkipped = 0;
  const statErrors: Array<{ stat: SqlStats; error: string }> = [];

  for (const sqlStat of sqlStats) {
    const newMovieId = movieIdMapping.get(sqlStat.movieId);

    if (!newMovieId || newMovieId === -1) {
      statErrors.push({
        stat: sqlStat,
        error: `Missing movie mapping: movieId=${sqlStat.movieId}`,
      });
      continue;
    }

    try {
      await prisma.yearTopMovieStats.create({
        data: {
          movieId: newMovieId,
          year: sqlStat.year,
          pickType: sqlStat.pickType,
          totalPoints: sqlStat.totalPoints,
        },
      });
      statsCreated++;
    } catch (error) {
      // Might be duplicate, check
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (errorMsg.includes('Unique constraint')) {
        statsSkipped++;
      } else {
        statErrors.push({ stat: sqlStat, error: errorMsg });
      }
    }
  }

  console.log(`  ✅ Created ${statsCreated}, skipped ${statsSkipped}`);
  if (statErrors.length > 0) {
    console.log(`  ⚠️  ${statErrors.length} errors`);
    for (const err of statErrors.slice(0, 10)) {
      console.log(`     - Stat ${err.stat.id}: ${err.error}`);
    }
    if (statErrors.length > 10) {
      console.log(`     ... and ${statErrors.length - 10} more`);
    }
  }
  console.log();

  // Summary
  console.log('📊 IMPORT SUMMARY');
  console.log('='.repeat(50));
  console.log(`Movies mapped: ${movieIdMapping.size}`);
  console.log(`Participants mapped: ${participantIdMapping.size}`);
  console.log(`Picks: ${picksCreated} created, ${picksSkipped} skipped`);
  console.log(`Stats: ${statsCreated} created, ${statsSkipped} skipped`);
  if (pickErrors.length > 0 || statErrors.length > 0) {
    console.log(`Errors: ${pickErrors.length + statErrors.length}`);
  }
  console.log('\n✅ Import completed!');

  await prisma.$disconnect();
  await pool.end();
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
