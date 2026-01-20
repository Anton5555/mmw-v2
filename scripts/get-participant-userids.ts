/**
 * Get userIds for specific participant IDs
 */

import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  // Participant IDs provided by user
  const participantIds = [22, 11, 13, 27, 7, 12, 25, 15, 29];

  console.log('🔍 Fetching userIds for participant IDs...\n');

  const participants = await prisma.mamParticipant.findMany({
    where: {
      id: {
        in: participantIds,
      },
    },
    select: {
      id: true,
      displayName: true,
      slug: true,
      userId: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      id: 'asc',
    },
  });

  console.log('📋 Participant to UserId mappings:\n');
  for (const p of participants) {
    console.log(`ID ${p.id.toString().padStart(2)}: ${p.displayName.padEnd(20)} (slug: ${p.slug.padEnd(20)}) → userId: ${p.userId || 'NULL'}`);
    if (p.user) {
      console.log(`     User: ${p.user.name || p.user.email || 'N/A'}`);
    }
  }

  // Create mapping for CSV names
  const csvToParticipantMap: Record<number, string> = {
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

  console.log('\n📝 User Mapping JSON:\n');
  const userMapping: Record<string, string> = {};
  
  for (const p of participants) {
    const csvName = csvToParticipantMap[p.id];
    if (csvName && p.userId) {
      userMapping[csvName] = p.userId;
      // Also add normalized version (strip @)
      const normalized = csvName.replace(/^@+/, '').trim();
      if (normalized !== csvName) {
        userMapping[normalized] = p.userId;
      }
    }
  }

  console.log(JSON.stringify(userMapping, null, 2));

  await prisma.$disconnect();
  await pool.end();
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
