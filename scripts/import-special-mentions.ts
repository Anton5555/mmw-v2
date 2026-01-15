/**
 * Import special mentions from the "Comentarios MAM - MAMciones Especiales.csv" file.
 *
 * This script creates MamPick records with isSpecialMention: true for special mentions.
 * It will also create movies if they don't exist (fetches from TMDB).
 * Participants must already exist.
 *
 * CSV structure: Position, Película, Usuario, lINK IMDB, Reseña
 *
 * Behavior:
 * - Matches participants by username (similar to import-mam-reviews.ts logic)
 * - Matches movies by IMDB ID
 * - Creates movies from TMDB if they don't exist
 * - Checks if participant already has a regular pick for this movie - if so, skips it
 * - Creates MamPick with isSpecialMention: true, score: 0
 *
 * Usage (PowerShell):
 *   npx tsx scripts/import-special-mentions.ts --dry-run `
 *     --csv "C:\Users\anton\Downloads\Comentarios MAM - MAMciones Especiales.csv"
 *
 * Then run again without --dry-run to apply changes.
 */
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { parse as parseCsv } from 'csv-parse/sync';
import * as fs from 'fs';
import * as path from 'path';
import * as process from 'process';
import 'dotenv/config';
import { promisify } from 'util';

const writeFileAsync = promisify(fs.writeFile);

type CsvSpecialMentionRow = {
  position: string;
  movieTitle: string;
  usuario: string;
  imdbLink: string;
  review: string;
};

function normalizeNewlines(text: string): string {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

function compactAlphaNum(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '');
}

function stripLeadingAt(text: string): string {
  return text.replace(/^@+/, '').trim();
}

// Same as scripts/seed-mam.ts and import-mam-reviews.ts
function generateSlug(displayName: string): string {
  return displayName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Participant name mappings: CSV usuario -> DB displayName
const PARTICIPANT_NAME_MAPPINGS: Record<string, string> = {
  '@clauhernan73': 'claudiohernan73',
  clauhernan73: 'claudiohernan73',
  '@MatiasGilRobert': '110x75',
  MatiasGilRobert: '110x75',
  'Alan Gabriel': 'alangmonzon',
  'Biam!': 'ponybiam',
  antonmq: 'antonmq',
  Sannte: 'Sannte',
  Mauro: 'Mauro',
  Alan: 'Alan',
  Juan: 'Juan',
};

// Direct participant ID mappings for cases where slug/displayName matching fails
// CSV usuario -> participant ID
const PARTICIPANT_ID_MAPPINGS: Record<string, number> = {
  antonmq: 10,
  Sannte: 54,
  Mauro: 8,
  Alan: 25,
  Juan: 32,
  Clauhernan73: 45,
  clauhernan73: 45,
  '@clauhernan73': 45,
  Leandro: 36,
  Hernan: 20,
  'Matias Mayer': 53,
  'MatiasMayer': 53,
  Dan: 51,
  Edgardo: 33,
};

// Extract IMDB ID from URL or text
function extractImdbId(text: string): string | null {
  if (!text) return null;
  
  // Try to extract from URL pattern
  const urlMatch = text.match(/tt\d+/);
  if (urlMatch) return urlMatch[0];
  
  // Try direct tt pattern
  const directMatch = text.match(/^tt\d+$/);
  if (directMatch) return directMatch[0];
  
  return null;
}

// TMDB API types and function
interface TMDBMovieResponse {
  movie_results: Array<{
    id: number;
    title: string;
    release_date: string;
    original_language: string;
    original_title: string;
    poster_path: string | null;
  }>;
}

async function getMovieFromTMDB(imdbId: string): Promise<{
  id: number;
  title: string;
  original_title: string;
  original_language: string;
  release_date: string;
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

    if (!result.movie_results || result.movie_results.length === 0) {
      console.error(`No TMDB result for ${imdbId}`);
      return null;
    }

    const movieData = result.movie_results[0];
    return {
      id: movieData.id,
      title: movieData.title,
      original_title: movieData.original_title,
      original_language: movieData.original_language,
      release_date: movieData.release_date || '1900-01-01',
      poster_path: movieData.poster_path || '', // Just the path (e.g., "/abc123.jpg")
      imdbId,
    };
  } catch (error) {
    console.error(`Error fetching TMDB data for ${imdbId}:`, error);
    return null;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const csvIndex = args.indexOf('--csv');
  
  if (csvIndex === -1 || !args[csvIndex + 1]) {
    console.error('Usage: npx tsx scripts/import-special-mentions.ts [--dry-run] --csv <path>');
    process.exit(1);
  }
  
  const csvPath = args[csvIndex + 1];
  
  if (!fs.existsSync(csvPath)) {
    console.error(`CSV file not found: ${csvPath}`);
    process.exit(1);
  }
  
  console.log(`📄 Reading CSV: ${csvPath}`);
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const records = parseCsv(csvContent, {
    columns: false, // No headers - parse as arrays
    skip_empty_lines: true,
    trim: true,
  }) as Array<string[]>;
  
  console.log(`📊 Found ${records.length} rows in CSV\n`);
  
  // Parse CSV rows
  // CSV structure: Position, Movie Title, Username, IMDB Link, Review
  const specialMentions: CsvSpecialMentionRow[] = [];
  for (const record of records) {
    // Skip header row if it exists (check if first column looks like a header)
    if (record.length === 0) continue;
    if (record[0]?.toLowerCase().includes('posición') || record[0]?.toLowerCase().includes('position')) {
      continue; // Skip header row
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
    
    specialMentions.push({
      position,
      movieTitle,
      usuario: normalizeNewlines(usuario),
      imdbLink: normalizeNewlines(imdbLink),
      review: normalizeNewlines(review),
    });
  }
  
  console.log(`📝 Parsed ${specialMentions.length} special mentions\n`);
  
  // Initialize Prisma
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });
  
  try {
    // Extract all IMDB IDs
    const imdbIds = new Set<string>();
    for (const sm of specialMentions) {
      const imdbId = extractImdbId(sm.imdbLink);
      if (imdbId) {
        imdbIds.add(imdbId);
      }
    }
    
    console.log(`🎬 Found ${imdbIds.size} unique IMDB IDs\n`);
    
    // Load participants and movies
    const [participants, movies] = await Promise.all([
      prisma.mamParticipant.findMany({
        select: { id: true, slug: true, displayName: true },
      }),
      prisma.movie.findMany({
        where: { imdbId: { in: Array.from(imdbIds) } },
        select: { id: true, imdbId: true },
      }),
    ]);
    
    const participantIdBySlug = new Map<string, number>();
    const participantIdByCompactDisplay = new Map<string, number>();
    
    for (const p of participants) {
      participantIdBySlug.set(p.slug, p.id);
      
      const compact = compactAlphaNum(p.displayName);
      if (!participantIdByCompactDisplay.has(compact)) {
        participantIdByCompactDisplay.set(compact, p.id);
      } else {
        participantIdByCompactDisplay.set(compact, -1); // Mark as ambiguous
      }
    }
    
    const movieIdByImdb = new Map<string, number>();
    for (const m of movies) movieIdByImdb.set(m.imdbId, m.id);
    
    // Find missing movies that need to be created
    const missingImdbIds = Array.from(imdbIds).filter((id) => !movieIdByImdb.has(id));
    
    const moviesToCreate: Array<{
      imdbId: string;
      movieTitle: string;
      position: string;
    }> = [];
    
    for (const sm of specialMentions) {
      const imdbId = extractImdbId(sm.imdbLink);
      if (imdbId && !movieIdByImdb.has(imdbId)) {
        moviesToCreate.push({
          imdbId,
          movieTitle: sm.movieTitle,
          position: sm.position,
        });
      }
    }
    
    // Remove duplicates
    const uniqueMoviesToCreate = Array.from(
      new Map(moviesToCreate.map(m => [m.imdbId, m])).values()
    );
    
    // Check existing picks to avoid conflicts
    const participantIds = [...participantIdBySlug.values()];
    const movieIds = [...movieIdByImdb.values()];
    
    const existingPicks = await prisma.mamPick.findMany({
      where: {
        participantId: { in: participantIds.length > 0 ? participantIds : [-1] },
        movieId: { in: movieIds.length > 0 ? movieIds : [-1] },
        isSpecialMention: false, // Only check regular picks
      },
      select: { id: true, participantId: true, movieId: true },
    });
    
    const existingPickKeys = new Set<string>();
    for (const p of existingPicks) {
      existingPickKeys.add(`${p.participantId}:${p.movieId}`);
    }
    
    // Check for existing special mentions
    const existingSpecialMentions = await prisma.mamPick.findMany({
      where: {
        participantId: { in: participantIds.length > 0 ? participantIds : [-1] },
        movieId: { in: movieIds.length > 0 ? movieIds : [-1] },
        isSpecialMention: true,
      },
      select: { id: true, participantId: true, movieId: true },
    });
    
    const existingSpecialMentionKeys = new Set<string>();
    for (const p of existingSpecialMentions) {
      existingSpecialMentionKeys.add(`${p.participantId}:${p.movieId}`);
    }
    
    let missingParticipantCount = 0;
    let missingMovieCount = 0;
    let skippedConflictCount = 0; // Participant already has regular pick for this movie
    let skippedExistingCount = 0; // Special mention already exists
    let toCreateCount = 0;
    let createdCount = 0;
    
    const toCreate: Array<{
      participantId: number;
      movieId: number;
      review: string;
      position: string;
      usuario: string;
      movieTitle: string;
    }> = [];
    
    const missingParticipants: string[] = [];
    const missingMovies: string[] = [];
    const conflicts: Array<{ position: string; usuario: string; movieTitle: string }> = [];
    const skippedNoParticipant: Array<{ position: string; usuario: string; movieTitle: string }> = [];
    
    // Track which special mentions will be created after movies are created
    const specialMentionsAfterMovieCreation: Array<{
      position: string;
      usuario: string;
      movieTitle: string;
      imdbId: string;
      review: string;
    }> = [];
    
    for (const sm of specialMentions) {
      const imdbId = extractImdbId(sm.imdbLink);
      if (!imdbId) {
        missingMovies.push(`${sm.position}|${sm.movieTitle}`);
        missingMovieCount++;
        continue;
      }
      
      const movieId = movieIdByImdb.get(imdbId);
      const willBeCreated = uniqueMoviesToCreate.some(mtc => mtc.imdbId === imdbId);
      
      // If movie doesn't exist but will be created, track it for later processing
      if (!movieId && willBeCreated) {
        // Still need to check participant now
        const usuarioStripped = stripLeadingAt(sm.usuario);
        const slugAlt = generateSlug(usuarioStripped);
        
        let participantId =
          participantIdBySlug.get(generateSlug(sm.usuario)) ??
          participantIdBySlug.get(slugAlt) ??
          undefined;
        
        const mapped = PARTICIPANT_NAME_MAPPINGS[sm.usuario] || PARTICIPANT_NAME_MAPPINGS[usuarioStripped];
        if (!participantId && mapped) {
          participantId = participantIdBySlug.get(generateSlug(mapped)) ?? undefined;
        }
        
        if (!participantId) {
          const compactUsuario = compactAlphaNum(usuarioStripped);
          const compactMatch = participantIdByCompactDisplay.get(compactUsuario);
          if (compactMatch && compactMatch > 0) {
            participantId = compactMatch;
          }
        }
        
        if (!participantId) {
          const directId = PARTICIPANT_ID_MAPPINGS[sm.usuario] || PARTICIPANT_ID_MAPPINGS[usuarioStripped];
          if (directId) {
            const participant = participants.find(p => p.id === directId);
            if (participant) {
              participantId = directId;
            }
          }
        }
        
        if (participantId) {
          specialMentionsAfterMovieCreation.push({
            position: sm.position,
            usuario: sm.usuario,
            movieTitle: sm.movieTitle,
            imdbId,
            review: sm.review,
          });
        } else {
          skippedNoParticipant.push({
            position: sm.position,
            usuario: sm.usuario,
            movieTitle: sm.movieTitle,
          });
        }
        continue; // Skip for now, will process after movies are created
      }
      
      if (!movieId) {
        missingMovies.push(`${sm.position}|${sm.movieTitle}|${imdbId}`);
        missingMovieCount++;
        continue;
      }
      
      const usuarioStripped = stripLeadingAt(sm.usuario);
      const slugAlt = generateSlug(usuarioStripped);
      
      // Try to find participant
      let participantId =
        participantIdBySlug.get(generateSlug(sm.usuario)) ??
        participantIdBySlug.get(slugAlt) ??
        undefined;
      
      // Try mapping
      const mapped = PARTICIPANT_NAME_MAPPINGS[sm.usuario] || PARTICIPANT_NAME_MAPPINGS[usuarioStripped];
      if (!participantId && mapped) {
        participantId = participantIdBySlug.get(generateSlug(mapped)) ?? undefined;
      }
      
      // Try compact match
      if (!participantId) {
        const compactUsuario = compactAlphaNum(usuarioStripped);
        const compactMatch = participantIdByCompactDisplay.get(compactUsuario);
        if (compactMatch && compactMatch > 0) {
          participantId = compactMatch;
        }
      }
      
      // Try direct ID mapping as last resort
      if (!participantId) {
        const directId = PARTICIPANT_ID_MAPPINGS[sm.usuario] || PARTICIPANT_ID_MAPPINGS[usuarioStripped];
        if (directId) {
          // Verify the participant exists
          const participant = participants.find(p => p.id === directId);
          if (participant) {
            participantId = directId;
          }
        }
      }
      
      if (!participantId) {
        missingParticipants.push(`${sm.position}|${sm.usuario}`);
        missingParticipantCount++;
        continue;
      }
      
      // Check if participant already has a regular pick for this movie
      const pickKey = `${participantId}:${movieId}`;
      if (existingPickKeys.has(pickKey)) {
        conflicts.push({
          position: sm.position,
          usuario: sm.usuario,
          movieTitle: sm.movieTitle,
        });
        skippedConflictCount++;
        continue;
      }
      
      // Check if special mention already exists
      if (existingSpecialMentionKeys.has(pickKey)) {
        skippedExistingCount++;
        continue;
      }
      
      toCreate.push({
        participantId,
        movieId,
        review: sm.review.trim(),
        position: sm.position,
        usuario: sm.usuario,
        movieTitle: sm.movieTitle,
      });
      toCreateCount++;
    }
    
    // Process special mentions for movies that will be created
    let specialMentionsForNewMovies = 0;
    const specialMentionsToCreateAfterMovies: typeof toCreate = [];
    
    for (const sma of specialMentionsAfterMovieCreation) {
      const usuarioStripped = stripLeadingAt(sma.usuario);
      const slugAlt = generateSlug(usuarioStripped);
      
      // Try to find participant (same logic as before)
      let participantId =
        participantIdBySlug.get(generateSlug(sma.usuario)) ??
        participantIdBySlug.get(slugAlt) ??
        undefined;
      
      const mapped = PARTICIPANT_NAME_MAPPINGS[sma.usuario] || PARTICIPANT_NAME_MAPPINGS[usuarioStripped];
      if (!participantId && mapped) {
        participantId = participantIdBySlug.get(generateSlug(mapped)) ?? undefined;
      }
      
      if (!participantId) {
        const compactUsuario = compactAlphaNum(usuarioStripped);
        const compactMatch = participantIdByCompactDisplay.get(compactUsuario);
        if (compactMatch && compactMatch > 0) {
          participantId = compactMatch;
        }
      }
      
      if (!participantId) {
        const directId = PARTICIPANT_ID_MAPPINGS[sma.usuario] || PARTICIPANT_ID_MAPPINGS[usuarioStripped];
        if (directId) {
          const participant = participants.find(p => p.id === directId);
          if (participant) {
            participantId = directId;
          }
        }
      }
      
      if (!participantId) {
        continue; // Skip if participant not found
      }
      
      // Check for conflicts (need to check against existing picks)
      // We'll check this after movies are created, but for dry-run we'll assume no conflicts
      specialMentionsToCreateAfterMovies.push({
        participantId,
        movieId: 0, // Will be set after movie is created
        review: sma.review.trim(),
        position: sma.position,
        usuario: sma.usuario,
        movieTitle: sma.movieTitle,
      });
      specialMentionsForNewMovies++;
    }
    
    const totalSpecialMentionsToCreate = toCreateCount + specialMentionsForNewMovies;
    
    // Calculate truly missing movies (those without IMDB ID or that won't be created)
    const trulyMissingMovies = missingMovies.filter(mm => {
      const parts = mm.split('|');
      const imdbId = parts.length > 2 ? parts[2] : null;
      if (!imdbId) return true; // No IMDB ID
      return !uniqueMoviesToCreate.some(mtc => mtc.imdbId === imdbId);
    });
    
    console.log('📊 Summary:');
    console.log(`   ✅ Special mentions to create: ${totalSpecialMentionsToCreate} (${toCreateCount} for existing movies, ${specialMentionsForNewMovies} for new movies)`);
    console.log(`   🎬 Movies to create: ${uniqueMoviesToCreate.length}`);
    console.log(`   ⚠️  Missing participants: ${missingParticipantCount}`);
    console.log(`   ⚠️  Missing movies (no IMDB ID or will fail to fetch from TMDB): ${trulyMissingMovies.length}`);
    console.log(`   ⏭️  Skipped (conflict with regular pick): ${skippedConflictCount}`);
    console.log(`   ⏭️  Skipped (already exists): ${skippedExistingCount}\n`);
    
    if (missingParticipants.length > 0) {
      console.log('⚠️  Missing participants:');
      for (const mp of missingParticipants.slice(0, 10)) {
        console.log(`   - ${mp}`);
      }
      if (missingParticipants.length > 10) {
        console.log(`   ... and ${missingParticipants.length - 10} more`);
      }
      console.log();
    }
    
    if (uniqueMoviesToCreate.length > 0) {
      console.log('🎬 Movies that will be created:');
      for (const mtc of uniqueMoviesToCreate) {
        console.log(`   - ${mtc.position}|${mtc.movieTitle}|${mtc.imdbId}`);
      }
      console.log();
    }
    
    if (trulyMissingMovies.length > 0) {
      console.log('⚠️  Missing movies (no IMDB ID or will fail to fetch from TMDB):');
      for (const mm of trulyMissingMovies) {
        console.log(`   - ${mm}`);
      }
      console.log();
    }
    
    if (conflicts.length > 0) {
      console.log('⚠️  Conflicts (participant already has regular pick):');
      for (const conflict of conflicts) {
        console.log(`   - ${conflict.position}|${conflict.usuario}|${conflict.movieTitle}`);
      }
      console.log();
    }
    
    if (skippedNoParticipant.length > 0) {
      console.log('⚠️  Skipped (participant not found for movies that will be created):');
      for (const snp of skippedNoParticipant) {
        console.log(`   - ${snp.position}|${snp.usuario}|${snp.movieTitle}`);
      }
      console.log();
    }
    
    if (dryRun) {
      console.log('🔍 DRY RUN - Would create special mentions:');
      console.log('\n   For existing movies:');
      for (const tc of toCreate) {
        console.log(`   - ${tc.position}|${tc.usuario}|${tc.movieTitle}`);
      }
      if (specialMentionsToCreateAfterMovies.length > 0) {
        console.log('\n   For movies that will be created:');
        for (const tc of specialMentionsToCreateAfterMovies) {
          console.log(`   - ${tc.position}|${tc.usuario}|${tc.movieTitle}`);
        }
      }
      await prisma.$disconnect();
      return;
    }
    
    // Create missing movies first
    if (uniqueMoviesToCreate.length > 0) {
      console.log(`📝 Creating ${uniqueMoviesToCreate.length} missing movies from TMDB...`);
      let moviesCreated = 0;
      let moviesFailed = 0;
      
      for (let i = 0; i < uniqueMoviesToCreate.length; i++) {
        const mtc = uniqueMoviesToCreate[i];
        process.stdout.write(`  Fetching ${i + 1}/${uniqueMoviesToCreate.length}: ${mtc.imdbId} (${mtc.movieTitle})...`);
        
        const tmdbData = await getMovieFromTMDB(mtc.imdbId);
        
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
                posterUrl: tmdbData.poster_path, // Store just the path (e.g., "/abc123.jpg")
              },
            });
            movieIdByImdb.set(mtc.imdbId, movie.id);
            moviesCreated++;
            console.log(' ✅');
          } catch (error: any) {
            moviesFailed++;
            console.log(` ❌ DB error: ${error.message}`);
          }
        } else {
          moviesFailed++;
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
      
      console.log(`\n  ✅ Created ${moviesCreated} movies, ${moviesFailed} failed\n`);
    }
    
    // Re-process special mentions now that movies have been created
    // Update movieIdByImdb with newly created movies
    const allMovieIds = new Set([...imdbIds, ...uniqueMoviesToCreate.map(m => m.imdbId)]);
    const updatedMovies = await prisma.movie.findMany({
      where: { imdbId: { in: Array.from(allMovieIds) } },
      select: { id: true, imdbId: true },
    });
    for (const m of updatedMovies) {
      movieIdByImdb.set(m.imdbId, m.id);
    }
    
    // Update special mentions for new movies with actual movie IDs
    for (const stc of specialMentionsToCreateAfterMovies) {
      const sma = specialMentionsAfterMovieCreation.find(
        s => s.position === stc.position && s.usuario === stc.usuario
      );
      if (sma) {
        const movieId = movieIdByImdb.get(sma.imdbId);
        if (movieId) {
          stc.movieId = movieId;
        }
      }
    }
    
    // Re-check existing picks now that movies have been created
    // Need to check for conflicts with newly created movies
    const allParticipantIds = [...participantIdBySlug.values()];
    const allMovieIdsNow = [...movieIdByImdb.values()];
    
    const allExistingPicks = await prisma.mamPick.findMany({
      where: {
        participantId: { in: allParticipantIds.length > 0 ? allParticipantIds : [-1] },
        movieId: { in: allMovieIdsNow.length > 0 ? allMovieIdsNow : [-1] },
      },
      select: { id: true, participantId: true, movieId: true, isSpecialMention: true },
    });
    
    const allExistingPickKeys = new Set<string>();
    const allExistingSpecialMentionKeys = new Set<string>();
    for (const p of allExistingPicks) {
      const pickKey = `${p.participantId}:${p.movieId}`;
      if (p.isSpecialMention) {
        allExistingSpecialMentionKeys.add(pickKey);
      } else {
        allExistingPickKeys.add(pickKey);
      }
    }
    
    // Re-process all special mentions with updated movie IDs and conflict checks
    const finalToCreate: typeof toCreate = [];
    for (const sm of specialMentions) {
      const imdbId = extractImdbId(sm.imdbLink);
      if (!imdbId) continue;
      
      const movieId = movieIdByImdb.get(imdbId);
      if (!movieId) continue; // Still missing, skip
      
      const usuarioStripped = stripLeadingAt(sm.usuario);
      const slugAlt = generateSlug(usuarioStripped);
      
      // Try to find participant (same logic as before)
      let participantId =
        participantIdBySlug.get(generateSlug(sm.usuario)) ??
        participantIdBySlug.get(slugAlt) ??
        undefined;
      
      const mapped = PARTICIPANT_NAME_MAPPINGS[sm.usuario] || PARTICIPANT_NAME_MAPPINGS[usuarioStripped];
      if (!participantId && mapped) {
        participantId = participantIdBySlug.get(generateSlug(mapped)) ?? undefined;
      }
      
      if (!participantId) {
        const compactUsuario = compactAlphaNum(usuarioStripped);
        const compactMatch = participantIdByCompactDisplay.get(compactUsuario);
        if (compactMatch && compactMatch > 0) {
          participantId = compactMatch;
        }
      }
      
      if (!participantId) {
        const directId = PARTICIPANT_ID_MAPPINGS[sm.usuario] || PARTICIPANT_ID_MAPPINGS[usuarioStripped];
        if (directId) {
          const participant = participants.find(p => p.id === directId);
          if (participant) {
            participantId = directId;
          }
        }
      }
      
      if (!participantId) continue;
      
      const pickKey = `${participantId}:${movieId}`;
      // Check against all existing picks (including newly created movies)
      if (allExistingPickKeys.has(pickKey) || allExistingSpecialMentionKeys.has(pickKey)) {
        continue; // Skip conflicts and existing
      }
      
      finalToCreate.push({
        participantId,
        movieId,
        review: sm.review.trim(),
        position: sm.position,
        usuario: sm.usuario,
        movieTitle: sm.movieTitle,
      });
    }
    
    // Create special mentions
    console.log(`📝 Creating ${finalToCreate.length} special mentions...`);
    for (const tc of finalToCreate) {
      try {
        await prisma.mamPick.create({
          data: {
            participantId: tc.participantId,
            movieId: tc.movieId,
            score: 0, // Special mentions don't contribute to scoring
            review: tc.review || null,
            isSpecialMention: true,
          },
        });
        createdCount++;
      } catch (error: any) {
        console.error(`   ❌ Failed to create: ${tc.position}|${tc.usuario}|${tc.movieTitle}`);
        console.error(`      Error: ${error.message}`);
      }
    }
    
    console.log(`\n✅ Created ${createdCount} special mentions`);
    await prisma.$disconnect();
  } catch (error) {
    console.error('Fatal error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
