/**
 * MAM Reviews SQL Import Generator
 *
 * Generates SQL UPDATE statements to add reviews to existing MamPick records.
 * Reads CSV files and maps them to picks using ranking->imdbId and usuario->slug.
 *
 * Usage:
 *   npx tsx scripts/generate-mam-reviews-sql.ts --csv=path/to/file1.csv --csv=path/to/file2.csv
 */

import { parse as parseCsv } from 'csv-parse/sync';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Types
interface CsvReviewRow {
  rankingRaw: string;
  movieRaw: string;
  userRaw: string;
  commentRaw: string;
}

interface Db2Movie {
  idx: number;
}

type ReviewKey = `${number}|${string}`;

interface DedupedReview {
  ranking: number;
  usuario: string;
  slug: string;
  comentario: string;
}

// Participant name mappings: CSV usuario -> DB displayName
const PARTICIPANT_NAME_MAPPINGS: Record<string, string> = {
  '@clauhernan73': 'claudiohernan73',
  clauhernan73: 'claudiohernan73',
  '@MatiasGilRobert': '110x75',
  MatiasGilRobert: '110x75',
  'Alan Gabriel': 'alangmonzon',
  'Biam!': 'ponybiam',
};

// Manual overrides for (ranking, usuario) -> correct imdbId
const RANKING_IMDB_OVERRIDES: Record<string, string> = {
  '205|santi': 'tt0240419',
  '206|estrasnoy': 'tt0167404',
  '216|@noelyas': 'tt1588170',
  '216|noelyas': 'tt1588170',
  '232|tj': 'tt0086190',
  '241|mayerinn': 'tt0017136',
  '297|lucho73r': 'tt0090142',
  '297|lucho': 'tt0090142',
  '7|evilipa': 'tt0075314',
  '7|@evilipa': 'tt0075314',
  '427|pblo79': 'tt0071338',
};

// Multi-participant entries
function resolveParticipantNames(usuario: string, imdbId?: string): string[] {
  // Special case: Carlinies - @ComunistaYa for tt2543164 is only ComunistaYa
  if (
    usuario.includes('Carlinies') &&
    usuario.includes('ComunistaYa') &&
    imdbId === 'tt2543164'
  ) {
    return ['@ComunistaYa'];
  }

  // Check if it's a multi-participant entry (contains " - ")
  if (usuario.includes(' - ')) {
    const parts = usuario.split(' - ').map((p) => p.trim());
    return parts.map((p) => PARTICIPANT_NAME_MAPPINGS[p] ?? p);
  }

  // Single participant with potential mapping
  const mapped = PARTICIPANT_NAME_MAPPINGS[usuario];
  return mapped ? [mapped] : [usuario];
}

function getCorrectImdbId(
  ranking: number,
  usuario: string,
  mappedImdbId: string
): string {
  const overrideKey = `${ranking}|${usuario.toLowerCase()}`;
  return RANKING_IMDB_OVERRIDES[overrideKey] ?? mappedImdbId;
}

function normalizeNewlines(text: string): string {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

function generateSlug(displayName: string): string {
  return displayName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
}

function escapeSqlString(str: string): string {
  return str.replace(/'/g, "''").replace(/\\/g, '\\\\');
}

function stripLeadingAt(text: string): string {
  return text.replace(/^@+/, '').trim();
}

function readCsvFile(filePath: string): CsvReviewRow[] {
  const content = fs.readFileSync(filePath, 'utf8');
  const records = parseCsv(content, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
    trim: false,
  }) as Record<string, string>[];

  return records.map((r) => ({
    rankingRaw: r['Ranking'] ?? '',
    movieRaw: r['Película'] ?? r['Pelicula'] ?? '',
    userRaw: r['Usuario'] ?? '',
    commentRaw: r['Comentario'] ?? '',
  }));
}

function buildRankToImdbMap(db2: Record<string, Db2Movie>): Map<number, string> {
  const map = new Map<number, string>();
  for (const [imdbId, movie] of Object.entries(db2)) {
    const idx = Number(movie.idx);
    if (Number.isFinite(idx)) {
      map.set(idx, imdbId);
    }
  }
  return map;
}

async function main() {
  const args = process.argv.slice(2);
  const csvPaths: string[] = [];
  let db2Path: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--csv' && args[i + 1]) {
      csvPaths.push(args[i + 1]);
      i++;
    } else if (arg.startsWith('--csv=')) {
      csvPaths.push(arg.slice('--csv='.length));
    } else if (arg === '--db2' && args[i + 1]) {
      db2Path = args[i + 1];
      i++;
    } else if (arg.startsWith('--db2=')) {
      db2Path = arg.slice('--db2='.length);
    }
  }

  if (csvPaths.length === 0) {
    console.error('❌ No CSV files provided. Use --csv=path/to/file.csv');
    process.exit(1);
  }

  console.log('🎬 MAM Reviews SQL Import Generator');
  console.log('==================================\n');

  // Load db_2.json for ranking -> imdbId mapping
  const defaultDb2Path = path.resolve(__dirname, '../data/db_2.json');
  const finalDb2Path = db2Path ? path.resolve(db2Path) : defaultDb2Path;

  let db2Data: Record<string, Db2Movie> = {};
  try {
    db2Data = JSON.parse(fs.readFileSync(finalDb2Path, 'utf8'));
    console.log(`✅ Loaded db_2.json: ${Object.keys(db2Data).length} movies`);
  } catch (error) {
    console.error(`❌ Failed to load ${finalDb2Path}:`, error);
    process.exit(1);
  }

  const rankToImdb = buildRankToImdbMap(db2Data);
  console.log(`✅ Built rank->imdbId map: ${rankToImdb.size} ranks\n`);

  // Load and parse CSVs
  const rawRows: CsvReviewRow[] = [];
  for (const csvPath of csvPaths) {
    const abs = path.resolve(csvPath);
    try {
      const rows = readCsvFile(abs);
      rawRows.push(...rows);
      console.log(`✅ Loaded CSV: ${abs} (${rows.length} rows)`);
    } catch (error) {
      console.error(`❌ Failed to load ${abs}:`, error);
    }
  }
  console.log('');

  // Deduplicate reviews (keep longest comment per ranking+usuario)
  const dedupedByKey = new Map<ReviewKey, DedupedReview>();

  for (const row of rawRows) {
    const ranking = Number(String(row.rankingRaw ?? '').trim());
    const usuario = String(row.userRaw ?? '').trim();
    const comentario = normalizeNewlines(String(row.commentRaw ?? '')).trim();

    if (!Number.isFinite(ranking) || !usuario || !comentario) {
      continue;
    }

    const slug = generateSlug(usuario);
    const key: ReviewKey = `${ranking}|${usuario.toLowerCase()}`;

    const existing = dedupedByKey.get(key);
    if (!existing || comentario.length > existing.comentario.length) {
      dedupedByKey.set(key, {
        ranking,
        usuario,
        slug,
        comentario,
      });
    }
  }

  console.log(`📊 Parsed ${rawRows.length} CSV rows`);
  console.log(`📊 Deduped to ${dedupedByKey.size} unique reviews\n`);

  // Expand multi-participant entries
  const expandedReviews: Array<{
    ranking: number;
    usuario: string;
    slug: string;
    comentario: string;
    imdbId: string;
  }> = [];

  for (const r of dedupedByKey.values()) {
    const mappedImdbId = rankToImdb.get(r.ranking);
    if (!mappedImdbId) continue;

    const imdbId = getCorrectImdbId(r.ranking, r.usuario, mappedImdbId);
    const participantNames = resolveParticipantNames(r.usuario, imdbId);

    for (const participantName of participantNames) {
      expandedReviews.push({
        ranking: r.ranking,
        usuario: participantName,
        slug: generateSlug(participantName),
        comentario: r.comentario,
        imdbId,
      });
    }
  }

  console.log(
    `📊 Expanded to ${expandedReviews.length} reviews (multi-participant split)\n`
  );

  // Generate SQL
  console.log('📝 Generating SQL file...\n');

  const sqlDir = path.resolve(__dirname, '../sql');
  if (!fs.existsSync(sqlDir)) {
    fs.mkdirSync(sqlDir, { recursive: true });
  }

  const reviewsSql: string[] = [
    '-- MAM Reviews Import',
    '-- Generated by generate-mam-reviews-sql.ts',
    '-- Updates MamPick.review for existing picks',
    '-- Only updates picks that don\'t already have reviews',
    '',
    'UPDATE "MamPick" mp',
    'SET review = subquery.review',
    'FROM (',
    '  SELECT',
    '    p.id AS "participantId",',
    '    m.id AS "movieId",',
    '    reviews.review',
    '  FROM (',
    '    VALUES',
  ];

  // Build VALUES clause for all reviews
  const reviewValues: string[] = [];
  for (const r of expandedReviews) {
    const escapedReview = escapeSqlString(r.comentario);
    reviewValues.push(`    ('${r.slug}', '${r.imdbId}', '${escapedReview}')`);
  }

  reviewsSql.push(reviewValues.join(',\n'));
  reviewsSql.push('  ) AS reviews(participant_slug, imdb_id, review)');
  reviewsSql.push('  JOIN "MamParticipant" p ON p.slug = reviews.participant_slug');
  reviewsSql.push('  JOIN "Movie" m ON m."imdbId" = reviews.imdb_id');
  reviewsSql.push(') AS subquery');
  reviewsSql.push('WHERE mp."participantId" = subquery."participantId"');
  reviewsSql.push('  AND mp."movieId" = subquery."movieId"');
  reviewsSql.push('  AND (mp.review IS NULL OR mp.review = \'\');');
  reviewsSql.push('');

  const reviewsSqlPath = path.join(sqlDir, 'mam-reviews.sql');
  fs.writeFileSync(reviewsSqlPath, reviewsSql.join('\n'));
  
  const fileSize = fs.statSync(reviewsSqlPath).size;
  console.log(`✅ Generated ${reviewsSqlPath}`);
  console.log(`   ${expandedReviews.length} reviews`);
  console.log(`   ${(fileSize / 1024).toFixed(1)} KB`);
  console.log('\nTo import, run:');
  console.log('  psql $DATABASE_URL -f sql/mam-reviews.sql');
  console.log('\nNote: This only updates picks that don\'t already have reviews.');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
