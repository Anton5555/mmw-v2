/**
 * Check why special mentions import created 0 rows
 * 
 * Diagnoses missing movies, participants, or existing picks
 */

import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🔍 Special Mentions Import Diagnostics');
  console.log('=====================================\n');

  const sqlPath = path.resolve(__dirname, '../sql/mam-special-mentions.sql');
  if (!fs.existsSync(sqlPath)) {
    console.error(`❌ ${sqlPath} not found`);
    process.exit(1);
  }

  // Parse the SQL to extract slugs and imdbIds
  const sql = fs.readFileSync(sqlPath, 'utf8');
  
  // Find the VALUES section
  const valuesStart = sql.indexOf('VALUES');
  if (valuesStart === -1) {
    console.error('❌ Could not find VALUES in SQL');
    process.exit(1);
  }

  // Extract everything from VALUES to the closing parenthesis before JOIN
  const valuesEnd = sql.indexOf(') AS mentions', valuesStart);
  if (valuesEnd === -1) {
    console.error('❌ Could not find end of VALUES in SQL');
    process.exit(1);
  }

  const valuesText = sql.substring(valuesStart + 'VALUES'.length, valuesEnd);
  
  // Parse entries: each entry starts with "    ('" on a new line
  // Format: ('slug', 'imdbId', 'review...')
  // Slug and imdbId are always on the first line, so we can extract from there
  const mentions: Array<{ slug: string; imdbId: string }> = [];
  const lines = valuesText.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    // Each entry starts with "('"
    if (trimmed.startsWith("('")) {
      // Extract slug and imdbId from the first line
      // Pattern: ('slug', 'imdbId', ...
      // Handle escaped quotes: '' in SQL
      const match = trimmed.match(/^\(\s*'((?:[^']|'')*)'\s*,\s*'((?:[^']|'')*)'\s*,/);
      if (match) {
        const slug = match[1].replace(/''/g, "'");
        const imdbId = match[2].replace(/''/g, "'");
        mentions.push({ slug, imdbId });
      }
    }
  }

  console.log(`📊 Found ${mentions.length} special mentions in SQL\n`);

  // Check participants
  const slugs = [...new Set(mentions.map(m => m.slug))];
  const participants = await prisma.mamParticipant.findMany({
    where: { slug: { in: slugs } },
    select: { id: true, slug: true, displayName: true },
  });

  const participantMap = new Map(participants.map(p => [p.slug, p]));
  const missingParticipants = slugs.filter(slug => !participantMap.has(slug));

  console.log(`👥 Participants:`);
  console.log(`   Found: ${participants.length}/${slugs.length}`);
  if (missingParticipants.length > 0) {
    console.log(`   ❌ Missing: ${missingParticipants.join(', ')}`);
  }

  // Check movies
  const imdbIds = [...new Set(mentions.map(m => m.imdbId))];
  const movies = await prisma.movie.findMany({
    where: { imdbId: { in: imdbIds } },
    select: { id: true, imdbId: true, title: true },
  });

  const movieMap = new Map(movies.map(m => [m.imdbId, m]));
  const missingMovies = imdbIds.filter(imdbId => !movieMap.has(imdbId));

  console.log(`\n🎬 Movies:`);
  console.log(`   Found: ${movies.length}/${imdbIds.length}`);
  if (missingMovies.length > 0) {
    console.log(`   ❌ Missing: ${missingMovies.slice(0, 10).join(', ')}${missingMovies.length > 10 ? ` ... and ${missingMovies.length - 10} more` : ''}`);
  }

  // Check existing picks
  const participantIds = participants.map(p => p.id);
  const movieIds = movies.map(m => m.id);
  
  const existingPicks = await prisma.mamPick.findMany({
    where: {
      participantId: { in: participantIds },
      movieId: { in: movieIds },
    },
    select: {
      id: true,
      participantId: true,
      movieId: true,
      isSpecialMention: true,
    },
  });

  const existingPickKeys = new Set(
    existingPicks.map(p => `${p.participantId}:${p.movieId}:${p.isSpecialMention}`)
  );

  // Check which mentions would be blocked
  let wouldBeBlocked = 0;
  let wouldBeInserted = 0;

  for (const mention of mentions) {
    const participant = participantMap.get(mention.slug);
    const movie = movieMap.get(mention.imdbId);

    if (!participant || !movie) {
      continue; // Already counted as missing
    }

    const specialMentionKey = `${participant.id}:${movie.id}:true`;
    if (existingPickKeys.has(specialMentionKey)) {
      wouldBeBlocked++;
    } else {
      wouldBeInserted++;
    }
  }

  console.log(`\n📝 Picks:`);
  console.log(`   Would be inserted: ${wouldBeInserted}`);
  console.log(`   Would be blocked (already exists): ${wouldBeBlocked}`);
  console.log(`   Missing participant/movie: ${mentions.length - wouldBeInserted - wouldBeBlocked}`);

  // Summary
  console.log(`\n📊 Summary:`);
  if (missingParticipants.length === 0 && missingMovies.length === 0 && wouldBeInserted > 0) {
    console.log(`   ✅ All data exists, ${wouldBeInserted} special mentions should be inserted`);
  } else {
    if (missingParticipants.length > 0) {
      console.log(`   ❌ ${missingParticipants.length} participants missing - create them first`);
    }
    if (missingMovies.length > 0) {
      console.log(`   ❌ ${missingMovies.length} movies missing - create them first (run mam:generate-sql)`);
    }
    if (wouldBeBlocked > 0) {
      console.log(`   ⚠️  ${wouldBeBlocked} special mentions already exist`);
    }
  }

  await prisma.$disconnect();
  await pool.end();
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
