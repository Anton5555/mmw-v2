/**
 * Consolidate YearTopParticipant records
 *
 * Merges duplicate participant records (same userId or same slug) into one record per person.
 * Updates all YearTopPick records to point to the canonical participant.
 *
 * Usage:
 *   npx tsx scripts/consolidate-year-top-participants.ts --dry-run
 *   npx tsx scripts/consolidate-year-top-participants.ts
 */

import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

interface ConsolidationGroup {
  key: string;
  type: 'linked' | 'unlinked';
  participants: Array<{
    id: number;
    year: number;
    displayName: string;
    slug: string;
    userId: string | null;
    createdAt: Date;
    pickCount: number;
  }>;
  keepId: number;
  deleteIds: number[];
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  console.log('🔄 Consolidating YearTopParticipant Records');
  console.log('============================================\n');
  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }

  // Load consolidation plan
  const planPath = path.join(process.cwd(), 'data', 'year-top-consolidation-plan.json');
  if (!fs.existsSync(planPath)) {
    console.error(
      '❌ Consolidation plan not found. Please run analyze-year-top-participants.ts first.'
    );
    process.exit(1);
  }

  const planContent = fs.readFileSync(planPath, 'utf8');
  const plan: {
    linkedGroups: ConsolidationGroup[];
    unlinkedGroups: ConsolidationGroup[];
  } = JSON.parse(planContent);

  const allGroups = [...plan.linkedGroups, ...plan.unlinkedGroups];

  if (allGroups.length === 0) {
    console.log('✅ No consolidation needed - no duplicate groups found.');
    await prisma.$disconnect();
    await pool.end();
    return;
  }

  console.log(`📋 Processing ${allGroups.length} consolidation groups...\n`);

  let totalPicksUpdated = 0;
  let totalParticipantsDeleted = 0;
  let errors: Array<{ group: string; error: string }> = [];

  // Process each group
  for (const group of allGroups) {
    const groupLabel = group.type === 'linked' ? `userId:${group.key.substring(0, 20)}...` : `slug:${group.key}`;
    console.log(`Processing ${group.type} group: ${groupLabel}`);

    const keepParticipant = group.participants.find((p) => p.id === group.keepId);
    if (!keepParticipant) {
      const error = `Keep participant ${group.keepId} not found in group`;
      console.error(`  ❌ ${error}`);
      errors.push({ group: groupLabel, error });
      continue;
    }

    // Update picks for each participant to delete
    for (const deleteId of group.deleteIds) {
      const deleteParticipant = group.participants.find((p) => p.id === deleteId);
      if (!deleteParticipant) continue;

      // Count picks to move
      const pickCount = await prisma.yearTopPick.count({
        where: { participantId: deleteId },
      });

      if (pickCount > 0) {
        console.log(
          `  Moving ${pickCount} picks from id:${deleteId} (${deleteParticipant.displayName}, year:${deleteParticipant.year}) to id:${group.keepId}`
        );

        if (!dryRun) {
          try {
            await prisma.yearTopPick.updateMany({
              where: { participantId: deleteId },
              data: { participantId: group.keepId },
            });
            totalPicksUpdated += pickCount;
          } catch (error) {
            const errorMsg = `Failed to update picks: ${error instanceof Error ? error.message : String(error)}`;
            console.error(`  ❌ ${errorMsg}`);
            errors.push({ group: groupLabel, error: errorMsg });
            continue;
          }
        } else {
          totalPicksUpdated += pickCount;
        }
      }

      // Delete the duplicate participant
      console.log(`  Deleting participant id:${deleteId} (${deleteParticipant.displayName}, year:${deleteParticipant.year})`);

      if (!dryRun) {
        try {
          await prisma.yearTopParticipant.delete({
            where: { id: deleteId },
          });
          totalParticipantsDeleted++;
        } catch (error) {
          const errorMsg = `Failed to delete participant: ${error instanceof Error ? error.message : String(error)}`;
          console.error(`  ❌ ${errorMsg}`);
          errors.push({ group: groupLabel, error: errorMsg });
        }
      } else {
        totalParticipantsDeleted++;
      }
    }

    console.log(`  ✅ Kept participant id:${group.keepId} (${keepParticipant.displayName}, year:${keepParticipant.year})\n`);
  }

  // Summary
  console.log('\n📊 CONSOLIDATION SUMMARY');
  console.log('='.repeat(70));
  console.log(`Groups processed: ${allGroups.length}`);
  console.log(`Picks updated: ${totalPicksUpdated}`);
  console.log(`Participants deleted: ${totalParticipantsDeleted}`);
  if (errors.length > 0) {
    console.log(`\n❌ Errors: ${errors.length}`);
    for (const err of errors) {
      console.log(`  - ${err.group}: ${err.error}`);
    }
  }

  if (dryRun) {
    console.log('\n✅ Dry run completed. Run without --dry-run to apply changes.');
  } else {
    console.log('\n✅ Consolidation completed successfully!');
    console.log('\n⚠️  Next steps:');
    console.log('  1. Update Prisma schema to remove year field');
    console.log('  2. Run: npx prisma migrate dev --name remove-year-from-year-top-participant');
    console.log('  3. Update API and validation code');
  }

  await prisma.$disconnect();
  await pool.end();
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
