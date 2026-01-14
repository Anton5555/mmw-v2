/**
 * Refresh MAM Movie Scores
 *
 * Recalculates and updates the cached MAM metrics for all movies:
 * - mamTotalPicks: Count of picks for the movie
 * - mamTotalPoints: Sum of all pick scores
 * - mamAverageScore: Average score (totalPoints / totalPicks)
 * - mamRank: Global ranking based on mamTotalPoints, mamTotalPicks, and title
 *
 * Usage:
 *   npx tsx scripts/refresh-mam-scores.ts
 *   npx tsx scripts/refresh-mam-scores.ts --dry-run
 */

import { PrismaClient } from '../generated/prisma/client';
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

  console.log('🔄 Refresh MAM Movie Scores');
  console.log('===========================');
  if (dryRun) console.log('🔍 DRY RUN MODE - No changes will be made\n');

  // Get all movies that have MAM picks
  const moviesWithPicks = await prisma.movie.findMany({
    where: {
      mamPicks: {
        some: {},
      },
    },
    include: {
      mamPicks: {
        select: {
          score: true,
        },
      },
    },
  });

  console.log(`📊 Found ${moviesWithPicks.length} movies with MAM picks\n`);

  if (dryRun) {
    console.log('🔍 Preview of changes:');
    moviesWithPicks.slice(0, 10).forEach((movie) => {
      const totalPicks = movie.mamPicks.length;
      const totalPoints = movie.mamPicks.reduce((sum, pick) => sum + pick.score, 0);
      const averageScore = totalPicks > 0 ? totalPoints / totalPicks : 0;
      console.log(
        `  ${movie.title}: ${totalPicks} picks, ${totalPoints} points, avg ${averageScore.toFixed(2)}`
      );
    });
    if (moviesWithPicks.length > 10) {
      console.log(`  ... and ${moviesWithPicks.length - 10} more`);
    }
    await prisma.$disconnect();
    return;
  }

  // Calculate and update scores for each movie
  let updated = 0;
  const BATCH_SIZE = 50;

  for (let i = 0; i < moviesWithPicks.length; i += BATCH_SIZE) {
    const batch = moviesWithPicks.slice(i, i + BATCH_SIZE);

    await prisma.$transaction(
      batch.map((movie) => {
        const totalPicks = movie.mamPicks.length;
        const totalPoints = movie.mamPicks.reduce((sum, pick) => sum + pick.score, 0);
        const averageScore = totalPicks > 0 ? totalPoints / totalPicks : 0;

        return prisma.movie.update({
          where: { id: movie.id },
          data: {
            mamTotalPicks: totalPicks,
            mamTotalPoints: totalPoints,
            mamAverageScore: Math.round(averageScore * 100) / 100,
          },
        });
      })
    );

    updated += batch.length;
    process.stdout.write(`\r  Progress: ${updated}/${moviesWithPicks.length}`);
  }

  console.log(`\n\n✅ Updated ${updated} movies with cached scores`);

  // Also reset scores for movies that no longer have picks (edge case)
  const resetResult = await prisma.movie.updateMany({
    where: {
      mamPicks: {
        none: {},
      },
      OR: [
        { mamTotalPicks: { not: 0 } },
        { mamTotalPoints: { not: 0 } },
        { mamAverageScore: { not: 0 } },
      ],
    },
    data: {
      mamTotalPicks: 0,
      mamTotalPoints: 0,
      mamAverageScore: 0,
      mamRank: null,
    },
  });

  if (resetResult.count > 0) {
    console.log(`🔄 Reset scores for ${resetResult.count} movies without picks`);
  }

  // Calculate and assign ranks based on global sort order
  console.log('\n📊 Calculating ranks...');
  const rankedMovies = await prisma.movie.findMany({
    where: {
      mamTotalPicks: { gt: 0 },
    },
    orderBy: [
      { mamTotalPoints: 'desc' },
      { mamTotalPicks: 'desc' },
      { title: 'asc' },
    ],
    select: {
      id: true,
    },
  });

  console.log(`  Found ${rankedMovies.length} movies to rank`);

  // Update ranks in batches
  let rankUpdated = 0;
  for (let i = 0; i < rankedMovies.length; i += BATCH_SIZE) {
    const batch = rankedMovies.slice(i, i + BATCH_SIZE);

    await prisma.$transaction(
      batch.map((movie, batchIndex) => {
        const rank = i + batchIndex + 1;
        return prisma.movie.update({
          where: { id: movie.id },
          data: { mamRank: rank },
        });
      })
    );

    rankUpdated += batch.length;
    process.stdout.write(`\r  Rank progress: ${rankUpdated}/${rankedMovies.length}`);
  }

  console.log(`\n✅ Updated ranks for ${rankUpdated} movies`);

  // Show top 10 movies by score
  console.log('\n📈 Top 10 Movies by Average Score:');
  const topMovies = await prisma.movie.findMany({
    where: {
      mamTotalPicks: { gt: 0 },
    },
    orderBy: [
      { mamAverageScore: 'desc' },
      { mamTotalPicks: 'desc' },
    ],
    take: 10,
    select: {
      title: true,
      mamTotalPicks: true,
      mamTotalPoints: true,
      mamAverageScore: true,
    },
  });

  topMovies.forEach((movie, index) => {
    console.log(
      `  ${index + 1}. ${movie.title} - ${movie.mamAverageScore.toFixed(2)} avg (${movie.mamTotalPicks} picks, ${movie.mamTotalPoints} pts)`
    );
  });

  console.log('\n🎉 Refresh complete!');

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('Fatal error:', error);
  prisma.$disconnect();
  process.exit(1);
});

