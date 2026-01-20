/**
 * Import YearTop data from Google Forms CSV export into the database.
 *
 * This script creates YearTopParticipant, YearTopPick, and Movie records.
 * It handles incomplete submissions gracefully (empty fields are skipped).
 *
 * CSV Structure:
 * - Column 1: Timestamp
 * - Column 2: Participant name/Telegram handle
 * - Columns 3-12: Top 10 movies (#10 to #1)
 * - Column 13: Best movie seen this year
 * - Columns 14-16: Worst 3 movies (#3, #2, #1)
 *
 * Usage:
 *   npx tsx scripts/import-year-top.ts --csv "path/to/csv" --year 2025
 *   npx tsx scripts/import-year-top.ts --csv "path/to/csv" --year 2025 --dry-run
 *   npx tsx scripts/import-year-top.ts --csv "path/to/csv" --year 2025 --mapping=./user-mapping.json
 */

import { PrismaClient, YearTopPickType } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { parse as parseCsv } from 'csv-parse/sync';
import * as fs from 'fs';
import * as path from 'path';
import * as process from 'process';
import 'dotenv/config';
import { promisify } from 'util';

const writeFileAsync = promisify(fs.writeFile);

type CsvRow = {
  timestamp: string;
  participantName: string;
  top10: string[]; // #10 to #1
  bestSeen: string;
  worst3: string[]; // #3 to #1
};

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
    poster_path: string | null;
  }>;
}

interface TMDBMovieByIdResponse {
  id: number;
  title: string;
  release_date: string;
  original_language: string;
  original_title: string;
  poster_path: string | null;
}

// Participant name mappings: CSV name -> DB displayName
const PARTICIPANT_NAME_MAPPINGS: Record<string, string> = {
  '@clauhernan73': 'claudiohernan73',
  clauhernan73: 'claudiohernan73',
  '@MatiasGilRobert': '110x75',
  MatiasGilRobert: '110x75',
  'Alan Gabriel': 'alangmonzon',
  'Biam!': 'ponybiam',
};

// Manual TMDB ID overrides for cases where /find/{imdb_id} does not return a movie
// imdbId -> tmdb movie_id
const TMDB_MOVIE_ID_OVERRIDES: Record<string, number> = {
  // Una quinta portuguesa (2025)
  // TMDB movie: https://api.themoviedb.org/3/movie/1440171
  // IMDb ID:   https://www.imdb.com/title/tt28090350/
  tt28090350: 1440171,
  // La Renga-totalmente poseidos (2024)
  // TMDB movie: https://api.themoviedb.org/3/movie/1249452
  // IMDb ID:   https://www.imdb.com/title/tt32065524/
  tt32065524: 1249452,
};

function normalizeNewlines(text: string): string {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

function stripLeadingAt(text: string): string {
  return text.replace(/^@+/, '').trim();
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

function extractImdbId(text: string): string | null {
  if (!text) return null;

  // Normal case: proper tt12345678 pattern
  const directMatch = text.match(/tt\d{7,8}/);
  if (directMatch) return directMatch[0];

  // Fallback: sometimes a leading \"t\" is missing (e.g. t30144839)
  const singleTPattern = /t(\d{7,8})/;
  const singleTMatch = text.match(singleTPattern);
  if (singleTMatch) {
    return `tt${singleTMatch[1]}`;
  }

  return null;
}

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
    const overrideMovieId = TMDB_MOVIE_ID_OVERRIDES[imdbId];

    let movieData:
      | TMDBMovieByIdResponse
      | TMDBMovieResponse['movie_results'][number]
      | null = null;

    if (overrideMovieId) {
      // Use direct movie endpoint when we know the TMDB movie_id
      const response = await fetch(
        `https://api.themoviedb.org/3/movie/${overrideMovieId}?api_key=${apiKey}&language=es-ES`
      );

      if (!response.ok) {
        console.error(
          `TMDB /movie/${overrideMovieId} error for ${imdbId}: ${response.status}`
        );
        return null;
      }

      movieData = (await response.json()) as TMDBMovieByIdResponse;
    } else {
      // Default path: use /find by IMDb ID
      const response = await fetch(
        `https://api.themoviedb.org/3/find/${imdbId}?api_key=${apiKey}&external_source=imdb_id`
      );

      if (!response.ok) {
        console.error(`TMDB /find error for ${imdbId}: ${response.status}`);
        return null;
      }

      const result = (await response.json()) as TMDBMovieResponse;

      if (!result.movie_results?.[0]) {
        console.error(`No TMDB result for ${imdbId}`);
        return null;
      }

      movieData = result.movie_results[0];
    }

    if (!movieData) {
      console.error(`No TMDB movieData for ${imdbId}`);
      return null;
    }

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

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function parseArgs(argv: string[]) {
  let csvPath: string | undefined = undefined;
  let year: number | undefined = undefined;
  let dryRun = false;
  let help = false;
  let mappingPath: string | undefined = undefined;

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

  return { csvPath, year, dryRun, help, mappingPath };
}

function printHelp() {
  console.log(
    `\nImport YearTop data from Google Forms CSV\n\n` +
      `Options:\n` +
      `  --csv <path>        CSV file path (required)\n` +
      `  --year <number>     Year (e.g., 2025) (required)\n` +
      `  --mapping <path>    User mapping JSON file (optional)\n` +
      `  --dry-run           Do not write to DB, only report what would change\n` +
      `  --help, -h          Show help\n\n` +
      `Example:\n` +
      `  npx tsx scripts/import-year-top.ts --csv "path/to/csv.csv" --year 2025\n`
  );
}

function readCsvFile(filePath: string, year: number): CsvRow[] {
  const content = fs.readFileSync(filePath, 'utf8');
  const records = parseCsv(content, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
    trim: false,
  }) as Record<string, string>[];

  const rows: CsvRow[] = [];

  for (const record of records) {
    const timestamp = record['Marca temporal'] ?? '';
    const participantName = record['¿Quién sos? Tu nombre o @ de Telegram.'] ?? '';

    if (!participantName.trim()) continue;

    // Extract top 10 (#10 to #1)
    // Try various key formats since CSV headers may have newlines or different spacing
    // Headers can have 2 or 3 spaces before the asterisk, so we need flexible matching
    const top10: string[] = [];
    for (let i = 10; i >= 1; i--) {
      // Try to find the column by searching for keys that contain the pattern
      // First try exact matches, then try pattern matching
      let value = '';
      
      // Try exact key matches first (various spacing combinations)
      const exactKeys = [
        `MEJORES ${year}   *nombre de la peli y link IMDB\n#${i}`,      // 3 spaces
        `MEJORES ${year}  *nombre de la peli y link IMDB\n#${i}`,       // 2 spaces
        `MEJORES ${year} *nombre de la peli y link IMDB   \n#${i}`,     // 1 space + trailing
        `MEJORES ${year}   *nombre de la peli y link IMDB#${i}`,        // 3 spaces, no \n
        `MEJORES ${year}  *nombre de la peli y link IMDB#${i}`,         // 2 spaces, no \n
        `MEJORES ${year} *nombre de la peli y link IMDB#${i}`,          // 1 space, no \n
      ];
      
      for (const key of exactKeys) {
        if (record[key]) {
          value = record[key];
          break;
        }
      }
      
      // If exact match failed, try pattern matching on column names
      if (!value) {
        const matchingKey = Object.keys(record).find((key) => {
          // Match pattern: MEJORES {year} followed by optional spaces, asterisk, then #number
          const pattern = new RegExp(`MEJORES ${year}\\s+\\*nombre de la peli y link IMDB[\\s\\n]*#${i}`, 'i');
          return pattern.test(key);
        });
        
        if (matchingKey && record[matchingKey]) {
          value = record[matchingKey];
        }
      }
      
      if (value.trim()) top10.push(value.trim());
    }

    // Best seen - try different key formats
    const bestSeenKeys = [
      'LA MÁS MEJOR QUE VÍ ESTE AÑO ES  *nombre de la peli y link IMDB',
      'LA MÁS MEJOR QUE VÍ ESTE AÑO ES *nombre de la peli y link IMDB',
      'LA MÁS MEJOR QUE VÍ ESTE AÑO ES *nombre de la peli y link IMDB ',
    ];
    let bestSeen = '';
    for (const key of bestSeenKeys) {
      if (record[key]) {
        bestSeen = record[key];
        break;
      }
    }

    // Worst 3 (#3 to #1) - try different key formats
    // Note: CSV headers vary - #3 and #2 have "que consideres que merece", #1 has "que merece"
    const worst3: string[] = [];
    for (let i = 3; i >= 1; i--) {
      const possibleKeys = [
        // For #3 and #2: "que consideres que merece"
        `PORONGA #${i} ${year}  que consideres que merece el escarnio público y todo nuestro desprecio  *nombre de la peli y link IMDB`,
        `PORONGA #${i} ${year} que consideres que merece el escarnio público y todo nuestro desprecio  *nombre de la peli y link IMDB`,
        `PORONGA #${i} ${year}  que consideres que merece el escarnio público y todo nuestro desprecio *nombre de la peli y link IMDB`,
        // For #1: "que merece" with two spaces after year (exact match for #1)
        `PORONGA #${i} ${year}  que merece el escarnio público y todo nuestro desprecio  *nombre de la peli y link IMDB`,
        // For all: "que merece" (simpler version)
        `PORONGA #${i} ${year} que merece el escarnio público y todo nuestro desprecio  *nombre de la peli y link IMDB`,
        `PORONGA #${i} ${year} que merece el escarnio público y todo nuestro desprecio *nombre de la peli y link IMDB`,
        // Without year
        `PORONGA #${i}  que consideres que merece el escarnio público y todo nuestro desprecio  *nombre de la peli y link IMDB`,
        `PORONGA #${i} que merece el escarnio público y todo nuestro desprecio  *nombre de la peli y link IMDB`,
      ];
      
      let value = '';
      for (const key of possibleKeys) {
        if (record[key]) {
          value = record[key];
          break;
        }
      }
      
      // If exact match failed, try pattern matching on column names
      if (!value) {
        const matchingKey = Object.keys(record).find((key) => {
          // Match pattern: PORONGA #number followed by optional year, then "que" (with optional "consideres que"), then "merece"
          const pattern = new RegExp(`PORONGA #${i}(?: ${year})?\\s+que (?:consideres que )?merece el escarnio público y todo nuestro desprecio[\\s\\*]*nombre de la peli y link IMDB`, 'i');
          return pattern.test(key);
        });
        
        if (matchingKey && record[matchingKey]) {
          value = record[matchingKey];
        }
      }
      
      if (value.trim()) worst3.push(value.trim());
    }

    rows.push({
      timestamp,
      participantName: participantName.trim(),
      top10,
      bestSeen: bestSeen.trim(),
      worst3,
    });
  }

  return rows;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printHelp();
    return;
  }

  if (!args.csvPath) {
    throw new Error('--csv is required');
  }

  if (!args.year) {
    throw new Error('--year is required');
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  console.log('🎬 YearTop Import Script');
  console.log('========================');
  console.log(`Year: ${args.year}`);
  if (args.dryRun) console.log('🔍 DRY RUN MODE - No changes will be made\n');

  // Load user mapping if provided
  let userMapping: UserMapping = {};
  if (args.mappingPath) {
    try {
      const mappingContent = fs.readFileSync(args.mappingPath, 'utf8');
      userMapping = JSON.parse(mappingContent);
      console.log(`✅ Loaded user mapping with ${Object.keys(userMapping).length} entries\n`);
    } catch (error) {
      console.error(`❌ Failed to load user mapping from ${args.mappingPath}:`, error);
      process.exit(1);
    }
  }

  // Read CSV
  const csvPath = path.resolve(args.csvPath);
  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV file not found: ${csvPath}`);
  }

  console.log(`📄 Reading CSV: ${csvPath}`);
  const csvRows = readCsvFile(csvPath, args.year);
  console.log(`✅ Parsed ${csvRows.length} rows\n`);

  // Statistics
  let participantsCreated = 0;
  let participantsUpdated = 0;
  let picksCreated = 0;
  let picksSkipped = 0;
  let moviesCreated = 0;
  let moviesSkipped = 0;
  const errors: Array<{
    participant: string;
    pickType: string;
    movieText: string;
    error: string;
  }> = [];

  // Process each row
  for (const row of csvRows) {
    // Normalize participant name
    let displayName = row.participantName;
    displayName = PARTICIPANT_NAME_MAPPINGS[displayName] ?? displayName;
    displayName = stripLeadingAt(displayName);
    const slug = generateSlug(displayName);

    // Get or create participant
    let participant = await prisma.yearTopParticipant.findUnique({
      where: {
        year_slug: {
          year: args.year,
          slug,
        },
      },
    });

    // Try to determine userId:
    // 1) Explicit mapping file (highest priority)
    // 2) Reuse userId from existing MamParticipant with same slug
    let userId: string | null =
      userMapping[displayName] ?? userMapping[row.participantName] ?? null;

    if (!userId) {
      const existingMamParticipant = await prisma.mamParticipant.findUnique({
        where: { slug },
        select: { userId: true },
      });
      if (existingMamParticipant?.userId) {
        userId = existingMamParticipant.userId;
      }
    }

    if (!participant) {
      if (!args.dryRun) {
        participant = await prisma.yearTopParticipant.create({
          data: {
            year: args.year,
            displayName,
            slug,
            userId: userId ?? undefined,
          },
        });
        participantsCreated++;
      } else {
        participantsCreated++;
        console.log(`  Would create participant: ${displayName} (${slug})`);
      }
    } else {
      // Update userId if we have a mapping
      if (userId && participant.userId !== userId) {
        if (!args.dryRun) {
          await prisma.yearTopParticipant.update({
            where: { id: participant.id },
            data: { userId },
          });
          participantsUpdated++;
        } else {
          participantsUpdated++;
          console.log(`  Would update participant: ${displayName} (userId: ${userId})`);
        }
      }
    }

    if (args.dryRun && !participant) {
      // Create a mock participant for dry run
      participant = {
        id: -1,
        year: args.year,
        displayName,
        slug,
        userId: userId ?? null,
        createdAt: new Date(),
      } as any;
    }

    // Process Top 10 picks
    for (let i = 0; i < row.top10.length; i++) {
      const movieText = row.top10[i];
      const imdbId = extractImdbId(movieText);

      if (!imdbId) {
        errors.push({
          participant: displayName,
          pickType: 'TOP_10',
          movieText: movieText.substring(0, 100),
          error: 'No IMDB ID found',
        });
        continue;
      }

      // Get or create movie
      let movie = await prisma.movie.findUnique({
        where: { imdbId },
      });

      if (!movie) {
        const tmdbData = await getMovieFromTMDB(imdbId);
        if (!tmdbData) {
          errors.push({
            participant: displayName,
            pickType: 'TOP_10',
            movieText: movieText.substring(0, 100),
            error: `TMDB lookup failed for ${imdbId}`,
          });
          await sleep(250); // Rate limiting
          continue;
        }

        if (!args.dryRun) {
          try {
            movie = await prisma.movie.create({
              data: {
                title: tmdbData.title,
                originalTitle: tmdbData.original_title,
                originalLanguage: tmdbData.original_language,
                releaseDate: new Date(tmdbData.release_date),
                letterboxdUrl: '',
                imdbId: tmdbData.imdbId,
                posterUrl: tmdbData.poster_path,
              },
            });
            moviesCreated++;
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`  Error creating movie ${imdbId}: ${errorMessage}`);
            errors.push({
              participant: displayName,
              pickType: 'TOP_10',
              movieText: movieText.substring(0, 100),
              error: `Failed to create movie: ${errorMessage}`,
            });
            await sleep(250);
            continue;
          }
        } else {
          moviesCreated++;
          console.log(`  Would create movie: ${tmdbData.title} (${imdbId})`);
        }
        await sleep(250); // Rate limiting
      } else {
        moviesSkipped++;
      }

      if (args.dryRun && !movie) {
        movie = { id: -1 } as any;
      }

      // Create pick
      // Position 0 in array is #10, position 9 is #1
      // So isTopPosition = true when i === 9 (the last item, which is #1)
      const isTopPosition = i === row.top10.length - 1;

      if (!args.dryRun && participant && movie) {
        try {
          await prisma.yearTopPick.upsert({
            where: {
              participantId_movieId_year_pickType: {
                participantId: participant.id,
                movieId: movie.id,
                year: args.year,
                pickType: YearTopPickType.TOP_10,
              },
            },
            create: {
              participantId: participant.id,
              movieId: movie.id,
              year: args.year,
              pickType: YearTopPickType.TOP_10,
              isTopPosition,
            },
            update: {
              isTopPosition,
            },
          });
          picksCreated++;
        } catch (error) {
          picksSkipped++;
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(`  Error creating pick: ${errorMessage}`);
          errors.push({
            participant: displayName,
            pickType: 'TOP_10',
            movieText: movieText.substring(0, 100),
            error: `Failed to create pick: ${errorMessage}`,
          });
        }
      } else if (args.dryRun) {
        picksCreated++;
        console.log(`  Would create pick: ${displayName} -> ${imdbId} (TOP_10, isTopPosition: ${isTopPosition})`);
      }
    }

    // Process Best Seen pick
    if (row.bestSeen) {
      const imdbId = extractImdbId(row.bestSeen);

      if (!imdbId) {
        errors.push({
          participant: displayName,
          pickType: 'BEST_SEEN',
          movieText: row.bestSeen.substring(0, 100),
          error: 'No IMDB ID found',
        });
      } else {
        let movie = await prisma.movie.findUnique({
          where: { imdbId },
        });

        if (!movie) {
          const tmdbData = await getMovieFromTMDB(imdbId);
          if (!tmdbData) {
            errors.push({
              participant: displayName,
              pickType: 'BEST_SEEN',
              movieText: row.bestSeen.substring(0, 100),
              error: `TMDB lookup failed for ${imdbId}`,
            });
            await sleep(250);
          } else {
            if (!args.dryRun) {
              movie = await prisma.movie.create({
                data: {
                  title: tmdbData.title,
                  originalTitle: tmdbData.original_title,
                  originalLanguage: tmdbData.original_language,
                  releaseDate: new Date(tmdbData.release_date),
                  letterboxdUrl: '',
                  imdbId: tmdbData.imdbId,
                  posterUrl: tmdbData.poster_path,
                },
              });
              moviesCreated++;
            } else {
              moviesCreated++;
              console.log(`  Would create movie: ${tmdbData.title} (${imdbId})`);
            }
            await sleep(250);
          }
        } else {
          moviesSkipped++;
        }

        if (args.dryRun && !movie) {
          movie = { id: -1 } as any;
        }

        // Best Seen is always isTopPosition = true
        if (!args.dryRun && participant && movie) {
          try {
            await prisma.yearTopPick.upsert({
              where: {
                participantId_movieId_year_pickType: {
                  participantId: participant.id,
                  movieId: movie.id,
                  year: args.year,
                  pickType: YearTopPickType.BEST_SEEN,
                },
              },
              create: {
                participantId: participant.id,
                movieId: movie.id,
                year: args.year,
                pickType: YearTopPickType.BEST_SEEN,
                isTopPosition: true,
              },
              update: {
                isTopPosition: true,
              },
            });
            picksCreated++;
          } catch (error) {
            picksSkipped++;
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`  Error creating pick: ${errorMessage}`);
            errors.push({
              participant: displayName,
              pickType: 'BEST_SEEN',
              movieText: row.bestSeen.substring(0, 100),
              error: `Failed to create pick: ${errorMessage}`,
            });
          }
        } else if (args.dryRun) {
          picksCreated++;
          console.log(`  Would create pick: ${displayName} -> ${imdbId} (BEST_SEEN, isTopPosition: true)`);
        }
      }
    }

    // Process Worst 3 picks
    for (let i = 0; i < row.worst3.length; i++) {
      const movieText = row.worst3[i];
      const imdbId = extractImdbId(movieText);

      if (!imdbId) {
        errors.push({
          participant: displayName,
          pickType: 'WORST_3',
          movieText: movieText.substring(0, 100),
          error: 'No IMDB ID found',
        });
        continue;
      }

      let movie = await prisma.movie.findUnique({
        where: { imdbId },
      });

      if (!movie) {
        const tmdbData = await getMovieFromTMDB(imdbId);
        if (!tmdbData) {
          errors.push({
            participant: displayName,
            pickType: 'WORST_3',
            movieText: movieText.substring(0, 100),
            error: `TMDB lookup failed for ${imdbId}`,
          });
          await sleep(250);
          continue;
        }

        if (!args.dryRun) {
          movie = await prisma.movie.create({
            data: {
              title: tmdbData.title,
              originalTitle: tmdbData.original_title,
              originalLanguage: tmdbData.original_language,
              releaseDate: new Date(tmdbData.release_date),
              letterboxdUrl: '',
              imdbId: tmdbData.imdbId,
              posterUrl: tmdbData.poster_path,
            },
          });
          moviesCreated++;
        } else {
          moviesCreated++;
          console.log(`  Would create movie: ${tmdbData.title} (${imdbId})`);
        }
        await sleep(250);
      } else {
        moviesSkipped++;
      }

      if (args.dryRun && !movie) {
        movie = { id: -1 } as any;
      }

      // Position 0 in array is #3, position 2 is #1
      // So isTopPosition = true when i === row.worst3.length - 1 (the last item, which is #1)
      const isTopPosition = i === row.worst3.length - 1;

      if (!args.dryRun && participant && movie) {
        try {
          await prisma.yearTopPick.upsert({
            where: {
              participantId_movieId_year_pickType: {
                participantId: participant.id,
                movieId: movie.id,
                year: args.year,
                pickType: YearTopPickType.WORST_3,
              },
            },
            create: {
              participantId: participant.id,
              movieId: movie.id,
              year: args.year,
              pickType: YearTopPickType.WORST_3,
              isTopPosition,
            },
            update: {
              isTopPosition,
            },
          });
          picksCreated++;
          } catch (error) {
            picksSkipped++;
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`  Error creating pick: ${errorMessage}`);
            errors.push({
              participant: displayName,
              pickType: 'WORST_3',
              movieText: movieText.substring(0, 100),
              error: `Failed to create pick: ${errorMessage}`,
            });
          }
      } else if (args.dryRun) {
        picksCreated++;
        console.log(`  Would create pick: ${displayName} -> ${imdbId} (WORST_3, isTopPosition: ${isTopPosition})`);
      }
    }
  }

  // Print summary
  console.log('\n📊 Summary');
  console.log('==========');
  console.log(`Participants created: ${participantsCreated}`);
  console.log(`Participants updated: ${participantsUpdated}`);
  console.log(`Picks created: ${picksCreated}`);
  console.log(`Picks skipped: ${picksSkipped}`);
  console.log(`Movies created: ${moviesCreated}`);
  console.log(`Movies skipped: ${moviesSkipped}`);
  console.log(`Errors: ${errors.length}`);

  // Write error report
  if (errors.length > 0) {
    const reportPath = path.resolve(process.cwd(), 'data', 'year-top-import-errors.json');
    await writeFileAsync(reportPath, JSON.stringify(errors, null, 2));
    console.log(`\n❌ Error report written to: ${reportPath}`);
  }

  await prisma.$disconnect();
  await pool.end();
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
