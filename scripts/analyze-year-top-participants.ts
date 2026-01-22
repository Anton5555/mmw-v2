/**
 * Analyze YearTopParticipant records to identify duplicates for consolidation
 *
 * Groups participants by userId (for linked) and by slug (for unlinked),
 * showing what will be consolidated. Keeps the most recent by createdAt.
 *
 * Usage:
 *   npx tsx scripts/analyze-year-top-participants.ts
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

interface ParticipantRecord {
  id: number;
  displayName: string;
  slug: string;
  userId: string | null;
  createdAt: Date;
  pickCount: number;
}

interface ConsolidationGroup {
  key: string; // userId or slug
  type: 'linked' | 'unlinked';
  participants: ParticipantRecord[];
  keepId: number; // ID of the participant to keep (most recent)
  deleteIds: number[]; // IDs to delete
}

interface ConsolidationPlan {
  linkedGroups: ConsolidationGroup[];
  unlinkedGroups: ConsolidationGroup[];
  unlinkedSingles: ParticipantRecord[]; // Unlinked participants with unique slugs
  summary: {
    totalParticipants: number;
    totalGroups: number;
    totalToConsolidate: number;
    totalToDelete: number;
    totalPicksToMove: number;
  };
}

async function main() {
  console.log('🔍 Analyzing YearTopParticipant Records');
  console.log('=======================================\n');

  // Fetch all participants with their pick counts
  console.log('📥 Fetching data from database...');
  const participants = await prisma.yearTopParticipant.findMany({
    include: {
      _count: {
        select: {
          picks: true,
        },
      },
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: [{ createdAt: 'desc' }],
  });

  console.log(`✅ Found ${participants.length} participant records\n`);

  // Transform to our format
  const records: ParticipantRecord[] = participants.map((p) => ({
    id: p.id,
    displayName: p.displayName,
    slug: p.slug,
    userId: p.userId,
    createdAt: p.createdAt,
    pickCount: p._count.picks,
  }));

  // Group by userId (for linked participants)
  const linkedMap = new Map<string, ParticipantRecord[]>();
  for (const record of records) {
    if (record.userId) {
      if (!linkedMap.has(record.userId)) {
        linkedMap.set(record.userId, []);
      }
      linkedMap.get(record.userId)!.push(record);
    }
  }

  // Group by slug (for unlinked participants)
  const unlinkedMap = new Map<string, ParticipantRecord[]>();
  for (const record of records) {
    if (!record.userId) {
      if (!unlinkedMap.has(record.slug)) {
        unlinkedMap.set(record.slug, []);
      }
      unlinkedMap.get(record.slug)!.push(record);
    }
  }

  // Build consolidation groups
  const linkedGroups: ConsolidationGroup[] = [];
  for (const [userId, groupRecords] of linkedMap.entries()) {
    if (groupRecords.length > 1) {
      // Sort by createdAt desc to get most recent
      const sorted = [...groupRecords].sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      );
      const keep = sorted[0];
      const toDelete = sorted.slice(1);

      linkedGroups.push({
        key: userId,
        type: 'linked',
        participants: sorted,
        keepId: keep.id,
        deleteIds: toDelete.map((p) => p.id),
      });
    }
  }

  const unlinkedGroups: ConsolidationGroup[] = [];
  const unlinkedSingles: ParticipantRecord[] = [];
  for (const [slug, groupRecords] of unlinkedMap.entries()) {
    if (groupRecords.length > 1) {
      // Sort by createdAt desc to get most recent
      const sorted = [...groupRecords].sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      );
      const keep = sorted[0];
      const toDelete = sorted.slice(1);

      unlinkedGroups.push({
        key: slug,
        type: 'unlinked',
        participants: sorted,
        keepId: keep.id,
        deleteIds: toDelete.map((p) => p.id),
      });
    } else {
      unlinkedSingles.push(groupRecords[0]);
    }
  }

  // Calculate summary
  const totalToDelete = [
    ...linkedGroups.flatMap((g) => g.deleteIds),
    ...unlinkedGroups.flatMap((g) => g.deleteIds),
  ].length;

  const totalPicksToMove = [
    ...linkedGroups.flatMap((g) =>
      g.participants
        .filter((p) => p.id !== g.keepId)
        .map((p) => p.pickCount)
    ),
    ...unlinkedGroups.flatMap((g) =>
      g.participants
        .filter((p) => p.id !== g.keepId)
        .map((p) => p.pickCount)
    ),
  ].reduce((sum, count) => sum + count, 0);

  const plan: ConsolidationPlan = {
    linkedGroups,
    unlinkedGroups,
    unlinkedSingles,
    summary: {
      totalParticipants: records.length,
      totalGroups: linkedGroups.length + unlinkedGroups.length,
      totalToConsolidate: linkedGroups.length + unlinkedGroups.length,
      totalToDelete,
      totalPicksToMove,
    },
  };

  // Print console report
  console.log('📊 CONSOLIDATION ANALYSIS\n');
  console.log('='.repeat(70));

  if (linkedGroups.length > 0) {
    console.log(`\n✅ LINKED USERS (will consolidate): ${linkedGroups.length} groups\n`);
    for (const group of linkedGroups) {
      const user = participants.find((p) => p.userId === group.key)?.user;
      const userInfo = user
        ? `${user.name || user.email || 'Unknown'} (${group.key.substring(0, 20)}...)`
        : `${group.key.substring(0, 20)}...`;

      console.log(`  userId: ${userInfo}`);
      for (const p of group.participants) {
        const isKeep = p.id === group.keepId;
        const marker = isKeep ? '└─' : '├─';
        const action = isKeep ? 'KEEP (most recent)' : `DELETE, move ${p.pickCount} picks to id:${group.keepId}`;
        console.log(
          `  ${marker} id:${p.id.toString().padStart(3)} "${p.displayName}" (${p.pickCount} picks) <- ${action}`
        );
      }
      console.log('');
    }
  }

  if (unlinkedGroups.length > 0) {
    console.log(`\n⚠️  UNLINKED (NULL userId) - DUPLICATE SLUGS: ${unlinkedGroups.length} groups\n`);
    for (const group of unlinkedGroups) {
      console.log(`  slug: ${group.key}`);
      for (const p of group.participants) {
        const isKeep = p.id === group.keepId;
        const marker = isKeep ? '└─' : '├─';
        const action = isKeep ? 'KEEP (most recent)' : `DELETE, move ${p.pickCount} picks to id:${group.keepId}`;
        console.log(
          `  ${marker} id:${p.id.toString().padStart(3)} "${p.displayName}" (${p.pickCount} picks) <- ${action}`
        );
      }
      console.log('');
    }
  }

  if (unlinkedSingles.length > 0) {
    console.log(`\n📝 UNLINKED (NULL userId) - UNIQUE SLUGS: ${unlinkedSingles.length} participants\n`);
    console.log('  These will remain as-is (no consolidation needed):');
    for (const p of unlinkedSingles) {
      console.log(
        `    id:${p.id.toString().padStart(3)} "${p.displayName}" (slug: ${p.slug}, ${p.pickCount} picks)`
      );
    }
    console.log('');
  }

  // Summary
  console.log('\n📈 SUMMARY');
  console.log('='.repeat(70));
  console.log(`Total participants: ${plan.summary.totalParticipants}`);
  console.log(`Groups to consolidate: ${plan.summary.totalGroups}`);
  console.log(`  - Linked users: ${linkedGroups.length}`);
  console.log(`  - Unlinked duplicates: ${unlinkedGroups.length}`);
  console.log(`Participants to delete: ${plan.summary.totalToDelete}`);
  console.log(`Picks to move: ${plan.summary.totalPicksToMove}`);
  console.log(`Unlinked singles (no action): ${unlinkedSingles.length}`);

  // Write JSON file
  const outputPath = path.join(process.cwd(), 'data', 'year-top-consolidation-plan.json');
  fs.writeFileSync(outputPath, JSON.stringify(plan, null, 2), 'utf8');
  console.log(`\n✅ Consolidation plan written to: ${outputPath}`);

  await prisma.$disconnect();
  await pool.end();
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
