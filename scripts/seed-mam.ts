/**
 * MAM Data Import Script
 *
 * Imports movie picks data from JSON files into the database.
 *
 * Usage:
 *   npx tsx scripts/seed-mam.ts
 *   npx tsx scripts/seed-mam.ts --mapping=./user-mapping.json
 *   npx tsx scripts/seed-mam.ts --dry-run
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

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

// Fetch movie from TMDB
async function getMovieFromTMDB(imdbId: string): Promise<{
  id: number;
  title: string;
  release_date: string;
  original_language: string;
  original_title: string;
  poster_path: string;
  imdbId: string;
} | null> {
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
      id: movieData.id,
      title: movieData.title,
      release_date: movieData.release_date,
      original_language: movieData.original_language,
      original_title: movieData.original_title,
      poster_path: movieData.poster_path
        ? `https://image.tmdb.org/t/p/original${movieData.poster_path}`
        : '',
      imdbId,
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
  const dryRun = args.includes('--dry-run');
  const mappingArg = args.find((arg) => arg.startsWith('--mapping='));
  const mappingPath = mappingArg?.split('=')[1];

  console.log('🎬 MAM Data Import Script');
  console.log('========================');
  if (dryRun) console.log('🔍 DRY RUN MODE - No changes will be made\n');

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
  } else {
    console.log(
      'ℹ️  No user mapping provided. Run with --mapping=path/to/mapping.json\n'
    );
  }

  // Load JSON files
  const db2Path = path.resolve(__dirname, '../data/db_2.json');
  const mamRevPath = path.resolve(__dirname, '../data/mam_rev.json');

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

  console.log(`\n📊 Found ${allParticipants.size} unique participants`);

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

  if (dryRun) {
    console.log('🔍 DRY RUN - Would create:');
    console.log(`   - ${allParticipants.size} participants`);
    console.log(`   - Up to ${uniqueImdbIds.length} movies (minus existing)`);
    console.log(`   - ${allPicks.length} picks`);
    await prisma.$disconnect();
    return;
  }

  // Step 1: Create participants
  console.log('📝 Step 1: Creating participants...');
  const participantMap = new Map<string, number>(); // displayName -> id

  for (const displayName of allParticipants) {
    const slug = generateSlug(displayName);
    const userId = userMapping[displayName] || null;

    try {
      const participant = await prisma.mamParticipant.upsert({
        where: { slug },
        update: { displayName, userId },
        create: { displayName, slug, userId },
      });
      participantMap.set(displayName, participant.id);
    } catch (error) {
      console.error(
        `  ❌ Failed to create participant "${displayName}":`,
        error
      );
    }
  }
  console.log(`  ✅ Created/updated ${participantMap.size} participants\n`);

  // Step 2: Find or create movies
  console.log('📝 Step 2: Finding/creating movies...');

  // Check which movies already exist
  const existingMovies = await prisma.movie.findMany({
    where: { imdbId: { in: uniqueImdbIds } },
    select: { id: true, imdbId: true },
  });

  const movieMap = new Map<string, number>(); // imdbId -> id
  existingMovies.forEach((m) => movieMap.set(m.imdbId, m.id));

  console.log(
    `  ℹ️  ${existingMovies.length} movies already exist in database`
  );

  const missingImdbIds = uniqueImdbIds.filter((id) => !movieMap.has(id));
  console.log(
    `  ℹ️  ${missingImdbIds.length} movies need to be fetched from TMDB\n`
  );

  let created = 0;
  let failed = 0;

  for (let i = 0; i < missingImdbIds.length; i++) {
    const imdbId = missingImdbIds[i];
    process.stdout.write(
      `  Fetching ${i + 1}/${missingImdbIds.length}: ${imdbId}...`
    );

    const tmdbData = await getMovieFromTMDB(imdbId);

    if (tmdbData) {
      try {
        const movie = await prisma.movie.create({
          data: {
            title: tmdbData.title,
            originalTitle: tmdbData.original_title,
            originalLanguage: tmdbData.original_language,
            releaseDate: new Date(tmdbData.release_date || '1900-01-01'),
            letterboxdUrl: `https://letterboxd.com/tmdb/${tmdbData.id}`,
            imdbId: tmdbData.imdbId,
            posterUrl: tmdbData.poster_path,
          },
        });
        movieMap.set(imdbId, movie.id);
        created++;
        console.log(' ✅');
      } catch (error) {
        failed++;
        console.log(' ❌ DB error');
      }
    } else {
      failed++;
      console.log(' ❌ TMDB not found');
    }

    // Rate limiting: 40 requests per 10 seconds for TMDB
    if ((i + 1) % 35 === 0) {
      console.log('  ⏳ Rate limit pause (10s)...');
      await sleep(10000);
    } else {
      await sleep(100); // Small delay between requests
    }
  }

  console.log(`\n  ✅ Created ${created} movies, ${failed} failed\n`);

  // Step 3: Create picks
  console.log('📝 Step 3: Creating picks...');

  let picksCreated = 0;
  let picksSkipped = 0;
  let picksError = 0;

  // Process picks in batches
  const BATCH_SIZE = 100;
  for (let i = 0; i < allPicks.length; i += BATCH_SIZE) {
    const batch = allPicks.slice(i, i + BATCH_SIZE);

    const pickData = batch
      .map((pick) => {
        const participantId = participantMap.get(pick.participant);
        const movieId = movieMap.get(pick.imdbId);

        if (!participantId || !movieId) {
          picksSkipped++;
          return null;
        }

        return {
          participantId,
          movieId,
          score: pick.score,
        };
      })
      .filter((p): p is NonNullable<typeof p> => p !== null);

    try {
      const result = await prisma.mamPick.createMany({
        data: pickData,
        skipDuplicates: true,
      });
      picksCreated += result.count;
    } catch (error) {
      picksError += pickData.length;
      console.error(`  ❌ Batch error:`, error);
    }

    process.stdout.write(
      `\r  Progress: ${Math.min(i + BATCH_SIZE, allPicks.length)}/${
        allPicks.length
      }`
    );
  }

  console.log(`\n  ✅ Created ${picksCreated} picks`);
  console.log(`  ⚠️  Skipped ${picksSkipped} (missing movie/participant)`);
  if (picksError > 0) console.log(`  ❌ Errors: ${picksError}`);

  console.log('\n🎉 Import complete!');

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('Fatal error:', error);
  prisma.$disconnect();
  process.exit(1);
});
