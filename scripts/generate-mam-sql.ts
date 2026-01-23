/**
 * MAM SQL Import Generator
 *
 * Generates SQL import files from JSON data sources.
 * Fetches TMDB data once and caches it for reuse.
 *
 * Usage:
 *   npx tsx scripts/generate-mam-sql.ts
 *   npx tsx scripts/generate-mam-sql.ts --mapping=./user-mapping.json
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Types for JSON data
interface Db2Movie {
  'py/object': string;
  movie: {
    title: string;
    original_title: string;
    director: string;
    year: string;
    countries: string[];
  };
  points: number;
  idx: number;
  head_mentions: string[];
  body_mentions: string[];
}

interface MamRevMovie {
  title: string;
  original_title: string;
  director: string;
  year: string;
  countries: string[];
  head_mentions: string[];
  body_mentions: string[];
  new_head_mentions: string[];
  new_body_mentions: string[];
  points: number;
  new_points: number;
}

interface UserMapping {
  [participantName: string]: string; // participant name -> user ID
}

interface TMDBMovieResponse {
  movie_results: Array<{
    id: number;
    title: string;
    release_date: string;
    original_language: string;
    original_title: string;
    poster_path: string;
  }>;
}

interface CachedMovieData {
  tmdbId: number;
  title: string;
  release_date: string;
  original_language: string;
  original_title: string;
  poster_path: string;
}

interface MovieData {
  imdbId: string;
  tmdbId: number;
  title: string;
  originalTitle: string;
  originalLanguage: string;
  releaseDate: string;
  posterUrl: string;
}

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

// Escape SQL string
function escapeSqlString(str: string): string {
  return str.replace(/'/g, "''");
}

// Fetch movie from TMDB
async function getMovieFromTMDB(imdbId: string): Promise<CachedMovieData | null> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    throw new Error('TMDB_API_KEY not set in environment');
  }

  try {
    const response = await fetch(
      `https://api.themoviedb.org/3/find/${imdbId}?api_key=${apiKey}&external_source=imdb_id`
    );

    if (!response.ok) {
      console.error(`TMDB API error for ${imdbId}: ${response.status}`);
      return null;
    }

    const result = (await response.json()) as TMDBMovieResponse;

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

// Sleep helper for rate limiting
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const args = process.argv.slice(2);
  const mappingArg = args.find((arg) => arg.startsWith('--mapping='));
  const mappingPath = mappingArg?.split('=')[1];

  console.log('🎬 MAM SQL Import Generator');
  console.log('==========================\n');

  // Load user mapping if provided
  let userMapping: UserMapping = {};
  if (mappingPath) {
    try {
      const mappingContent = fs.readFileSync(mappingPath, 'utf8');
      userMapping = JSON.parse(mappingContent);
      console.log(
        `✅ Loaded user mapping with ${
          Object.keys(userMapping).length
        } entries\n`
      );
    } catch (error) {
      console.error(
        `❌ Failed to load user mapping from ${mappingPath}:`,
        error
      );
      process.exit(1);
    }
  }

  // Load JSON files
  const db2Path = path.resolve(__dirname, '../data/db_2.json');
  const mamRevPath = path.resolve(__dirname, '../data/mam_rev.json');
  const cachePath = path.resolve(__dirname, '../data/mam-movies-cache.json');

  let db2Data: Record<string, Db2Movie> = {};
  let mamRevData: Record<string, MamRevMovie> = {};

  try {
    db2Data = JSON.parse(fs.readFileSync(db2Path, 'utf8'));
    console.log(`✅ Loaded db_2.json: ${Object.keys(db2Data).length} movies`);
  } catch (error) {
    console.error(`❌ Failed to load ${db2Path}:`, error);
    process.exit(1);
  }

  try {
    mamRevData = JSON.parse(fs.readFileSync(mamRevPath, 'utf8'));
    console.log(
      `✅ Loaded mam_rev.json: ${Object.keys(mamRevData).length} movies`
    );
  } catch (error) {
    console.error(`❌ Failed to load ${mamRevPath}:`, error);
    process.exit(1);
  }

  // Load or initialize cache
  let cache: Record<string, CachedMovieData> = {};
  if (fs.existsSync(cachePath)) {
    try {
      cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
      console.log(`✅ Loaded cache: ${Object.keys(cache).length} movies\n`);
    } catch (error) {
      console.warn(`⚠️  Failed to load cache, starting fresh:`, error);
    }
  }

  // Collect all unique participants
  const allParticipants = new Set<string>();

  // From db_2
  Object.values(db2Data).forEach((movie) => {
    movie.head_mentions?.forEach((p) => allParticipants.add(p));
    movie.body_mentions?.forEach((p) => allParticipants.add(p));
  });

  // From mam_rev (only NEW mentions to avoid duplicates)
  Object.values(mamRevData).forEach((movie) => {
    movie.new_head_mentions?.forEach((p) => allParticipants.add(p));
    movie.new_body_mentions?.forEach((p) => allParticipants.add(p));
  });

  console.log(`📊 Found ${allParticipants.size} unique participants`);

  // Collect all picks data
  interface PickData {
    imdbId: string;
    participant: string;
    score: number;
  }

  const allPicks: PickData[] = [];

  // From db_2
  Object.entries(db2Data).forEach(([imdbId, movie]) => {
    movie.head_mentions?.forEach((participant) => {
      allPicks.push({ imdbId, participant, score: 5 });
    });
    movie.body_mentions?.forEach((participant) => {
      allPicks.push({ imdbId, participant, score: 1 });
    });
  });

  // From mam_rev (only NEW mentions)
  Object.entries(mamRevData).forEach(([imdbId, movie]) => {
    movie.new_head_mentions?.forEach((participant) => {
      allPicks.push({ imdbId, participant, score: 5 });
    });
    movie.new_body_mentions?.forEach((participant) => {
      allPicks.push({ imdbId, participant, score: 1 });
    });
  });

  console.log(`📊 Found ${allPicks.length} total picks to import`);

  // Get unique movie IDs needed
  const uniqueImdbIds = [...new Set(allPicks.map((p) => p.imdbId))];
  console.log(`📊 Found ${uniqueImdbIds.length} unique movies\n`);

  // Fetch TMDB data for missing movies
  const missingImdbIds = uniqueImdbIds.filter((id) => !cache[id]);
  console.log(
    `📡 Fetching TMDB data for ${missingImdbIds.length} missing movies...\n`
  );

  let fetched = 0;
  let failed = 0;

  for (let i = 0; i < missingImdbIds.length; i++) {
    const imdbId = missingImdbIds[i];
    process.stdout.write(
      `  Fetching ${i + 1}/${missingImdbIds.length}: ${imdbId}...`
    );

    const tmdbData = await getMovieFromTMDB(imdbId);

    if (tmdbData) {
      cache[imdbId] = tmdbData;
      fetched++;
      console.log(' ✅');
    } else {
      failed++;
      console.log(' ❌ Not found');
    }

    // Rate limiting: 40 requests per 10 seconds for TMDB
    if ((i + 1) % 35 === 0) {
      console.log('  ⏳ Rate limit pause (10s)...');
      await sleep(10000);
    } else {
      await sleep(100); // Small delay between requests
    }
  }

  // Save cache
  fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));
  console.log(`\n✅ Cached ${fetched} new movies, ${failed} failed\n`);

  // Prepare movie data
  const movies: MovieData[] = [];
  for (const imdbId of uniqueImdbIds) {
    const cached = cache[imdbId];
    if (cached) {
      movies.push({
        imdbId,
        tmdbId: cached.tmdbId,
        title: cached.title,
        originalTitle: cached.original_title,
        originalLanguage: cached.original_language,
        releaseDate: cached.release_date || '1900-01-01',
        posterUrl: cached.poster_path,
      });
    }
  }

  console.log(`📝 Generating SQL files...\n`);

  // Create sql directory
  const sqlDir = path.resolve(__dirname, '../sql');
  if (!fs.existsSync(sqlDir)) {
    fs.mkdirSync(sqlDir, { recursive: true });
  }

  // Generate movies SQL
  const moviesSql: string[] = [
    '-- MAM Movies Import',
    '-- Generated by generate-mam-sql.ts',
    '',
    'INSERT INTO "Movie" (title, "originalTitle", "originalLanguage", "releaseDate", "letterboxdUrl", "imdbId", "posterUrl", "tmdbId")',
    'VALUES',
  ];

  const movieValues = movies.map((m) => {
    const releaseDate = m.releaseDate || '1900-01-01';
    const letterboxdUrl = `https://letterboxd.com/tmdb/${m.tmdbId}`;
    const posterUrl = m.posterUrl || '';
    const posterUrlValue = posterUrl ? `'${escapeSqlString(posterUrl)}'` : 'NULL';
    return `  ('${escapeSqlString(m.title)}', '${escapeSqlString(
      m.originalTitle
    )}', '${escapeSqlString(m.originalLanguage)}', '${releaseDate}', '${letterboxdUrl}', '${m.imdbId}', ${posterUrlValue}, ${m.tmdbId})`;
  });

  moviesSql.push(movieValues.join(',\n'));
  moviesSql.push(
    'ON CONFLICT ("imdbId") DO UPDATE SET',
    '  "tmdbId" = EXCLUDED."tmdbId",',
    '  "posterUrl" = EXCLUDED."posterUrl",',
    '  title = EXCLUDED.title,',
    '  "originalTitle" = EXCLUDED."originalTitle",',
    '  "originalLanguage" = EXCLUDED."originalLanguage",',
    '  "releaseDate" = EXCLUDED."releaseDate",',
    '  "letterboxdUrl" = EXCLUDED."letterboxdUrl";',
    ''
  );

  const moviesSqlPath = path.join(sqlDir, 'mam-movies.sql');
  fs.writeFileSync(moviesSqlPath, moviesSql.join('\n'));
  console.log(`✅ Generated ${moviesSqlPath} (${movies.length} movies)`);

  // Generate participants SQL
  const participantsSql: string[] = [
    '-- MAM Participants Import',
    '-- Generated by generate-mam-sql.ts',
    '',
    'INSERT INTO "MamParticipant" ("displayName", slug, "userId")',
    'VALUES',
  ];

  const participantValues = Array.from(allParticipants).map((displayName) => {
    const slug = generateSlug(displayName);
    const userId = userMapping[displayName] || null;
    const userIdValue = userId ? `'${userId}'` : 'NULL';
    return `  ('${escapeSqlString(displayName)}', '${slug}', ${userIdValue})`;
  });

  participantsSql.push(participantValues.join(',\n'));
  participantsSql.push(
    'ON CONFLICT (slug) DO UPDATE SET',
    '  "displayName" = EXCLUDED."displayName",',
    '  "userId" = COALESCE(EXCLUDED."userId", "MamParticipant"."userId");',
    ''
  );

  const participantsSqlPath = path.join(sqlDir, 'mam-participants.sql');
  fs.writeFileSync(participantsSqlPath, participantsSql.join('\n'));
  console.log(
    `✅ Generated ${participantsSqlPath} (${allParticipants.size} participants)`
  );

  // Generate picks SQL
  const picksSql: string[] = [
    '-- MAM Picks Import',
    '-- Generated by generate-mam-sql.ts',
    '',
    'INSERT INTO "MamPick" ("participantId", "movieId", score)',
  ];

  // Group picks by participant and movie for better SQL generation
  const pickGroups = new Map<string, Map<string, number>>(); // participant -> imdbId -> score
  for (const pick of allPicks) {
    if (!pickGroups.has(pick.participant)) {
      pickGroups.set(pick.participant, new Map());
    }
    const participantPicks = pickGroups.get(pick.participant)!;
    // Use max score if same participant has multiple picks for same movie
    const existingScore = participantPicks.get(pick.imdbId) || 0;
    participantPicks.set(pick.imdbId, Math.max(existingScore, pick.score));
  }

  // Generate SELECT statements for each pick
  const pickStatements: string[] = [];
  for (const [participant, imdbPicks] of pickGroups) {
    const slug = generateSlug(participant);
    for (const [imdbId, score] of imdbPicks) {
      pickStatements.push(
        `SELECT p.id, m.id, ${score} FROM "MamParticipant" p, "Movie" m WHERE p.slug = '${slug}' AND m."imdbId" = '${imdbId}'`
      );
    }
  }

  picksSql.push(pickStatements.join('\nUNION ALL\n'));
  picksSql.push(
    'ON CONFLICT ("participantId", "movieId") DO UPDATE SET',
    '  score = EXCLUDED.score;',
    ''
  );

  const picksSqlPath = path.join(sqlDir, 'mam-picks.sql');
  fs.writeFileSync(picksSqlPath, picksSql.join('\n'));
  console.log(`✅ Generated ${picksSqlPath} (${allPicks.length} picks)`);

  console.log('\n🎉 SQL generation complete!');
  console.log('\nTo import, run:');
  console.log('  psql $DATABASE_URL -f sql/mam-movies.sql');
  console.log('  psql $DATABASE_URL -f sql/mam-participants.sql');
  console.log('  psql $DATABASE_URL -f sql/mam-picks.sql');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
