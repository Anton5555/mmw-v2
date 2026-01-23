/**
 * MAM Special Mentions SQL Import Generator
 *
 * Generates SQL INSERT statements to create special mention picks.
 * Reads CSV file and creates MamPick records with isSpecialMention: true.
 *
 * Usage:
 *   npx tsx scripts/generate-mam-special-mentions-sql.ts --csv=path/to/MAMciones Especiales.csv
 */

import { parse as parseCsv } from 'csv-parse/sync';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// TMDB types
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

// Types
interface CsvSpecialMentionRow {
  position: string;
  movieTitle: string;
  usuario: string;
  imdbLink: string;
  review: string;
}

// Participant name mappings: CSV usuario -> DB displayName
const PARTICIPANT_NAME_MAPPINGS: Record<string, string> = {
  '@clauhernan73': 'claudiohernan73',
  clauhernan73: 'claudiohernan73',
  '@MatiasGilRobert': '110x75',
  MatiasGilRobert: '110x75',
  'Alan Gabriel': 'alangmonzon',
  'Biam!': 'ponybiam',
};

function normalizeNewlines(text: string): string {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

function generateSlug(displayName: string): string {
  return displayName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
}

function escapeSqlString(str: string): string {
  return str.replace(/'/g, "''").replace(/\\/g, '\\\\');
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

// Extract IMDB ID from URL or text
function extractImdbId(text: string): string | null {
  if (!text) return null;
  
  // Try to extract from URL pattern
  const urlMatch = text.match(/tt\d{7,8}/);
  if (urlMatch) return urlMatch[0];
  
  // Try direct tt pattern
  const directMatch = text.match(/^tt\d{7,8}$/);
  if (directMatch) return directMatch[0];
  
  return null;
}

function readCsvFile(filePath: string): CsvSpecialMentionRow[] {
  const content = fs.readFileSync(filePath, 'utf8');
  const records = parseCsv(content, {
    columns: false, // No headers - parse as arrays
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
    trim: true,
  }) as string[][];

  // CSV structure: Position, Película, Usuario, lINK IMDB, Reseña
  // Reseña can span multiple lines and may be quoted
  const rows: CsvSpecialMentionRow[] = [];
  
  for (const record of records) {
    // Skip header row if it exists
    if (record.length === 0) continue;
    if (record[0]?.toLowerCase().includes('posición') || record[0]?.toLowerCase().includes('position')) {
      continue;
    }
    
    // CSV columns: Position (0), Movie Title (1), Username (2), IMDB Link (3), Review (4+)
    const position = record[0] || '';
    const movieTitle = record[1] || '';
    const usuario = record[2] || '';
    const imdbLink = record[3] || '';
    const review = record.slice(4).join(',').trim() || ''; // Join remaining columns as review
    
    if (!position || !movieTitle || !usuario || !imdbLink) {
      continue; // Skip incomplete rows
    }
    
    rows.push({
      position,
      movieTitle,
      usuario,
      imdbLink,
      review: normalizeNewlines(review),
    });
  }
  
  return rows;
}

async function main() {
  const args = process.argv.slice(2);
  let csvPath: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--csv' && args[i + 1]) {
      csvPath = args[i + 1];
      i++;
    } else if (arg.startsWith('--csv=')) {
      csvPath = arg.slice('--csv='.length);
    }
  }

  if (!csvPath) {
    console.error('❌ No CSV file provided. Use --csv=path/to/file.csv');
    process.exit(1);
  }

  console.log('🎬 MAM Special Mentions SQL Import Generator');
  console.log('===========================================\n');

  // Load and parse CSV
  const absCsvPath = path.resolve(csvPath);
  let specialMentions: CsvSpecialMentionRow[] = [];
  
  try {
    specialMentions = readCsvFile(absCsvPath);
    console.log(`✅ Loaded CSV: ${absCsvPath} (${specialMentions.length} rows)\n`);
  } catch (error) {
    console.error(`❌ Failed to load ${absCsvPath}:`, error);
    process.exit(1);
  }

  // Process special mentions
  const processedMentions: Array<{
    position: string;
    usuario: string;
    slug: string;
    imdbId: string;
    review: string;
  }> = [];

  let skippedNoImdb = 0;
  let skippedNoUsuario = 0;

  for (const sm of specialMentions) {
    if (!sm.usuario) {
      skippedNoUsuario++;
      continue;
    }

    const imdbId = extractImdbId(sm.imdbLink);
    if (!imdbId) {
      skippedNoImdb++;
      console.warn(`⚠️  Skipped ${sm.position}|${sm.usuario}|${sm.movieTitle} - No IMDB ID found in: ${sm.imdbLink}`);
      continue;
    }

    // Map usuario to displayName
    const displayName = PARTICIPANT_NAME_MAPPINGS[sm.usuario] ?? sm.usuario;
    const slug = generateSlug(displayName);

    processedMentions.push({
      position: sm.position,
      usuario: displayName,
      slug,
      imdbId,
      review: sm.review,
    });
  }

  console.log(`📊 Processed ${processedMentions.length} special mentions`);
  if (skippedNoImdb > 0) console.log(`⚠️  Skipped ${skippedNoImdb} (no IMDB ID)`);
  if (skippedNoUsuario > 0) console.log(`⚠️  Skipped ${skippedNoUsuario} (no usuario)`);
  console.log('');

  // Get unique IMDb IDs from processed mentions
  const uniqueImdbIds = [...new Set(processedMentions.map(m => m.imdbId))];
  console.log(`📊 Found ${uniqueImdbIds.length} unique movies\n`);

  // Load or initialize cache
  const cachePath = path.resolve(__dirname, '../data/mam-movies-cache.json');
  let cache: Record<string, CachedMovieData> = {};
  if (fs.existsSync(cachePath)) {
    try {
      cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
      console.log(`✅ Loaded cache: ${Object.keys(cache).length} movies\n`);
    } catch (error) {
      console.warn(`⚠️  Failed to load cache, starting fresh:`, error);
    }
  }

  // Fetch TMDB data for missing movies
  const missingImdbIds = uniqueImdbIds.filter((id) => !cache[id]);
  if (missingImdbIds.length > 0) {
    console.log(`📡 Fetching TMDB data for ${missingImdbIds.length} missing movies...\n`);

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
  } else {
    console.log(`✅ All movies already in cache\n`);
  }

  // Prepare movie data for SQL
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

  // Generate SQL
  console.log('📝 Generating SQL file...\n');

  const sqlDir = path.resolve(__dirname, '../sql');
  if (!fs.existsSync(sqlDir)) {
    fs.mkdirSync(sqlDir, { recursive: true });
  }

  const sql: string[] = [
    '-- MAM Special Mentions Import',
    '-- Generated by generate-mam-special-mentions-sql.ts',
    '-- Creates missing movies and MamPick records with isSpecialMention: true, score: 0',
    '-- Skips if participant already has a special mention for this movie',
    '-- Note: Special mentions can coexist with regular picks for the same movie+participant',
    '',
  ];

  // First, insert missing movies
  if (movies.length > 0) {
    sql.push('-- Insert missing movies');
    sql.push('INSERT INTO "Movie" (title, "originalTitle", "originalLanguage", "releaseDate", "letterboxdUrl", "imdbId", "posterUrl", "tmdbId")');
    sql.push('VALUES');

    const movieValues = movies.map((m) => {
      const releaseDate = m.releaseDate || '1900-01-01';
      const letterboxdUrl = `https://letterboxd.com/tmdb/${m.tmdbId}`;
      const posterUrl = m.posterUrl || '';
      const posterUrlValue = posterUrl ? `'${escapeSqlString(posterUrl)}'` : 'NULL';
      return `  ('${escapeSqlString(m.title)}', '${escapeSqlString(
        m.originalTitle
      )}', '${escapeSqlString(m.originalLanguage)}', '${releaseDate}', '${letterboxdUrl}', '${m.imdbId}', ${posterUrlValue}, ${m.tmdbId})`;
    });

    sql.push(movieValues.join(',\n'));
    sql.push('ON CONFLICT ("imdbId") DO UPDATE SET');
    sql.push('  "tmdbId" = EXCLUDED."tmdbId",');
    sql.push('  "posterUrl" = EXCLUDED."posterUrl",');
    sql.push('  title = EXCLUDED.title,');
    sql.push('  "originalTitle" = EXCLUDED."originalTitle",');
    sql.push('  "originalLanguage" = EXCLUDED."originalLanguage",');
    sql.push('  "releaseDate" = EXCLUDED."releaseDate",');
    sql.push('  "letterboxdUrl" = EXCLUDED."letterboxdUrl";');
    sql.push('');
  }

  // Then, insert special mentions
  sql.push('-- Insert special mention picks');
  sql.push('INSERT INTO "MamPick" ("participantId", "movieId", score, review, "isSpecialMention")');
  sql.push('SELECT');
  sql.push('  p.id AS "participantId",');
  sql.push('  m.id AS "movieId",');
  sql.push('  0 AS score,');
  sql.push('  mentions.review,');
  sql.push('  true AS "isSpecialMention"');
  sql.push('FROM (');
  sql.push('  VALUES');

  // Build VALUES clause with reviews
  const values: string[] = [];
  for (const sm of processedMentions) {
    const reviewValue = sm.review ? `'${escapeSqlString(sm.review)}'` : 'NULL';
    values.push(`    ('${sm.slug}', '${sm.imdbId}', ${reviewValue})`);
  }

  sql.push(values.join(',\n'));
  sql.push(') AS mentions(participant_slug, imdb_id, review)');
  sql.push('JOIN "MamParticipant" p ON p.slug = mentions.participant_slug');
  sql.push('JOIN "Movie" m ON m."imdbId" = mentions.imdb_id');
  sql.push('WHERE NOT EXISTS (');
  sql.push('  SELECT 1 FROM "MamPick" mp');
  sql.push('  WHERE mp."participantId" = p.id');
  sql.push('    AND mp."movieId" = m.id');
  sql.push('    AND mp."isSpecialMention" = true');
  sql.push(');');
  sql.push('');

  const sqlPath = path.join(sqlDir, 'mam-special-mentions.sql');
  fs.writeFileSync(sqlPath, sql.join('\n'));
  
  const fileSize = fs.statSync(sqlPath).size;
  console.log(`✅ Generated ${sqlPath}`);
  console.log(`   ${movies.length} movies (created if missing)`);
  console.log(`   ${processedMentions.length} special mentions`);
  console.log(`   ${(fileSize / 1024).toFixed(1)} KB`);
  console.log('\nTo import, run:');
  console.log('  psql $DATABASE_URL -f sql/mam-special-mentions.sql');
  console.log('\nNote: This creates missing movies automatically.');
  console.log('      Skips if participant already has a special mention for the movie.');
  console.log('      Special mentions can coexist with regular picks.');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
