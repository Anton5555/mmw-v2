/**
 * MAM Reviews SQL Import Runner
 *
 * Runs the generated reviews SQL file to update MamPick.review fields.
 *
 * Usage:
 *   npx tsx scripts/import-mam-reviews-sql.ts
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
  console.log('🎬 MAM Reviews SQL Import Runner');
  console.log('================================\n');

  const sqlDir = path.resolve(__dirname, '../sql');
  const reviewsSql = path.join(sqlDir, 'mam-reviews.sql');

  // Check if file exists
  if (!fs.existsSync(reviewsSql)) {
    console.error(`❌ ${reviewsSql} not found. Run 'npm run mam:generate-reviews-sql' first.`);
    process.exit(1);
  }

  try {
    console.log(`📝 Running ${path.basename(reviewsSql)}...`);
    const sql = fs.readFileSync(reviewsSql, 'utf8');
    
    const result = await pool.query(sql);
    console.log(`✅ Completed ${path.basename(reviewsSql)}`);
    console.log(`   Updated ${result.rowCount || 0} picks with reviews`);
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
