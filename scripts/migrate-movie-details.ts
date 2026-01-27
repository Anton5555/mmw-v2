/**
 * Movie Details Migration Script
 *
 * Fetches TMDB details (genres, directors, countries, TMDB ID) for all existing movies
 * and populates the Genre, Director, Country, MovieGenre, MovieDirector, and MovieCountry tables.
 *
 * Usage:
 *   npx tsx scripts/migrate-movie-details.ts
 *   npx tsx scripts/migrate-movie-details.ts --dry-run
 *   npx tsx scripts/migrate-movie-details.ts --backfill-countries   # Only add countries to movies missing them
 */

import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter: new PrismaPg(pool),
});

// Manual TMDB ID overrides for cases where the TMDB API
// cannot resolve an IMDb ID via /find. Keys are IMDb IDs.
const TMDB_ID_OVERRIDES: Record<string, number> = {
  tt21386232: 1002164, // Olaf
  tt28090350: 1440171, // Una quinta portuguesa
};

// TMDB API functions for script context
async function getMovieById(imdbId: string): Promise<{
  id: number;
  title: string;
} | null> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    console.warn('TMDB_API_KEY not set, skipping movie fetch');
    return null;
  }

  try {
    const response = await fetch(
      `https://api.themoviedb.org/3/find/${imdbId}?api_key=${apiKey}&external_source=imdb_id`
    );

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`TMDB API error: ${response.status}`);
    }

    const result = (await response.json()) as {
      movie_results?: Array<{
        id: number;
        title: string;
      }>;
    };

    if (!result.movie_results?.[0]) {
      return null;
    }

    return {
      id: result.movie_results[0].id,
      title: result.movie_results[0].title,
    };
  } catch (error) {
    console.error(`Error fetching TMDB data for ${imdbId}:`, error);
    return null;
  }
}

async function getMovieDetailsFull(tmdbId: number): Promise<{
  genres: Array<{ id: number; name: string }>;
  directors: Array<{ id?: number; name: string }>;
  countries: Array<{ code: string; name: string }>;
  tmdbId: number;
} | null> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    return null;
  }

  try {
    const response = await fetch(
      `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${apiKey}&append_to_response=credits`
    );

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      console.error(`TMDB API error for movie ${tmdbId}: ${response.status}`);
      return null;
    }

    const data = (await response.json()) as {
      id: number;
      genres: Array<{ id: number; name: string }>;
      production_countries?: Array<{ iso_3166_1: string; name: string }>;
      credits?: {
        crew: Array<{ job: string; name: string; id?: number }>;
      };
    };

    // Get all directors from credits.crew
    const directors = data.credits?.crew
      .filter((person) => person.job === 'Director')
      .map((person) => ({
        id: person.id,
        name: person.name,
      })) || [];

    const countries =
      data.production_countries?.map((country) => ({
        code: country.iso_3166_1,
        name: country.name,
      })) || [];

    return {
      genres: data.genres || [],
      directors,
      countries,
      tmdbId: data.id,
    };
  } catch (error) {
    console.error(`Error fetching full movie details for TMDB ID ${tmdbId}:`, error);
    return null;
  }
}

// Sleep helper for rate limiting
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const isDryRun = process.argv.includes('--dry-run');
  const backfillCountriesOnly = process.argv.includes('--backfill-countries');

  if (isDryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }

  if (backfillCountriesOnly) {
    console.log('🌍 BACKFILL COUNTRIES MODE - Only adding countries to movies missing them\n');
  }

  console.log('Starting movie details migration...\n');

  // Get all movies
  const movies = await prisma.movie.findMany({
    select: {
      id: true,
      imdbId: true,
      title: true,
      tmdbId: true,
    },
    orderBy: {
      id: 'asc',
    },
  });

  console.log(`Found ${movies.length} movies to process\n`);

  let processed = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < movies.length; i++) {
    const movie = movies[i];
    processed++;

    // Different skip logic depending on mode
    if (backfillCountriesOnly) {
      // In backfill-countries mode: skip movies that don't have tmdbId or already have countries
      if (!movie.tmdbId) {
        skipped++;
        if (processed % 100 === 0) {
          process.stdout.write(
            `\rProgress: ${processed}/${movies.length} (${updated} updated, ${skipped} skipped, ${errors} errors)`
          );
        }
        continue;
      }
      const hasCountries = await prisma.movieCountry.findFirst({
        where: { movieId: movie.id },
      });
      if (hasCountries) {
        skipped++;
        if (processed % 100 === 0) {
          process.stdout.write(
            `\rProgress: ${processed}/${movies.length} (${updated} updated, ${skipped} skipped, ${errors} errors)`
          );
        }
        continue;
      }
    } else {
      // Normal mode: skip if already has TMDB ID and genres
      if (movie.tmdbId) {
        const hasGenres = await prisma.movieGenre.findFirst({
          where: { movieId: movie.id },
        });
        if (hasGenres) {
          skipped++;
          if (processed % 100 === 0) {
            process.stdout.write(
              `\rProgress: ${processed}/${movies.length} (${updated} updated, ${skipped} skipped, ${errors} errors)`
            );
          }
          continue;
        }
      }
    }

    process.stdout.write(
      `\r[${processed}/${movies.length}] Processing: ${movie.title} (${movie.imdbId})...`
    );

    try {
      // Get TMDB ID if not already stored, using overrides first
      let tmdbId = movie.tmdbId ?? TMDB_ID_OVERRIDES[movie.imdbId];
      if (!tmdbId) {
        const tmdbMovie = await getMovieById(movie.imdbId);
        if (!tmdbMovie) {
          console.log(` ❌ TMDB not found`);
          errors++;
          continue;
        }
        tmdbId = tmdbMovie.id;
      } else if (!movie.tmdbId && TMDB_ID_OVERRIDES[movie.imdbId]) {
        // Log when an override is used and movie.tmdbId was previously null
        console.log(
          `\nℹ️ Using TMDB override ${tmdbId} for ${movie.title} (${movie.imdbId})`
        );
      }

      // Fetch full details
      const details = await getMovieDetailsFull(tmdbId);
      if (!details) {
        console.log(` ❌ Details not found`);
        errors++;
        continue;
      }

      if (!isDryRun) {
        // Update movie with TMDB ID if needed (skip in backfill-countries mode)
        if (!movie.tmdbId && !backfillCountriesOnly) {
          await prisma.movie.update({
            where: { id: movie.id },
            data: { tmdbId },
          });
        }

        // Process genres (skip in backfill-countries mode)
        if (!backfillCountriesOnly) {
          for (const genreData of details.genres) {
            // Find or create genre
            let genre = await prisma.genre.findUnique({
              where: { name: genreData.name },
            });

            if (!genre) {
              genre = await prisma.genre.create({
                data: {
                  name: genreData.name,
                  tmdbId: genreData.id,
                },
              });
            } else if (!genre.tmdbId && genreData.id) {
              // Update genre with TMDB ID if missing
              await prisma.genre.update({
                where: { id: genre.id },
                data: { tmdbId: genreData.id },
              });
            }

            // Link movie to genre (idempotent)
            await prisma.movieGenre.upsert({
              where: {
                movieId_genreId: {
                  movieId: movie.id,
                  genreId: genre.id,
                },
              },
              create: {
                movieId: movie.id,
                genreId: genre.id,
              },
              update: {},
            });
          }
        }

        // Process directors (skip in backfill-countries mode)
        if (!backfillCountriesOnly) {
          for (const directorData of details.directors) {
            // Find or create director
            let director = await prisma.director.findUnique({
              where: { name: directorData.name },
            });

            if (!director) {
              director = await prisma.director.create({
                data: {
                  name: directorData.name,
                  tmdbId: directorData.id || undefined,
                },
              });
            } else if (!director.tmdbId && directorData.id) {
              // Update director with TMDB ID if missing
              await prisma.director.update({
                where: { id: director.id },
                data: { tmdbId: directorData.id },
              });
            }

            // Link movie to director (idempotent)
            await prisma.movieDirector.upsert({
              where: {
                movieId_directorId: {
                  movieId: movie.id,
                  directorId: director.id,
                },
              },
              create: {
                movieId: movie.id,
                directorId: director.id,
              },
              update: {},
            });
          }
        }

        // Process countries
        for (const countryData of details.countries) {
          if (!countryData.code) {
            continue;
          }

          const code = countryData.code.trim();
          const name = countryData.name?.trim() || countryData.code;

          if (!code) {
            continue;
          }

          try {
            let country = await prisma.country.findUnique({
              where: { code },
            });

            if (!country) {
              country = await prisma.country.create({
                data: {
                  code,
                  name,
                },
              });
            }

            await prisma.movieCountry.upsert({
              where: {
                movieId_countryId: {
                  movieId: movie.id,
                  countryId: country.id,
                },
              },
              create: {
                movieId: movie.id,
                countryId: country.id,
              },
              update: {},
            });
          } catch (countryError: any) {
            console.log(
              ` ❌ Error processing country ${code} for movie ${movie.title}: ${countryError.message}`
            );
            errors++;
          }
        }
      }

      updated++;
      if (processed % 10 === 0) {
        process.stdout.write(
          `\rProgress: ${processed}/${movies.length} (${updated} updated, ${skipped} skipped, ${errors} errors)`
        );
      }
    } catch (error: any) {
      console.log(` ❌ Error: ${error.message}`);
      errors++;
    }

    // Rate limiting: 40 requests per 10 seconds for TMDB
    if ((i + 1) % 35 === 0 && i < movies.length - 1) {
      process.stdout.write('\n  ⏳ Rate limit pause (10s)...\n');
      await sleep(10000);
    } else {
      await sleep(100); // Small delay between requests
    }
  }

  console.log('\n\n✅ Migration complete!');
  console.log(`   Processed: ${processed}`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Errors: ${errors}`);

  if (isDryRun) {
    console.log('\n🔍 This was a dry run. No changes were made.');
  }
}

main()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
