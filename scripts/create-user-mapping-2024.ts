/**
 * Create user-mapping.json for 2024 YearTop import
 * Queries MamParticipant IDs to get userIds
 */

import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as fs from 'fs';
import 'dotenv/config';

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  // Participant ID to CSV name mapping
  const participantIdToCsvName: Record<number, string> = {
    22: 'Albano! @albaletti',
    11: 'claudio',
    13: 'FedeC',
    27: 'ferheinz',
    7: 'Gary Busy',
    12: 'Martín Goniondzki',
    25: 'Matias Mayer',
    15: 'mishilvina',
    29: 'Sanntee',
  };

  console.log('🔍 Fetching userIds for participant IDs...\n');

  const participants = await prisma.mamParticipant.findMany({
    where: {
      id: {
        in: Object.keys(participantIdToCsvName).map(Number),
      },
    },
    select: {
      id: true,
      displayName: true,
      slug: true,
      userId: true,
    },
    orderBy: {
      id: 'asc',
    },
  });

  console.log('📋 Found participants:\n');
  for (const p of participants) {
    const csvName = participantIdToCsvName[p.id];
    console.log(`  ID ${p.id}: ${p.displayName} (slug: ${p.slug})`);
    console.log(`    CSV name: ${csvName}`);
    console.log(`    userId: ${p.userId || 'NULL'}\n`);
  }

  // Create user mapping
  const userMapping: Record<string, string> = {};

  for (const p of participants) {
    const csvName = participantIdToCsvName[p.id];
    if (!csvName || !p.userId) {
      console.log(`⚠️  Skipping ID ${p.id}: ${csvName || 'no CSV name'} - ${p.userId ? '' : 'no userId'}`);
      continue;
    }

    // Add both original and normalized versions
    userMapping[csvName] = p.userId;
    
    // Also add version without leading @
    const normalized = csvName.replace(/^@+/, '').trim();
    if (normalized !== csvName) {
      userMapping[normalized] = p.userId;
    }
  }

  // Write to file
  const outputPath = 'data/user-mapping-2024.json';
  fs.writeFileSync(outputPath, JSON.stringify(userMapping, null, 2));

  console.log(`\n✅ User mapping created: ${outputPath}\n`);
  console.log(JSON.stringify(userMapping, null, 2));

  await prisma.$disconnect();
  await pool.end();
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
