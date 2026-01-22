/**
 * Parse YearTop CSV files (2022 and 2023 format) and search TMDB for movies.
 * 
 * This script:
 * 1. Parses CSV files with unique structure (different from Google Forms format)
 * 2. Searches TMDB by movie name
 * 3. Generates structured JSON files for import
 * 
 * Usage:
 *   npx tsx scripts/parse-year-top-csv.ts --csv "data/datayear-top-2022.csv" --year 2022
 *   npx tsx scripts/parse-year-top-csv.ts --csv "data/datayear-top-2023.csv" --year 2023
 *   npx tsx scripts/parse-year-top-csv.ts --csv "data/datayear-top-2022.csv" --year 2022 --mapping=./movie-mapping.json
 */

import { parse as parseCsv } from 'csv-parse/sync';
import * as fs from 'fs';
import * as path from 'path';
import * as process from 'process';
import 'dotenv/config';

interface MoviePick {
  position: number; // 1-5, where 1 is highest/best
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

interface MovieMapping {
  [movieName: string]: number | string; // tmdbId or imdbId
}

interface TMDBMovieSearchResult {
  id: number;
  title: string;
  release_date: string;
  original_language: string;
  original_title: string;
  poster_path: string | null;
}

interface TMDBMovieSearchResponse {
  results: TMDBMovieSearchResult[];
  total_results: number;
  total_pages: number;
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
  let csvPath: string | undefined = undefined;
  let year: number | undefined = undefined;
  let mappingPath: string | undefined = undefined;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === '--csv') {
      const next = argv[i + 1];
      if (!next) throw new Error('Missing value for --csv');
      csvPath = next;
      i++;
      continue;
    }

    if (arg.startsWith('--csv=')) {
      csvPath = arg.slice('--csv='.length);
      continue;
    }

    if (arg === '--year') {
      const next = argv[i + 1];
      if (!next) throw new Error('Missing value for --year');
      year = parseInt(next, 10);
      if (isNaN(year)) throw new Error(`Invalid year: ${next}`);
      i++;
      continue;
    }

    if (arg.startsWith('--year=')) {
      year = parseInt(arg.slice('--year='.length), 10);
      if (isNaN(year)) throw new Error(`Invalid year: ${arg.slice('--year='.length)}`);
      continue;
    }

    if (arg.startsWith('--mapping=')) {
      mappingPath = arg.slice('--mapping='.length);
      continue;
    }
  }

  return { csvPath, year, mappingPath };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function searchMovieByName(
  query: string,
  year?: number
): Promise<TMDBMovieSearchResult[] | null> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    throw new Error('TMDB_API_KEY not set in environment');
  }

  try {
    let url = `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(query)}&language=es-ES`;
    if (year) {
      url += `&year=${year}`;
    }

    const response = await fetch(url);

    if (!response.ok) {
      console.error(`TMDB search API error for "${query}": ${response.status}`);
      return null;
    }

    const data = (await response.json()) as TMDBMovieSearchResponse;
    return data.results || [];
  } catch (error) {
    console.error(`Error searching TMDB for "${query}":`, error);
    return null;
  }
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

async function getMovieByImdbId(imdbId: string): Promise<{
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
      console.error(`TMDB /find error for ${imdbId}: ${response.status}`);
      return null;
    }

    const result = (await response.json()) as TMDBMovieResponse;

    if (!result.movie_results?.[0]) {
      return null;
    }

    const movieData = result.movie_results[0];
    return {
      id: movieData.id,
      title: movieData.title,
      release_date: movieData.release_date || '1900-01-01',
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

function normalizeMovieName(name: string): string {
  return name.trim();
}

function parse2022Csv(content: string): Array<{
  participantName: string;
  topPicks: string[]; // Position 5 to 1 (reverse order)
  worstPicks: string[]; // Position 5 to 1 (reverse order)
}> {
  const records = parseCsv(content, {
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
    trim: false,
  }) as string[][];

  // Skip row 0 (title row) and row 1 (header row)
  const dataRows = records.slice(2);
  const headers = records[1] || [];

  const mmiterIndex = headers.findIndex((h) => h === 'MMITER');
  const top5Index = headers.findIndex((h) => h === 'TOP 5');
  const top1Index = headers.findIndex((h) => h === 'TOP 1');
  const poronga5Index = headers.findIndex((h) => h === 'PORONGA 5');
  const poronga1Index = headers.findIndex((h) => h === 'PORONGA 1');

  const participants: Array<{
    participantName: string;
    topPicks: string[];
    worstPicks: string[];
  }> = [];

  for (const row of dataRows) {
    const participantName = row[mmiterIndex]?.trim();
    if (!participantName) continue;

    // Extract top picks (TOP 5 to TOP 1, reverse order)
    const topPicks: string[] = [];
    for (let i = 5; i >= 1; i--) {
      const colIndex = top5Index + (5 - i);
      const movieName = row[colIndex]?.trim();
      if (movieName) {
        topPicks.push(normalizeMovieName(movieName));
      }
    }

    // Extract worst picks (PORONGA 5 to PORONGA 1, reverse order)
    const worstPicks: string[] = [];
    for (let i = 5; i >= 1; i--) {
      const colIndex = poronga5Index + (5 - i);
      const movieName = row[colIndex]?.trim();
      if (movieName) {
        worstPicks.push(normalizeMovieName(movieName));
      }
    }

    participants.push({
      participantName,
      topPicks,
      worstPicks,
    });
  }

  return participants;
}

function parse2023Csv(content: string): Array<{
  participantName: string;
  topPicks: string[]; // Position 5 to 1 (reverse order)
  worstPicks: string[]; // Single worst movie
}> {
  const records = parseCsv(content, {
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
    trim: false,
  }) as string[][];

  // Skip row 0 (empty) and row 1 (header row)
  const dataRows = records.slice(2);
  const headers = records[1] || [];

  const nameIndex = 0; // First column is participant name
  const puesto5Index = headers.findIndex((h) => h === 'PUESTO 5');
  const puesto1Index = headers.findIndex((h) => h === 'PUESTO 1');
  const porongaIndex = headers.findIndex((h) => h === 'PORONGA');

  const participants: Array<{
    participantName: string;
    topPicks: string[];
    worstPicks: string[];
  }> = [];

  for (const row of dataRows) {
    const participantName = row[nameIndex]?.trim();
    if (!participantName) continue;

    // Extract top picks (PUESTO 5 to PUESTO 1, reverse order)
    const topPicks: string[] = [];
    for (let i = 5; i >= 1; i--) {
      const colIndex = puesto5Index + (5 - i);
      const movieName = row[colIndex]?.trim();
      if (movieName) {
        topPicks.push(normalizeMovieName(movieName));
      }
    }

    // Extract worst pick (single PORONGA)
    const worstPicks: string[] = [];
    const worstMovie = row[porongaIndex]?.trim();
    if (worstMovie) {
      worstPicks.push(normalizeMovieName(worstMovie));
    }

    participants.push({
      participantName,
      topPicks,
      worstPicks,
    });
  }

  return participants;
}

async function findMovieInTMDB(
  movieName: string,
  year: number,
  movieMapping?: MovieMapping
): Promise<{
  tmdbId: number | null;
  tmdbTitle: string | null;
  imdbId: string | null;
  releaseDate: string | null;
  posterUrl: string | null;
  originalLanguage: string | null;
  originalTitle: string | null;
  error?: string;
  ambiguous?: boolean;
  allResults?: TMDBMovieSearchResult[];
}> {
  // Check manual mapping first
  if (movieMapping && movieMapping[movieName]) {
    const mappingValue = movieMapping[movieName];
    if (typeof mappingValue === 'string' && mappingValue.startsWith('tt')) {
      // It's an IMDb ID
      const movieData = await getMovieByImdbId(mappingValue);
      if (movieData) {
        return {
          tmdbId: movieData.id,
          tmdbTitle: movieData.title,
          imdbId: movieData.imdbId,
          releaseDate: movieData.release_date,
          posterUrl: movieData.poster_path,
          originalLanguage: movieData.original_language,
          originalTitle: movieData.original_title,
        };
      }
    } else {
      // It's a TMDB ID
      const movieData = await getMovieById(mappingValue as number);
      if (movieData) {
        return {
          tmdbId: movieData.id,
          tmdbTitle: movieData.title,
          imdbId: movieData.imdbId,
          releaseDate: movieData.release_date,
          posterUrl: movieData.poster_path,
          originalLanguage: movieData.original_language,
          originalTitle: movieData.original_title,
        };
      }
    }
  }

  // Search TMDB by name
  const results = await searchMovieByName(movieName, year);
  await sleep(250); // Rate limiting

  if (!results || results.length === 0) {
    return {
      tmdbId: null,
      tmdbTitle: null,
      imdbId: null,
      releaseDate: null,
      posterUrl: null,
      originalLanguage: null,
      originalTitle: null,
      error: 'Not found in TMDB',
      allResults: [],
    };
  }

  if (results.length === 1) {
    // Single match - get full details including IMDb ID
    const movieData = await getMovieById(results[0].id);
    await sleep(250); // Rate limiting

    if (movieData) {
      return {
        tmdbId: movieData.id,
        tmdbTitle: movieData.title,
        imdbId: movieData.imdbId,
        releaseDate: movieData.release_date,
        posterUrl: movieData.poster_path,
        originalLanguage: movieData.original_language,
        originalTitle: movieData.original_title,
      };
    }
  }

  // Multiple matches - check if any match the year
  const yearMatches = results.filter((r) => {
    const releaseYear = r.release_date ? parseInt(r.release_date.split('-')[0], 10) : null;
    return releaseYear === year;
  });

  if (yearMatches.length === 1) {
    // Single match for the year - get full details
    const movieData = await getMovieById(yearMatches[0].id);
    await sleep(250); // Rate limiting

    if (movieData) {
      return {
        tmdbId: movieData.id,
        tmdbTitle: movieData.title,
        imdbId: movieData.imdbId,
        releaseDate: movieData.release_date,
        posterUrl: movieData.poster_path,
        originalLanguage: movieData.original_language,
        originalTitle: movieData.original_title,
      };
    }
  }

  // Ambiguous - return first result but mark as ambiguous
  const movieData = await getMovieById(results[0].id);
  await sleep(250); // Rate limiting

  return {
    tmdbId: movieData?.id || null,
    tmdbTitle: movieData?.title || null,
    imdbId: movieData?.imdbId || null,
    releaseDate: movieData?.release_date || null,
    posterUrl: movieData?.poster_path || null,
    originalLanguage: movieData?.original_language || null,
    originalTitle: movieData?.original_title || null,
    ambiguous: true,
    allResults: results.map((r) => ({
      id: r.id,
      title: r.title,
      release_date: r.release_date,
      original_language: r.original_language,
      original_title: r.original_title,
      poster_path: r.poster_path,
    })),
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.csvPath) {
    throw new Error('--csv is required');
  }

  if (!args.year) {
    throw new Error('--year is required');
  }

  if (args.year !== 2022 && args.year !== 2023) {
    throw new Error('Year must be 2022 or 2023');
  }

  // Load movie mapping if provided
  let movieMapping: MovieMapping = {};
  if (args.mappingPath) {
    try {
      const mappingContent = fs.readFileSync(args.mappingPath, 'utf8');
      movieMapping = JSON.parse(mappingContent);
      console.log(`✅ Loaded movie mapping with ${Object.keys(movieMapping).length} entries\n`);
    } catch (error) {
      console.error(`❌ Failed to load movie mapping from ${args.mappingPath}:`, error);
      process.exit(1);
    }
  }

  // Read CSV
  const csvPath = path.resolve(args.csvPath);
  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV file not found: ${csvPath}`);
  }

  console.log('🎬 YearTop CSV Parser');
  console.log('====================');
  console.log(`Year: ${args.year}`);
  console.log(`CSV: ${csvPath}\n`);

  const content = fs.readFileSync(csvPath, 'utf8');

  // Parse CSV based on year
  const rawParticipants =
    args.year === 2022 ? parse2022Csv(content) : parse2023Csv(content);

  console.log(`✅ Parsed ${rawParticipants.length} participants\n`);

  // Collect unique movie names
  const uniqueMovies = new Set<string>();
  for (const participant of rawParticipants) {
    participant.topPicks.forEach((m) => uniqueMovies.add(m));
    participant.worstPicks.forEach((m) => uniqueMovies.add(m));
  }

  console.log(`📊 Found ${uniqueMovies.size} unique movies\n`);
  console.log('🔍 Searching TMDB...\n');

  // Search TMDB for each unique movie
  const movieCache = new Map<
    string,
    {
      tmdbId: number | null;
      tmdbTitle: string | null;
      imdbId: string | null;
      releaseDate: string | null;
      posterUrl: string | null;
      originalLanguage: string | null;
      originalTitle: string | null;
      error?: string;
      ambiguous?: boolean;
      allResults?: TMDBMovieSearchResult[];
    }
  >();

  let processed = 0;
  for (const movieName of uniqueMovies) {
    processed++;
    process.stdout.write(`\r  Processing ${processed}/${uniqueMovies.size}: ${movieName}`);
    const result = await findMovieInTMDB(movieName, args.year, movieMapping);
    movieCache.set(movieName, result);
  }
  console.log('\n');

  // Build processed data structure
  const processedData: ProcessedData = {
    year: args.year,
    participants: [],
    unmatchedMovies: [],
    ambiguousMatches: [],
  };

  // Track unmatched and ambiguous movies
  const unmatchedMap = new Map<string, string[]>();
  const ambiguousMap = new Map<
    string,
    {
      participants: string[];
      results: Array<{ id: number; title: string; release_date: string }>;
    }
  >();

  for (const rawParticipant of rawParticipants) {
    const participant: ParticipantData = {
      name: rawParticipant.participantName,
      topPicks: [],
      worstPicks: [],
    };

    // Process top picks
    for (let i = 0; i < rawParticipant.topPicks.length; i++) {
      const movieName = rawParticipant.topPicks[i];
      const position = rawParticipant.topPicks.length - i; // Reverse: last item is position 1
      const cached = movieCache.get(movieName)!;

      if (cached.error && !cached.tmdbId) {
        // Unmatched
        if (!unmatchedMap.has(movieName)) {
          unmatchedMap.set(movieName, []);
        }
        unmatchedMap.get(movieName)!.push(participant.name);
      } else if (cached.ambiguous && cached.allResults) {
        // Ambiguous
        if (!ambiguousMap.has(movieName)) {
          ambiguousMap.set(movieName, {
            participants: [],
            results: cached.allResults,
          });
        }
        ambiguousMap.get(movieName)!.participants.push(participant.name);
      }

      participant.topPicks.push({
        position,
        movieName,
        tmdbId: cached.tmdbId,
        tmdbTitle: cached.tmdbTitle,
        imdbId: cached.imdbId,
        releaseDate: cached.releaseDate,
        posterUrl: cached.posterUrl || null,
        originalLanguage: cached.originalLanguage || null,
        originalTitle: cached.originalTitle || null,
        ...(cached.error ? { error: cached.error } : {}),
      });
    }

    // Process worst picks
    for (let i = 0; i < rawParticipant.worstPicks.length; i++) {
      const movieName = rawParticipant.worstPicks[i];
      const position = rawParticipant.worstPicks.length - i; // Reverse: last item is position 1
      const cached = movieCache.get(movieName)!;

      if (cached.error && !cached.tmdbId) {
        // Unmatched
        if (!unmatchedMap.has(movieName)) {
          unmatchedMap.set(movieName, []);
        }
        unmatchedMap.get(movieName)!.push(participant.name);
      } else if (cached.ambiguous && cached.allResults) {
        // Ambiguous
        if (!ambiguousMap.has(movieName)) {
          ambiguousMap.set(movieName, {
            participants: [],
            results: cached.allResults,
          });
        }
        ambiguousMap.get(movieName)!.participants.push(participant.name);
      }

      participant.worstPicks.push({
        position,
        movieName,
        tmdbId: cached.tmdbId,
        tmdbTitle: cached.tmdbTitle,
        imdbId: cached.imdbId,
        releaseDate: cached.releaseDate,
        posterUrl: cached.posterUrl || null,
        originalLanguage: cached.originalLanguage || null,
        originalTitle: cached.originalTitle || null,
        ...(cached.error ? { error: cached.error } : {}),
      });
    }

    processedData.participants.push(participant);
  }

  // Add unmatched movies
  for (const [movieName, participants] of unmatchedMap.entries()) {
    const cached = movieCache.get(movieName)!;
    processedData.unmatchedMovies.push({
      movieName,
      participants,
      tmdbResults: cached.allResults || [],
    });
  }

  // Add ambiguous matches
  for (const [movieName, data] of ambiguousMap.entries()) {
    processedData.ambiguousMatches.push({
      movieName,
      participants: data.participants,
      tmdbResults: data.results,
    });
  }

  // Write output files
  const outputDir = path.dirname(csvPath);
  const outputFile = path.join(outputDir, `year-top-${args.year}-processed.json`);
  const unmatchedFile = path.join(outputDir, `year-top-unmatched-${args.year}.json`);

  fs.writeFileSync(outputFile, JSON.stringify(processedData, null, 2), 'utf8');
  fs.writeFileSync(
    unmatchedFile,
    JSON.stringify(
      {
        unmatched: processedData.unmatchedMovies,
        ambiguous: processedData.ambiguousMatches,
      },
      null,
      2
    ),
    'utf8'
  );

  console.log(`✅ Generated output files:`);
  console.log(`   ${outputFile}`);
  console.log(`   ${unmatchedFile}\n`);

  console.log(`📊 Summary:`);
  console.log(`   Participants: ${processedData.participants.length}`);
  console.log(`   Unmatched movies: ${processedData.unmatchedMovies.length}`);
  console.log(`   Ambiguous matches: ${processedData.ambiguousMatches.length}\n`);

  if (processedData.unmatchedMovies.length > 0) {
    console.log('⚠️  Unmatched movies:');
    for (const movie of processedData.unmatchedMovies) {
      console.log(`   - ${movie.movieName} (${movie.participants.length} participants)`);
    }
    console.log('');
  }

  if (processedData.ambiguousMatches.length > 0) {
    console.log('⚠️  Ambiguous matches (review manually):');
    for (const movie of processedData.ambiguousMatches) {
      console.log(`   - ${movie.movieName} (${movie.participants.length} participants)`);
      console.log(`     Results: ${movie.tmdbResults.length}`);
    }
    console.log('');
  }
}

main().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
