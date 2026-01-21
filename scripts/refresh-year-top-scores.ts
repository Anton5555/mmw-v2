/**
 * Refresh YearTop Movie Scores
 *
 * Recalculates and updates the cached YearTopMovieStats for all movies:
 * - totalPoints: Sum of points (2 for isTopPosition=true, 1 otherwise) per movie/year/pickType
 *
 * Usage:
 *   npx tsx scripts/refresh-year-top-scores.ts
 *   npx tsx scripts/refresh-year-top-scores.ts --dry-run
 *   npx tsx scripts/refresh-year-top-scores.ts --year 2025
 */

import { PrismaClient, YearTopPickType } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const yearArg = args.find((arg) => arg.startsWith('--year='));
  const yearFilter = yearArg ? parseInt(yearArg.split('=')[1], 10) : undefined;

  console.log('🔄 Refresh YearTop Movie Scores');
  console.log('================================');
  if (dryRun) console.log('🔍 DRY RUN MODE - No changes will be made\n');
  if (yearFilter) console.log(`📅 Filtering by year: ${yearFilter}\n`);

  // Get all unique (year, pickType) combinations
  const yearPickTypeCombos = await prisma.yearTopPick.groupBy({
    by: ['year', 'pickType'],
    ...(yearFilter && {
      where: {
        year: yearFilter,
      },
    }),
  });

  console.log(`📊 Found ${yearPickTypeCombos.length} (year, pickType) combinations\n`);

  if (yearPickTypeCombos.length === 0) {
    console.log('⚠️  No picks found. Nothing to refresh.');
    await prisma.$disconnect();
    return;
  }

  const BATCH_SIZE = 50;
  let totalUpdated = 0;
  let totalDeleted = 0;

  // Process each (year, pickType) combination
  for (const combo of yearPickTypeCombos) {
    const { year, pickType } = combo;

    console.log(`\n📅 Processing ${year} - ${pickType}...`);

    // Get all movies with picks for this year/pickType
    const moviesWithPicks = await prisma.movie.findMany({
      where: {
        yearTopPicks: {
          some: {
            year,
            pickType,
          },
        },
      },
      include: {
        yearTopPicks: {
          where: {
            year,
            pickType,
          },
          select: {
            isTopPosition: true,
          },
        },
      },
    });

    console.log(`  Found ${moviesWithPicks.length} movies with picks`);

    if (dryRun) {
      // Preview first 10
      moviesWithPicks.slice(0, 10).forEach((movie) => {
        const totalPoints = movie.yearTopPicks.reduce(
          (sum, pick) => sum + (pick.isTopPosition ? 2 : 1),
          0
        );
        console.log(`    ${movie.title}: ${totalPoints} points (${movie.yearTopPicks.length} picks)`);
      });
      if (moviesWithPicks.length > 10) {
        console.log(`    ... and ${moviesWithPicks.length - 10} more`);
      }
      totalUpdated += moviesWithPicks.length;
      continue;
    }

    // Calculate and upsert stats in batches
    let updated = 0;
    for (let i = 0; i < moviesWithPicks.length; i += BATCH_SIZE) {
      const batch = moviesWithPicks.slice(i, i + BATCH_SIZE);

      await prisma.$transaction(
        batch.map((movie) => {
          const totalPoints = movie.yearTopPicks.reduce(
            (sum, pick) => sum + (pick.isTopPosition ? 2 : 1),
            0
          );

          return prisma.yearTopMovieStats.upsert({
            where: {
              movieId_year_pickType: {
                movieId: movie.id,
                year,
                pickType,
              },
            },
            create: {
              movieId: movie.id,
              year,
              pickType,
              totalPoints,
            },
            update: {
              totalPoints,
            },
          });
        })
      );

      updated += batch.length;
      process.stdout.write(`\r  Progress: ${updated}/${moviesWithPicks.length}`);
    }

    console.log(`\n  ✅ Updated ${updated} stats records`);

    // Delete stats for movies that no longer have picks for this year/pickType
    const moviesWithStats = await prisma.yearTopMovieStats.findMany({
      where: {
        year,
        pickType,
      },
      select: {
        movieId: true,
      },
    });

    const movieIdsWithPicks = new Set(moviesWithPicks.map((m) => m.id));
    const statsToDelete = moviesWithStats.filter(
      (stat) => !movieIdsWithPicks.has(stat.movieId)
    );

    if (statsToDelete.length > 0) {
      const deleteResult = await prisma.yearTopMovieStats.deleteMany({
        where: {
          year,
          pickType,
          movieId: {
            in: statsToDelete.map((s) => s.movieId),
          },
        },
      });
      console.log(`  🗑️  Deleted ${deleteResult.count} stats records for movies without picks`);
      totalDeleted += deleteResult.count;
    }

    totalUpdated += updated;
  }

  // Show top movies by totalPoints for each pickType
  console.log('\n📈 Top Movies by Total Points:');
  for (const pickType of Object.values(YearTopPickType)) {
    const topMovies = await prisma.yearTopMovieStats.findMany({
      where: {
        ...(yearFilter && { year: yearFilter }),
        pickType,
        totalPoints: { gt: 0 },
      },
      include: {
        movie: {
          select: {
            title: true,
          },
        },
      },
      orderBy: [
        { totalPoints: 'desc' },
        { movie: { title: 'asc' } },
      ],
      take: 5,
    });

    if (topMovies.length > 0) {
      console.log(`\n  ${pickType}:`);
      topMovies.forEach((stat, index) => {
        console.log(
          `    ${index + 1}. ${stat.movie.title} - ${stat.totalPoints} points`
        );
      });
    }
  }

  console.log('\n📊 Summary');
  console.log('==========');
  console.log(`Stats records updated: ${totalUpdated}`);
  console.log(`Stats records deleted: ${totalDeleted}`);
  console.log('\n🎉 Refresh complete!');

  await prisma.$disconnect();
  await pool.end();
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
