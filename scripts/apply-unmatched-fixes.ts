/**
 * Apply fixes from the unmatched file to the processed JSON file.
 * 
 * This script reads the fixed unmatched file and updates the processed JSON
 * with the correct TMDB IDs for ambiguous matches.
 * 
 * Usage:
 *   npx tsx scripts/apply-unmatched-fixes.ts --processed data/year-top-2022-processed.json --unmatched data/year-top-unmatched-2022.json
 */

import * as fs from 'fs';
import * as path from 'path';
import * as process from 'process';
import 'dotenv/config';

interface MoviePick {
  position: number;
  movieName: string;
  tmdbId: number | null;
  tmdbTitle: string | null;
  imdbId: string | null;
  releaseDate: string | null;
  posterUrl: string | null;
  originalLanguage: string | null;
  originalTitle: string | null;
  error?: string;
}

interface ParticipantData {
  name: string;
  topPicks: MoviePick[];
  worstPicks: MoviePick[];
}

interface ProcessedData {
  year: number;
  participants: ParticipantData[];
  unmatchedMovies: Array<{
    movieName: string;
    participants: string[];
    tmdbResults: Array<{
      id: number;
      title: string;
      release_date: string;
    }>;
  }>;
  ambiguousMatches: Array<{
    movieName: string;
    participants: string[];
    tmdbResults: Array<{
      id: number;
      title: string;
      release_date: string;
    }>;
  }>;
}

interface UnmatchedFile {
  unmatched: Array<{
    movieName: string;
    participants: string[];
    tmdbResults: Array<{
      id: number;
      title: string;
      release_date: string;
    }>;
  }>;
  ambiguous: Array<{
    movieName: string;
    participants: string[];
    tmdbResults: Array<{
      id: number;
      title: string;
      release_date: string;
    }>;
  }>;
}

interface TMDBMovieByIdResponse {
  id: number;
  title: string;
  release_date: string;
  original_language: string;
  original_title: string;
  poster_path: string | null;
  imdb_id?: string;
}

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

function parseArgs(argv: string[]) {
  let processedPath: string | undefined = undefined;
  let unmatchedPath: string | undefined = undefined;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === '--processed') {
      const next = argv[i + 1];
      if (!next) throw new Error('Missing value for --processed');
      processedPath = next;
      i++;
      continue;
    }

    if (arg.startsWith('--processed=')) {
      processedPath = arg.slice('--processed='.length);
      continue;
    }

    if (arg === '--unmatched') {
      const next = argv[i + 1];
      if (!next) throw new Error('Missing value for --unmatched');
      unmatchedPath = next;
      i++;
      continue;
    }

    if (arg.startsWith('--unmatched=')) {
      unmatchedPath = arg.slice('--unmatched='.length);
      continue;
    }
  }

  return { processedPath, unmatchedPath };
}

async function getMovieById(tmdbId: number): Promise<{
  id: number;
  title: string;
  release_date: string;
  original_language: string;
  original_title: string;
  poster_path: string;
  imdbId: string | null;
} | null> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    throw new Error('TMDB_API_KEY not set in environment');
  }

  try {
    const response = await fetch(
      `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${apiKey}&language=es-ES&append_to_response=external_ids`
    );

    if (!response.ok) {
      console.error(`TMDB /movie/${tmdbId} error: ${response.status}`);
      return null;
    }

    const data = (await response.json()) as TMDBMovieByIdResponse & {
      external_ids?: { imdb_id?: string };
    };

    return {
      id: data.id,
      title: data.title,
      release_date: data.release_date || '1900-01-01',
      original_language: data.original_language,
      original_title: data.original_title,
      poster_path: data.poster_path
        ? `https://image.tmdb.org/t/p/original${data.poster_path}`
        : '',
      imdbId: data.external_ids?.imdb_id || data.imdb_id || null,
    };
  } catch (error) {
    console.error(`Error fetching TMDB movie ${tmdbId}:`, error);
    return null;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.processedPath) {
    throw new Error('--processed is required');
  }

  if (!args.unmatchedPath) {
    throw new Error('--unmatched is required');
  }

  const processedPath = path.resolve(args.processedPath);
  const unmatchedPath = path.resolve(args.unmatchedPath);

  if (!fs.existsSync(processedPath)) {
    throw new Error(`Processed JSON file not found: ${processedPath}`);
  }

  if (!fs.existsSync(unmatchedPath)) {
    throw new Error(`Unmatched JSON file not found: ${unmatchedPath}`);
  }

  console.log('🔧 Apply Unmatched Fixes');
  console.log('========================');
  console.log(`Processed: ${processedPath}`);
  console.log(`Unmatched: ${unmatchedPath}\n`);

  // Read files
  const processedContent = fs.readFileSync(processedPath, 'utf8');
  const unmatchedContent = fs.readFileSync(unmatchedPath, 'utf8');

  const processedData: ProcessedData = JSON.parse(processedContent);
  const unmatchedData: UnmatchedFile = JSON.parse(unmatchedContent);

  console.log(`✅ Loaded processed data: ${processedData.participants.length} participants`);
  console.log(`✅ Loaded unmatched data: ${unmatchedData.ambiguous.length} ambiguous, ${unmatchedData.unmatched.length} unmatched\n`);

  // Build mapping from ambiguous matches (where user selected the correct one)
  const movieFixes = new Map<string, number>(); // movieName -> tmdbId

  for (const ambiguous of unmatchedData.ambiguous) {
    if (ambiguous.tmdbResults.length === 1) {
      // User has selected the correct one
      movieFixes.set(ambiguous.movieName, ambiguous.tmdbResults[0].id);
    }
  }

  // Also handle unmatched movies that now have results
  for (const unmatched of unmatchedData.unmatched) {
    if (unmatched.tmdbResults.length === 1) {
      // User has provided the correct one
      movieFixes.set(unmatched.movieName, unmatched.tmdbResults[0].id);
    }
  }

  console.log(`📝 Found ${movieFixes.size} movies to fix\n`);

  if (movieFixes.size === 0) {
    console.log('✅ No fixes to apply');
    return;
  }

  // Fetch full movie data for each fix
  console.log('🔍 Fetching movie data from TMDB...\n');
  const movieDataCache = new Map<number, {
    id: number;
    title: string;
    release_date: string;
    original_language: string;
    original_title: string;
    poster_path: string;
    imdbId: string | null;
  }>();

  let processed = 0;
  for (const [movieName, tmdbId] of movieFixes.entries()) {
    processed++;
    process.stdout.write(`\r  Processing ${processed}/${movieFixes.size}: ${movieName}`);
    
    if (!movieDataCache.has(tmdbId)) {
      const movieData = await getMovieById(tmdbId);
      if (movieData) {
        movieDataCache.set(tmdbId, movieData);
      }
      await sleep(250); // Rate limiting
    }
  }
  console.log('\n');

  // Manual IMDb ID mappings for movies that already have TMDB IDs
  const manualImdbMappings: Record<string, string> = {
    'Olaf': 'tt21386232',
  };

  // Also add IMDb IDs to movies that already have TMDB IDs
  console.log('📝 Adding IMDb IDs to movies that already have TMDB IDs...\n');
  let imdbFixesApplied = 0;
  for (const participant of processedData.participants) {
    for (const pick of [...participant.topPicks, ...participant.worstPicks]) {
      if (pick.tmdbId && !pick.imdbId && manualImdbMappings[pick.movieName]) {
        pick.imdbId = manualImdbMappings[pick.movieName];
        imdbFixesApplied++;
      }
    }
  }
  if (imdbFixesApplied > 0) {
    console.log(`✅ Added ${imdbFixesApplied} IMDb IDs\n`);
  }

  // Apply fixes to processed data
  let fixesApplied = 0;
  for (const participant of processedData.participants) {
    // Fix top picks
    for (const pick of participant.topPicks) {
      // If movie already has tmdbId but missing imdbId, add it
      if (pick.tmdbId && !pick.imdbId && manualImdbMappings[pick.movieName]) {
        pick.imdbId = manualImdbMappings[pick.movieName];
        fixesApplied++;
      }
      // If movie needs to be fixed from unmatched/ambiguous
      else if (movieFixes.has(pick.movieName)) {
        const tmdbId = movieFixes.get(pick.movieName)!;
        const movieData = movieDataCache.get(tmdbId);
        
        if (movieData) {
          pick.tmdbId = movieData.id;
          pick.tmdbTitle = movieData.title;
          pick.imdbId = movieData.imdbId || manualImdbMappings[pick.movieName] || null;
          pick.releaseDate = movieData.release_date;
          pick.posterUrl = movieData.poster_path;
          pick.originalLanguage = movieData.original_language;
          pick.originalTitle = movieData.original_title;
          delete pick.error;
          fixesApplied++;
        }
      }
    }

    // Fix worst picks
    for (const pick of participant.worstPicks) {
      // If movie already has tmdbId but missing imdbId, add it
      if (pick.tmdbId && !pick.imdbId && manualImdbMappings[pick.movieName]) {
        pick.imdbId = manualImdbMappings[pick.movieName];
        fixesApplied++;
      }
      // If movie needs to be fixed from unmatched/ambiguous
      else if (movieFixes.has(pick.movieName)) {
        const tmdbId = movieFixes.get(pick.movieName)!;
        const movieData = movieDataCache.get(tmdbId);
        
        if (movieData) {
          pick.tmdbId = movieData.id;
          pick.tmdbTitle = movieData.title;
          pick.imdbId = movieData.imdbId || manualImdbMappings[pick.movieName] || null;
          pick.releaseDate = movieData.release_date;
          pick.posterUrl = movieData.poster_path;
          pick.originalLanguage = movieData.original_language;
          pick.originalTitle = movieData.original_title;
          delete pick.error;
          fixesApplied++;
        }
      }
    }
  }

  // Update ambiguous matches in processed data
  for (const ambiguous of processedData.ambiguousMatches) {
    if (movieFixes.has(ambiguous.movieName)) {
      const tmdbId = movieFixes.get(ambiguous.movieName)!;
      ambiguous.tmdbResults = [{
        id: tmdbId,
        title: movieDataCache.get(tmdbId)?.title || '',
        release_date: movieDataCache.get(tmdbId)?.release_date || '',
      }];
    }
  }

  // Write updated processed data
  fs.writeFileSync(processedPath, JSON.stringify(processedData, null, 2), 'utf8');

  console.log(`✅ Applied ${fixesApplied} fixes`);
  console.log(`✅ Updated processed file: ${processedPath}\n`);
}

main().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
