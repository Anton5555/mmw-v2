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
  console.log('🗑️  Clearing YearTop Pick and Stats Data');
  console.log('==========================================\n');

  // Delete all YearTopPick records (but NOT YearTopParticipant)
  const picksDeleted = await prisma.yearTopPick.deleteMany({});
  console.log(`✅ Deleted ${picksDeleted.count} YearTopPick records`);

  // Delete all YearTopMovieStats records
  const statsDeleted = await prisma.yearTopMovieStats.deleteMany({});
  console.log(`✅ Deleted ${statsDeleted.count} YearTopMovieStats records`);

  console.log('\n🎉 Data cleared successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
