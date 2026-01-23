/**
 * Populate Movie Genres and Directors Script
 *
 * Fetches TMDB details (genres, directors) for all existing movies
 * that are missing genres or directors and populates them.
 * Uses batch operations for better performance.
 *
 * Usage:
 *   npx tsx scripts/populate-movie-genres-directors.ts
 *   npx tsx scripts/populate-movie-genres-directors.ts --dry-run
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

// TMDB API functions
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

    return {
      genres: data.genres || [],
      directors,
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

  if (isDryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }

  console.log('Starting movie genres and directors population...\n');

  // Get all movies that are missing genres or directors
  const allMovies = await prisma.movie.findMany({
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

  // Check which movies need updates
  const moviesToProcess: Array<{
    id: number;
    imdbId: string | null;
    title: string;
    tmdbId: number | null;
    needsGenres: boolean;
    needsDirectors: boolean;
  }> = [];

  console.log('Checking which movies need genres/directors...\n');

  for (const movie of allMovies) {
    const [hasGenres, hasDirectors] = await Promise.all([
      prisma.movieGenre.findFirst({
        where: { movieId: movie.id },
      }),
      prisma.movieDirector.findFirst({
        where: { movieId: movie.id },
      }),
    ]);

    if (!hasGenres || !hasDirectors) {
      moviesToProcess.push({
        id: movie.id,
        imdbId: movie.imdbId,
        title: movie.title,
        tmdbId: movie.tmdbId,
        needsGenres: !hasGenres,
        needsDirectors: !hasDirectors,
      });
    }
  }

  console.log(`Found ${moviesToProcess.length} movies that need updates (out of ${allMovies.length} total)\n`);

  if (moviesToProcess.length === 0) {
    console.log('✅ All movies already have genres and directors!');
    return;
  }

  let processed = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < moviesToProcess.length; i++) {
    const movie = moviesToProcess[i];
    processed++;

    process.stdout.write(
      `\r[${processed}/${moviesToProcess.length}] Processing: ${movie.title}...`
    );

    try {
      // Get TMDB ID if not already stored
      let tmdbId = movie.tmdbId;
      if (!tmdbId && movie.imdbId) {
        const tmdbMovie = await getMovieById(movie.imdbId);
        if (!tmdbMovie) {
          console.log(` ❌ TMDB not found`);
          errors++;
          continue;
        }
        tmdbId = tmdbMovie.id;
      }

      if (!tmdbId) {
        console.log(` ❌ No TMDB ID available`);
        errors++;
        continue;
      }

      // Fetch full details
      const details = await getMovieDetailsFull(tmdbId);
      if (!details) {
        console.log(` ❌ Details not found`);
        errors++;
        continue;
      }

      if (!isDryRun) {
        // Update movie with TMDB ID if needed
        if (!movie.tmdbId) {
          await prisma.movie.update({
            where: { id: movie.id },
            data: { tmdbId },
          });
        }

        // Collect all unique genres and directors
        const allGenres = new Map<string, { name: string; tmdbId: number }>();
        const allDirectors = new Map<string, { name: string; tmdbId?: number }>();

        if (movie.needsGenres) {
          details.genres.forEach((genre) => {
            allGenres.set(genre.name, { name: genre.name, tmdbId: genre.id });
          });
        }

        if (movie.needsDirectors) {
          details.directors.forEach((director) => {
            allDirectors.set(director.name, {
              name: director.name,
              tmdbId: director.id,
            });
          });
        }

        // Batch fetch existing genres and directors
        const existingGenres = allGenres.size > 0
          ? await prisma.genre.findMany({
              where: {
                name: {
                  in: Array.from(allGenres.keys()),
                },
              },
            })
          : [];

        const existingDirectors = allDirectors.size > 0
          ? await prisma.director.findMany({
              where: {
                name: {
                  in: Array.from(allDirectors.keys()),
                },
              },
            })
          : [];

        const existingGenreMap = new Map(
          existingGenres.map((g) => [g.name, g])
        );
        const existingDirectorMap = new Map(
          existingDirectors.map((d) => [d.name, d])
        );

        // Create missing genres and directors
        const genresToCreate = Array.from(allGenres.values()).filter(
          (g) => !existingGenreMap.has(g.name)
        );
        const directorsToCreate = Array.from(allDirectors.values()).filter(
          (d) => !existingDirectorMap.has(d.name)
        );

        if (genresToCreate.length > 0) {
          await prisma.genre.createMany({
            data: genresToCreate.map((g) => ({
              name: g.name,
              tmdbId: g.tmdbId,
            })),
            skipDuplicates: true,
          });
        }

        if (directorsToCreate.length > 0) {
          await prisma.director.createMany({
            data: directorsToCreate.map((d) => ({
              name: d.name,
              tmdbId: d.tmdbId,
            })),
            skipDuplicates: true,
          });
        }

        // Update genres and directors missing tmdbId
        const genresToUpdate = existingGenres.filter(
          (g) => !g.tmdbId && allGenres.get(g.name)?.tmdbId
        );
        const directorsToUpdate = existingDirectors.filter(
          (d) => !d.tmdbId && allDirectors.get(d.name)?.tmdbId
        );

        await Promise.all([
          ...genresToUpdate.map((g) =>
            prisma.genre.update({
              where: { id: g.id },
              data: { tmdbId: allGenres.get(g.name)!.tmdbId },
            })
          ),
          ...directorsToUpdate.map((d) =>
            prisma.director.update({
              where: { id: d.id },
              data: { tmdbId: allDirectors.get(d.name)!.tmdbId },
            })
          ),
        ]);

        // Refresh genre and director maps after creates/updates
        const allGenresAfter = allGenres.size > 0
          ? await prisma.genre.findMany({
              where: {
                name: {
                  in: Array.from(allGenres.keys()),
                },
              },
            })
          : [];

        const allDirectorsAfter = allDirectors.size > 0
          ? await prisma.director.findMany({
              where: {
                name: {
                  in: Array.from(allDirectors.keys()),
                },
              },
            })
          : [];

        const genreMap = new Map(allGenresAfter.map((g) => [g.name, g]));
        const directorMap = new Map(allDirectorsAfter.map((d) => [d.name, d]));

        // Batch create movie-genre and movie-director relations
        const movieGenreRelations: Array<{ movieId: number; genreId: number }> =
          [];
        const movieDirectorRelations: Array<{
          movieId: number;
          directorId: number;
        }> = [];

        if (movie.needsGenres) {
          details.genres.forEach((genreData) => {
            const genre = genreMap.get(genreData.name);
            if (genre) {
              movieGenreRelations.push({
                movieId: movie.id,
                genreId: genre.id,
              });
            }
          });
        }

        if (movie.needsDirectors) {
          details.directors.forEach((directorData) => {
            const director = directorMap.get(directorData.name);
            if (director) {
              movieDirectorRelations.push({
                movieId: movie.id,
                directorId: director.id,
              });
            }
          });
        }

        // Use createMany with skipDuplicates to avoid conflicts
        if (movieGenreRelations.length > 0) {
          await prisma.movieGenre.createMany({
            data: movieGenreRelations,
            skipDuplicates: true,
          });
        }

        if (movieDirectorRelations.length > 0) {
          await prisma.movieDirector.createMany({
            data: movieDirectorRelations,
            skipDuplicates: true,
          });
        }
      }

      updated++;
      if (processed % 10 === 0) {
        process.stdout.write(
          `\rProgress: ${processed}/${moviesToProcess.length} (${updated} updated, ${skipped} skipped, ${errors} errors)`
        );
      }
    } catch (error: any) {
      console.log(` ❌ Error: ${error.message}`);
      errors++;
    }

    // Rate limiting: 40 requests per 10 seconds for TMDB
    if ((i + 1) % 35 === 0 && i < moviesToProcess.length - 1) {
      process.stdout.write('\n  ⏳ Rate limit pause (10s)...\n');
      await sleep(10000);
    } else {
      await sleep(100); // Small delay between requests
    }
  }

  console.log('\n\n✅ Population complete!');
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
