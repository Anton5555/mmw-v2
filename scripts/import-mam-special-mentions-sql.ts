/**
 * MAM Special Mentions SQL Import Runner
 *
 * Runs the generated special mentions SQL file to create MamPick records with isSpecialMention: true.
 *
 * Usage:
 *   npx tsx scripts/import-mam-special-mentions-sql.ts
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
  console.log('🎬 MAM Special Mentions SQL Import Runner');
  console.log('========================================\n');

  const sqlDir = path.resolve(__dirname, '../sql');
  const specialMentionsSql = path.join(sqlDir, 'mam-special-mentions.sql');

  // Check if file exists
  if (!fs.existsSync(specialMentionsSql)) {
    console.error(`❌ ${specialMentionsSql} not found. Run 'npm run mam:generate-special-mentions-sql' first.`);
    process.exit(1);
  }

  try {
    console.log(`📝 Running ${path.basename(specialMentionsSql)}...`);
    const sql = fs.readFileSync(specialMentionsSql, 'utf8');
    
    const result = await pool.query(sql);
    console.log(`✅ Completed ${path.basename(specialMentionsSql)}`);
    console.log(`   Created ${result.rowCount || 0} special mention picks`);
    console.log('\n🎉 Import complete!');
  } catch (error) {
    console.error('\n❌ Import failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  prisma.$disconnect();
  process.exit(1);
});
