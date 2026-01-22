/**
 * Link MAM Participants to User Accounts
 *
 * Updates MamParticipant records with user IDs from a mapping file.
 * Only updates participants that currently have no userId set, unless --force is used.
 *
 * Usage:
 *   npx tsx scripts/link-mam-users.ts --mapping=./data/user-mapping-pending.json
 *   npx tsx scripts/link-mam-users.ts --mapping=./data/user-mapping-pending.json --force
 *   npx tsx scripts/link-mam-users.ts --mapping=./data/user-mapping-pending.json --dry-run
 */

import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as fs from 'fs';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

interface UserMapping {
  [participantName: string]: string;
}

// Helper to generate slug from display name (same as seed script)
function generateSlug(displayName: string): string {
  return displayName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const force = args.includes('--force');
  const mappingArg = args.find((arg) => arg.startsWith('--mapping='));
  const mappingPath = mappingArg?.split('=')[1];

  console.log('🔗 Link MAM Participants to Users');
  console.log('==================================');
  if (dryRun) console.log('🔍 DRY RUN MODE - No changes will be made');
  if (force) console.log('⚠️  FORCE MODE - Will overwrite existing user links');
  console.log('');

  if (!mappingPath) {
    console.error(
      '❌ Please provide a mapping file: --mapping=path/to/file.json'
    );
    process.exit(1);
  }

  // Load user mapping
  let userMapping: UserMapping = {};
  try {
    const mappingContent = fs.readFileSync(mappingPath, 'utf8');
    userMapping = JSON.parse(mappingContent);

    // Filter out empty values
    const entries = Object.entries(userMapping).filter(
      ([_, userId]) => userId && userId.trim() !== ''
    );
    userMapping = Object.fromEntries(entries);

    console.log(
      `✅ Loaded ${
        Object.keys(userMapping).length
      } user mappings from ${mappingPath}\n`
    );
  } catch (error) {
    console.error(`❌ Failed to load mapping file:`, error);
    process.exit(1);
  }

  if (Object.keys(userMapping).length === 0) {
    console.log('ℹ️  No user mappings to process (all values are empty)');
    await prisma.$disconnect();
    return;
  }

  let updated = 0;
  let skipped = 0;
  let notFound = 0;
  let alreadyLinked = 0;

  for (const [displayName, userId] of Object.entries(userMapping)) {
    const slug = generateSlug(displayName);

    // Find the participant
    const participant = await prisma.mamParticipant.findUnique({
      where: { slug },
      select: { id: true, displayName: true, userId: true },
    });

    if (!participant) {
      console.log(
        `  ⚠️  Participant not found: "${displayName}" (slug: ${slug})`
      );
      notFound++;
      continue;
    }

    if (participant.userId && !force) {
      console.log(
        `  ⏭️  Already linked: "${displayName}" -> ${participant.userId}`
      );
      alreadyLinked++;
      continue;
    }

    if (dryRun) {
      console.log(`  🔍 Would link: "${displayName}" -> ${userId}`);
      updated++;
      continue;
    }

    try {
      await prisma.mamParticipant.update({
        where: { slug },
        data: { userId },
      });
      console.log(`  ✅ Linked: "${displayName}" -> ${userId}`);
      updated++;
    } catch (error) {
      console.error(`  ❌ Failed to update "${displayName}":`, error);
      skipped++;
    }
  }

  console.log('\n📊 Summary:');
  console.log(`   ✅ Updated: ${updated}`);
  console.log(`   ⏭️  Already linked: ${alreadyLinked}`);
  console.log(`   ⚠️  Not found: ${notFound}`);
  if (skipped > 0) console.log(`   ❌ Errors: ${skipped}`);

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('Fatal error:', error);
  prisma.$disconnect();
  process.exit(1);
});
