/**
 * Consolidate YearTopParticipant records by DisplayName
 *
 * Merges duplicate participant records based on specific DisplayName mappings.
 * Updates all YearTopPick records to point to the canonical participant.
 *
 * Usage:
 *   npx tsx scripts/consolidate-participants-by-displayname.ts --dry-run
 *   npx tsx scripts/consolidate-participants-by-displayname.ts
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

// Consolidation mappings: [displayNames to consolidate] -> keep this displayName
const CONSOLIDATION_MAPPINGS: Array<{
  toConsolidate: string[];
  keep: string;
}> = [
  {
    toConsolidate: ['/albaletti', 'Albano! @albaletti'],
    keep: '/albaletti',
  },
  {
    toConsolidate: ['claudio', 'Clauhernan73'],
    keep: 'Clauhernan73',
  },
  {
    toConsolidate: ['Fede C', 'FedeC'],
    keep: 'FedeC',
  },
  {
    toConsolidate: ['@ferheinz', 'Fer Heinz'],
    keep: 'Fer Heinz',
  },
  {
    toConsolidate: ['Gary Busy', 'GaryBusy'],
    keep: 'GaryBusy',
  },
  {
    toConsolidate: ['MartínG', 'Martin Goniondzki', '@martog23'],
    keep: 'Martin Goniondzki',
  },
  {
    toConsolidate: ['Matias Mayer', 'Matías Mayer @MayerMatias', 'MayerMatias'],
    keep: 'Matias Mayer',
  },
  {
    toConsolidate: ['@mishilvina', 'Silvina'],
    keep: 'Silvina',
  },
  {
    toConsolidate: ['Natalia', 'Nati'],
    keep: 'Nati',
  },
  {
    toConsolidate: ['Sanntee', 'Santee'],
    keep: 'Santee',
  },
];

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  console.log('🔄 Consolidating YearTopParticipant Records by DisplayName');
  console.log('==========================================================\n');
  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }

  let totalPicksUpdated = 0;
  let totalParticipantsDeleted = 0;
  let errors: Array<{ mapping: string; error: string }> = [];

  // Process each consolidation mapping
  for (const mapping of CONSOLIDATION_MAPPINGS) {
    console.log(`\n📋 Processing: ${mapping.toConsolidate.join(', ')} -> keep "${mapping.keep}"`);

    // Find the participant to keep
    const keepParticipant = await prisma.yearTopParticipant.findFirst({
      where: { displayName: mapping.keep },
    });

    if (!keepParticipant) {
      const error = `Keep participant "${mapping.keep}" not found`;
      console.error(`  ❌ ${error}`);
      errors.push({ mapping: mapping.keep, error });
      continue;
    }

    console.log(`  ✅ Found keep participant: id:${keepParticipant.id} (${keepParticipant.displayName})`);

    // Find all participants to consolidate (excluding the one we're keeping)
    const participantsToDelete = await prisma.yearTopParticipant.findMany({
      where: {
        displayName: {
          in: mapping.toConsolidate.filter((name) => name !== mapping.keep),
        },
      },
    });

    if (participantsToDelete.length === 0) {
      console.log(`  ℹ️  No participants to consolidate found`);
      continue;
    }

    console.log(`  Found ${participantsToDelete.length} participant(s) to consolidate:`);
    for (const participant of participantsToDelete) {
      console.log(`    - id:${participant.id} (${participant.displayName})`);
    }

    // Process each participant to delete
    for (const deleteParticipant of participantsToDelete) {
      // Count picks to move
      const pickCount = await prisma.yearTopPick.count({
        where: { participantId: deleteParticipant.id },
      });

      if (pickCount > 0) {
        console.log(
          `  Moving ${pickCount} picks from id:${deleteParticipant.id} (${deleteParticipant.displayName}) to id:${keepParticipant.id}`
        );

        if (!dryRun) {
          try {
            // Get all picks to move
            const picksToMove = await prisma.yearTopPick.findMany({
              where: { participantId: deleteParticipant.id },
            });

            let moved = 0;
            let deleted = 0;

            // Move picks one by one, handling duplicates
            for (const pick of picksToMove) {
              // Check if a pick already exists for the target participant
              const existingPick = await prisma.yearTopPick.findUnique({
                where: {
                  participantId_movieId_year_pickType: {
                    participantId: keepParticipant.id,
                    movieId: pick.movieId,
                    year: pick.year,
                    pickType: pick.pickType,
                  },
                },
              });

              if (existingPick) {
                // Duplicate exists - delete the one we're moving
                await prisma.yearTopPick.delete({
                  where: { id: pick.id },
                });
                deleted++;
              } else {
                // No duplicate - move the pick
                await prisma.yearTopPick.update({
                  where: { id: pick.id },
                  data: { participantId: keepParticipant.id },
                });
                moved++;
              }
            }

            totalPicksUpdated += moved;
            console.log(`    ✅ Moved ${moved}, deleted ${deleted} duplicates`);
          } catch (error) {
            const errorMsg = `Failed to update picks: ${error instanceof Error ? error.message : String(error)}`;
            console.error(`  ❌ ${errorMsg}`);
            errors.push({ mapping: deleteParticipant.displayName, error: errorMsg });
            continue;
          }
        } else {
          totalPicksUpdated += pickCount;
        }
      }

      // Delete the duplicate participant (only if it still exists)
      if (!dryRun) {
        const participantExists = await prisma.yearTopParticipant.findUnique({
          where: { id: deleteParticipant.id },
          select: { id: true },
        });

        if (participantExists) {
          console.log(`  Deleting participant id:${deleteParticipant.id} (${deleteParticipant.displayName})`);
          try {
            await prisma.yearTopParticipant.delete({
              where: { id: deleteParticipant.id },
            });
            totalParticipantsDeleted++;
          } catch (error) {
            const errorMsg = `Failed to delete participant: ${error instanceof Error ? error.message : String(error)}`;
            console.error(`  ❌ ${errorMsg}`);
            errors.push({ mapping: deleteParticipant.displayName, error: errorMsg });
          }
        } else {
          console.log(`  ⚠️  Participant id:${deleteParticipant.id} already deleted, skipping`);
        }
      } else {
        console.log(`  Deleting participant id:${deleteParticipant.id} (${deleteParticipant.displayName})`);
        totalParticipantsDeleted++;
      }
    }

    console.log(`  ✅ Kept participant id:${keepParticipant.id} (${keepParticipant.displayName})`);
  }

  // Summary
  console.log('\n\n📊 CONSOLIDATION SUMMARY');
  console.log('='.repeat(70));
  console.log(`Mappings processed: ${CONSOLIDATION_MAPPINGS.length}`);
  console.log(`Picks updated: ${totalPicksUpdated}`);
  console.log(`Participants deleted: ${totalParticipantsDeleted}`);
  if (errors.length > 0) {
    console.log(`\n❌ Errors: ${errors.length}`);
    for (const err of errors) {
      console.log(`  - ${err.mapping}: ${err.error}`);
    }
  }

  if (dryRun) {
    console.log('\n✅ Dry run completed. Run without --dry-run to apply changes.');
  } else {
    console.log('\n✅ Consolidation completed successfully!');
  }

  await prisma.$disconnect();
  await pool.end();
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
