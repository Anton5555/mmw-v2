/**
 * Check YearTop participants and their user mappings
 * Compares CSV participants with existing database participants/users
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

  // CSV participant names from 2024 (from dry-run output)
  const csvParticipants = [
    'Alan',
    'Albano! @albaletti',
    'Ale',
    'Anton',
    'basophium',
    'claudio',
    'El Picaro',
    'El_Diegot3',
    'Esteban',
    'estrasnoy',
    'EvilIpa',
    'FedeC',
    'ferheinz',
    'Gary Busy',
    'Hernán Rodriguez',
    'IaiIu',
    'Ivana',
    'JoiaNunez',
    'Juan Navarro',
    'Lavtaro',
    'Lucho73r',
    'Mar',
    'Marce',
    'Martín Goniondzki',
    'Matias Mayer',
    'Mauricio P',
    'May',
    'mishilvina',
    'Natalia',
    'noelyas',
    'Sanntee',
    'Santi',
    'Santiago',
    'Tishey',
    'Vicky_Picky',
  ];

  console.log('🔍 Analyzing YearTop Participants and Users\n');
  console.log('='.repeat(60));

  console.log('📥 Fetching data from database...');
  
  // Get all existing YearTop participants (any year)
  console.log('  - Fetching YearTop participants...');
  const existingParticipants = await prisma.yearTopParticipant.findMany({
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      displayName: 'asc',
    },
  });

  // Get all MamParticipants for comparison
  console.log('  - Fetching MamParticipants...');
  const mamParticipants = await prisma.mamParticipant.findMany({
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      displayName: 'asc',
    },
  });

  // Get all users
  console.log('  - Fetching users...');
  const allUsers = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
    },
    orderBy: {
      name: 'asc',
    },
  });

  console.log('✅ Data fetched successfully!\n');

  console.log(`\n📊 Statistics:`);
  console.log(`   CSV Participants (2024): ${csvParticipants.length}`);
  console.log(`   Existing YearTop Participants: ${existingParticipants.length}`);
  console.log(`   MamParticipants: ${mamParticipants.length}`);
  console.log(`   Total Users: ${allUsers.length}`);

  // Helper function to generate slug (same as in import script)
  function generateSlug(displayName: string): string {
    return displayName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50);
  }

  function stripLeadingAt(text: string): string {
    return text.replace(/^@+/, '').trim();
  }

  console.log(`\n📋 CSV Participants Analysis:\n`);
  console.log('='.repeat(60));

  const analysis: Array<{
    csvName: string;
    slug: string;
    hasYearTop: boolean;
    yearTopUserId?: string | null;
    hasMam: boolean;
    mamUserId?: string | null;
    suggestedUserId?: string | null;
  }> = [];

  for (const csvName of csvParticipants) {
    const normalizedName = stripLeadingAt(csvName);
    const slug = generateSlug(normalizedName);

    // Check YearTop participants
    const yearTopParticipant = existingParticipants.find(
      (p) => p.slug === slug
    );

    // Check MamParticipants
    const mamParticipant = mamParticipants.find((p) => p.slug === slug);

    const suggestedUserId =
      yearTopParticipant?.userId ||
      mamParticipant?.userId ||
      null;

    analysis.push({
      csvName,
      slug,
      hasYearTop: !!yearTopParticipant,
      yearTopUserId: yearTopParticipant?.userId,
      hasMam: !!mamParticipant,
      mamUserId: mamParticipant?.userId,
      suggestedUserId,
    });
  }

  // Group by status
  const withUser = analysis.filter((a) => a.suggestedUserId);
  const withoutUser = analysis.filter((a) => !a.suggestedUserId);
  const existingYearTop = analysis.filter((a) => a.hasYearTop);
  const existingMam = analysis.filter((a) => a.hasMam);

  console.log(`\n✅ Participants with existing user mapping: ${withUser.length}`);
  for (const item of withUser) {
    const user = allUsers.find((u) => u.id === item.suggestedUserId);
    console.log(
      `   - ${item.csvName.padEnd(25)} → ${user?.name || user?.email || item.suggestedUserId} (${item.suggestedUserId})`
    );
    if (item.hasYearTop) {
      console.log(`     └─ YearTop participant`);
    }
    if (item.hasMam) {
      console.log(`     └─ MamParticipant`);
    }
  }

  console.log(`\n⚠️  Participants without user mapping: ${withoutUser.length}`);
  for (const item of withoutUser) {
    console.log(`   - ${item.csvName}`);
    if (item.hasYearTop) {
      console.log(`     └─ YearTop participant (no userId)`);
    }
    if (item.hasMam) {
      console.log(`     └─ MamParticipant (no userId)`);
    }
  }

  console.log(`\n📝 Participants already in YearTop: ${existingYearTop.length}`);
  for (const item of existingYearTop) {
    console.log(`   - ${item.csvName}`);
  }

  console.log(`\n🎬 Participants in Mam: ${existingMam.length}`);
  for (const item of existingMam) {
    if (!item.hasYearTop) {
      console.log(`   - ${item.csvName}`);
    }
  }

  // Generate mapping JSON for participants without userId
  const mappingNeeded = withoutUser.map((item) => ({
    csvName: item.csvName,
    slug: item.slug,
    note: item.hasYearTop
      ? 'YearTop participant'
      : item.hasMam
      ? 'MamParticipant'
      : 'New participant',
  }));

  if (mappingNeeded.length > 0) {
    console.log(`\n💡 Participants that may need user mapping:`);
    console.log(JSON.stringify(mappingNeeded, null, 2));
  }

  await prisma.$disconnect();
  await pool.end();
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
