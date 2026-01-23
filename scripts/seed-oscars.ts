/**
 * Oscar 2026 Data Import Script
 *
 * Imports Oscar categories and nominees from oscars_2026.json into the database.
 * Fetches movie data from TMDB for films and links them to the Movie table.
 *
 * Usage:
 *   npx tsx scripts/seed-oscars.ts
 *   npx tsx scripts/seed-oscars.ts --dry-run
 */

import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import 'dotenv/config';

// TMDB API function for script context (without Next.js cache)
async function getMovieById(imdbId: string): Promise<{
  title: string;
  original_title: string;
  original_language: string;
  release_date: string;
  poster_path: string;
  imdbId: string;
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
      throw new Error(`TMDB API error: ${response.status}`);
    }

    const result = (await response.json()) as {
      movie_results?: Array<{
        id: number;
        title: string;
        release_date: string;
        original_language: string;
        original_title: string;
        poster_path: string | null;
      }>;
    };

    if (!result.movie_results?.[0]) {
      return null;
    }

    const movieData = result.movie_results[0];
    return {
      title: movieData.title,
      original_title: movieData.original_title || movieData.title,
      original_language: movieData.original_language || 'en',
      release_date: movieData.release_date || new Date().toISOString().split('T')[0],
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

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const isDryRun = process.argv.includes('--dry-run');

interface OscarNomineeData {
  nominee: string;
  imdb_id?: string;
  imdb_person_id?: string;
  imdb_title_id?: string;
  film?: string;
  film_imdb_id?: string;
}

interface OscarCategoryData {
  category: string;
  nominees: OscarNomineeData[];
}

interface OscarsData {
  oscars_year: number;
  categories: OscarCategoryData[];
}

// Helper function to slugify category names
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

// Helper function to get or create movie from TMDB
async function getOrCreateMovie(imdbId: string): Promise<number | null> {
  // Check if movie already exists
  const existingMovie = await prisma.movie.findUnique({
    where: { imdbId },
    select: { id: true },
  });

  if (existingMovie) {
    return existingMovie.id;
  }

  // Fetch from TMDB
  const tmdbData = await getMovieById(imdbId);
  if (!tmdbData) {
    console.warn(`Could not fetch TMDB data for ${imdbId}`);
    return null;
  }

  // Create movie record
  // Note: We need to provide required fields. Let's use defaults for missing data.
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
      releaseDate: tmdbData.release_date
        ? new Date(tmdbData.release_date)
        : new Date(),
      letterboxdUrl: `https://letterboxd.com/film/${titleForUrl}/`,
      imdbId: tmdbData.imdbId,
      posterUrl: tmdbData.poster_path || '',
    },
  });

  return movie.id;
}

async function seedOscars() {
  console.log('Starting Oscar 2026 seed...\n');

  // Read JSON file
  const jsonPath = path.join(process.cwd(), 'data', 'oscars_2026.json');
  const jsonData = fs.readFileSync(jsonPath, 'utf-8');
  const oscarsData: OscarsData = JSON.parse(jsonData);

  if (isDryRun) {
    console.log('DRY RUN MODE - No changes will be made\n');
  }

  try {
    // Create or get edition
    let edition = await prisma.oscarEdition.findUnique({
      where: { year: oscarsData.oscars_year },
    });

    if (!edition) {
      if (isDryRun) {
        console.log(`Would create edition for year ${oscarsData.oscars_year}`);
      } else {
        edition = await prisma.oscarEdition.create({
          data: {
            year: oscarsData.oscars_year,
            isActive: true,
            resultsReleased: false,
          },
        });
        console.log(`Created edition for year ${oscarsData.oscars_year}`);
      }
    } else {
      console.log(`Edition for year ${oscarsData.oscars_year} already exists`);
    }

    if (!edition) {
      throw new Error('Edition not created');
    }

    // Process categories
    for (let i = 0; i < oscarsData.categories.length; i++) {
      const categoryData = oscarsData.categories[i];
      const slug = slugify(categoryData.category);

      console.log(`\nProcessing category: ${categoryData.category} (${slug})`);

      // Create or get category
      let category = await prisma.oscarCategory.findFirst({
        where: {
          editionId: edition.id,
          slug,
        },
      });

      if (!category) {
        if (isDryRun) {
          console.log(`  Would create category: ${categoryData.category}`);
          // In dry-run mode, skip processing nominees if category doesn't exist
          console.log(`  Would process ${categoryData.nominees.length} nominees for this category`);
          continue;
        } else {
          category = await prisma.oscarCategory.create({
            data: {
              editionId: edition.id,
              name: categoryData.category,
              slug,
              order: i + 1,
            },
          });
          console.log(`  Created category: ${categoryData.category}`);
        }
      } else {
        console.log(`  Category already exists, updating order...`);
        if (!isDryRun) {
          await prisma.oscarCategory.update({
            where: { id: category.id },
            data: { order: i + 1 },
          });
        }
      }

      if (!category) {
        throw new Error('Category not created');
      }

      // Process nominees
      for (const nomineeData of categoryData.nominees) {
        const nomineeName = nomineeData.nominee;
        const imdbId =
          nomineeData.imdb_id ||
          nomineeData.imdb_person_id ||
          nomineeData.imdb_title_id;
        const filmImdbId =
          nomineeData.film_imdb_id || nomineeData.imdb_title_id;
        const filmTitle = nomineeData.film;

        // Determine which IMDB ID represents a movie (for linking to Movie table)
        let movieId: number | null = null;

        // For categories where the nominee IS a film (Best Picture, Animated Feature, etc.)
        if (nomineeData.imdb_id) {
          movieId = await getOrCreateMovie(nomineeData.imdb_id);
          if (movieId) {
            console.log(`    Linked movie: ${nomineeName} -> Movie ID ${movieId}`);
          }
        }
        // For person categories, link to the film they worked on
        else if (filmImdbId) {
          movieId = await getOrCreateMovie(filmImdbId);
          if (movieId) {
            console.log(
              `    Linked film for ${nomineeName}: ${filmTitle || 'N/A'} -> Movie ID ${movieId}`
            );
          }
        }

        // Check if nominee already exists
        const existingNominee = await prisma.oscarNominee.findFirst({
          where: {
            categoryId: category.id,
            name: nomineeName,
          },
        });

        if (!existingNominee) {
          if (isDryRun) {
            console.log(`    Would create nominee: ${nomineeName}`);
          } else {
            await prisma.oscarNominee.create({
              data: {
                categoryId: category.id,
                name: nomineeName,
                filmTitle: filmTitle || null,
                imdbId: imdbId || null,
                filmImdbId: filmImdbId || null,
                movieId,
              },
            });
            console.log(`    Created nominee: ${nomineeName}`);
          }
        } else {
          console.log(`    Nominee already exists: ${nomineeName}`);
          // Update movie link if it wasn't set before
          if (!existingNominee.movieId && movieId && !isDryRun) {
            await prisma.oscarNominee.update({
              where: { id: existingNominee.id },
              data: { movieId },
            });
            console.log(`    Updated movie link for: ${nomineeName}`);
          }
        }
      }
    }

    console.log('\n✅ Oscar seed completed successfully!');
  } catch (error) {
    console.error('\n❌ Error seeding Oscars:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

// Run the seed
seedOscars().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
