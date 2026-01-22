import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  const ids = [22, 11, 13, 27, 7, 12, 25, 15, 29];
  const participants = await prisma.mamParticipant.findMany({
    where: { id: { in: ids } },
    select: { id: true, displayName: true, slug: true, userId: true },
  });

  const mapping: Record<string, string> = {
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

  const userMapping: Record<string, string> = {};
  for (const p of participants) {
    const csvName = mapping[p.id];
    if (csvName && p.userId) {
      userMapping[csvName] = p.userId;
      const normalized = csvName.replace(/^@+/, '').trim();
      if (normalized !== csvName) userMapping[normalized] = p.userId;
    }
  }

  console.log(JSON.stringify(userMapping, null, 2));
  await prisma.$disconnect();
  await pool.end();
}

main().catch(console.error);
