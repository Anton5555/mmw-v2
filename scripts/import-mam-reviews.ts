/**
 * Import MAM reviews from the “Comentarios MAM” CSV exports into the database.
 *
 * This script updates existing `MamPick` rows by setting `MamPick.review`.
 * It does NOT create movies, participants, or picks.
 *
 * Join strategy:
 * - Movie: CSV `Ranking` -> `data/db_2.json` movie.idx -> imdbId (tt...)
 * - Participant: CSV `Usuario` -> slugify (same algorithm as seed-mam.ts) -> MamParticipant.slug
 * - Pick: unique (participantId, movieId)
 *
 * Behavior:
 * - If a pick already has a review, it is skipped (only fill empty reviews).
 * - If there are duplicates in CSV for the same (Ranking, Usuario), the longest comment wins.
 *
 * Output:
 * - Prints a summary to stdout
 * - Writes `./data/mam-review-import-report.json` with any unresolved rows + mismatches
 *
 * Usage (PowerShell):
 *   npx tsx scripts/import-mam-reviews.ts --dry-run `
 *     --csv "C:\Users\anton\Downloads\Comentarios MAM - Hoja 1.csv" `
 *     --csv "C:\Users\anton\Downloads\Comentarios MAM - Hoja 2.csv" `
 *     --csv "C:\Users\anton\Downloads\Comentarios MAM - Hoja 3.csv" `
 *     --csv "C:\Users\anton\Downloads\Comentarios MAM - Hoja 4.csv" `
 *     --csv "C:\Users\anton\Downloads\Comentarios MAM - Hoja 5.csv" `
 *     --csv "C:\Users\anton\Downloads\Comentarios MAM - Hoja 6.csv"
 *
 * Then run again without `--dry-run` to apply changes.
 */
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { parse as parseCsv } from 'csv-parse/sync';
import * as fs from 'fs';
import * as path from 'path';
import * as process from 'process';
import 'dotenv/config';
import { promisify } from 'util';

const writeFileAsync = promisify(fs.writeFile);

type CsvReviewRow = {
  rankingRaw: string;
  movieRaw: string;
  userRaw: string;
  commentRaw: string;
};

type ReviewKey = `${number}|${string}`; // `${ranking}|${usuarioNormalized}`

type DedupedReview = {
  ranking: number;
  usuario: string;
  slug: string;
  pelicula: string;
  comentario: string;
  extractedImdbIds: string[];
};

type Db2Movie = {
  idx: number;
};

type Db2Data = Record<string, Db2Movie>;

function normalizeNewlines(text: string): string {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

function compactAlphaNum(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '');
}

function stripLeadingAt(text: string): string {
  return text.replace(/^@+/, '').trim();
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
// These are cases where the db_2.json mapping is wrong
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
  '427|pblo79': 'tt0071338', // Movie id 1933
};

// Multi-participant entries: CSV usuario -> array of DB displayNames
// Special case: "Carlinies - @ComunistaYa" for tt2543164 is only ComunistaYa
function resolveParticipantNames(usuario: string, imdbId?: string): string[] {
  // Special case: Carlinies - @ComunistaYa for tt2543164
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

function isEmptyReview(text: string | null | undefined): boolean {
  if (!text) return true;
  return text.trim().length === 0;
}

// Same as scripts/seed-mam.ts
function generateSlug(displayName: string): string {
  return displayName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
}

function extractImdbIdsFromText(text: string): string[] {
  const matches = text.match(/tt\d{7,8}/g);
  if (!matches) return [];
  // preserve order but de-dupe
  const seen = new Set<string>();
  const out: string[] = [];
  for (const m of matches) {
    if (seen.has(m)) continue;
    seen.add(m);
    out.push(m);
  }
  return out;
}

function parseArgs(argv: string[]) {
  const csvPaths: string[] = [];
  let db2Path: string | undefined;
  let dryRun = false;
  let help = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === '--help' || arg === '-h') {
      help = true;
      continue;
    }

    if (arg === '--dry-run') {
      dryRun = true;
      continue;
    }

    if (arg === '--csv') {
      const next = argv[i + 1];
      if (!next) throw new Error('Missing value for --csv');
      csvPaths.push(next);
      i++;
      continue;
    }

    if (arg.startsWith('--csv=')) {
      csvPaths.push(arg.slice('--csv='.length));
      continue;
    }

    if (arg === '--db2') {
      const next = argv[i + 1];
      if (!next) throw new Error('Missing value for --db2');
      db2Path = next;
      i++;
      continue;
    }

    if (arg.startsWith('--db2=')) {
      db2Path = arg.slice('--db2='.length);
      continue;
    }
  }

  return { csvPaths, db2Path, dryRun, help };
}

function printHelp() {
  console.log(
    `\nImport MAM reviews into MamPick.review\n\n` +
      `Options:\n` +
      `  --csv <path>        CSV file path (repeatable)\n` +
      `  --db2 <path>        Path to db_2.json (default: ./data/db_2.json)\n` +
      `  --dry-run           Do not write to DB, only report what would change\n` +
      `  --help, -h          Show help\n\n` +
      `Example:\n` +
      `  npx tsx scripts/import-mam-reviews.ts --dry-run --csv \"C:\\\\Users\\\\anton\\\\Downloads\\\\Comentarios MAM - Hoja 1.csv\" ...\n`
  );
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

  // Expected headers: Ranking,Película,Usuario,Comentario
  return records.map((r) => ({
    rankingRaw: r['Ranking'] ?? '',
    movieRaw: r['Película'] ?? r['Pelicula'] ?? '',
    userRaw: r['Usuario'] ?? '',
    commentRaw: r['Comentario'] ?? '',
  }));
}

function buildRankToImdbMap(db2: Db2Data): Map<number, string> {
  const map = new Map<number, string>();
  for (const [imdbId, movie] of Object.entries(db2)) {
    const idx = Number(movie.idx);
    if (!Number.isFinite(idx)) continue;
    map.set(idx, imdbId);
  }
  return map;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  if (args.csvPaths.length === 0) {
    throw new Error('No CSVs provided. Pass at least one --csv <path>.');
  }

  const defaultDb2Path = path.resolve(process.cwd(), 'data/db_2.json');
  const db2Path = args.db2Path ? path.resolve(args.db2Path) : defaultDb2Path;

  console.log('📝 Import MAM reviews');
  console.log('=====================');
  if (args.dryRun) console.log('🔍 DRY RUN MODE - No changes will be made\n');

  // Load db_2.json (rank->imdbId mapping)
  const db2Data = JSON.parse(fs.readFileSync(db2Path, 'utf8')) as Db2Data;
  const rankToImdb = buildRankToImdbMap(db2Data);
  console.log(`✅ Loaded db_2.json: ${Object.keys(db2Data).length} movies`);
  console.log(`✅ Built rank->imdbId map: ${rankToImdb.size} ranks\n`);

  // Load and parse CSVs, then de-dupe
  const rawRows: Array<{ file: string; row: CsvReviewRow }> = [];
  for (const csvPath of args.csvPaths) {
    const abs = path.resolve(csvPath);
    const rows = readCsvFile(abs);
    console.log(`✅ Loaded CSV: ${abs} (${rows.length} rows)`);
    for (const row of rows) rawRows.push({ file: abs, row });
  }
  console.log('');

  const dedupedByKey = new Map<ReviewKey, DedupedReview>();
  const duplicatesCollapsed: Array<{
    key: ReviewKey;
    keptLength: number;
    droppedLength: number;
  }> = [];

  // Track all skipped rows with reasons
  const skippedRowsWithoutRanking: Array<{
    usuario: string;
    pelicula: string;
    comentario: string;
    rankingRaw: string;
  }> = [];
  const skippedRowsWithoutUser: Array<{
    ranking: number;
    pelicula: string;
    comentario: string;
    usuarioRaw: string;
  }> = [];
  const skippedRowsWithEmptyComment: Array<{
    ranking: number;
    usuario: string;
    pelicula: string;
  }> = [];

  let parsedRows = 0;
  let rowsWithoutRanking = 0;
  let rowsWithoutUser = 0;
  let rowsWithEmptyComment = 0;

  for (const { row } of rawRows) {
    parsedRows++;
    const ranking = Number(String(row.rankingRaw ?? '').trim());
    const usuario = String(row.userRaw ?? '').trim();
    const pelicula = String(row.movieRaw ?? '').trim();
    const comentario = normalizeNewlines(String(row.commentRaw ?? '')).trim();

    if (!Number.isFinite(ranking)) {
      rowsWithoutRanking++;
      skippedRowsWithoutRanking.push({
        usuario,
        pelicula,
        comentario: comentario.substring(0, 200), // truncate for report
        rankingRaw: String(row.rankingRaw ?? '').trim(),
      });
      continue;
    }
    if (!usuario) {
      rowsWithoutUser++;
      skippedRowsWithoutUser.push({
        ranking,
        pelicula,
        comentario: comentario.substring(0, 200), // truncate for report
        usuarioRaw: String(row.userRaw ?? '').trim(),
      });
      continue;
    }
    if (!comentario) {
      rowsWithEmptyComment++;
      skippedRowsWithEmptyComment.push({
        ranking,
        usuario,
        pelicula,
      });
      continue;
    }

    const slug = generateSlug(usuario);
    const extractedImdbIds = extractImdbIdsFromText(comentario);
    const key: ReviewKey = `${ranking}|${usuario.toLowerCase()}`;

    const existing = dedupedByKey.get(key);
    if (!existing) {
      dedupedByKey.set(key, {
        ranking,
        usuario,
        slug,
        pelicula,
        comentario,
        extractedImdbIds,
      });
      continue;
    }

    // Keep longest comment, per requirement.
    if (comentario.length > existing.comentario.length) {
      duplicatesCollapsed.push({
        key,
        keptLength: comentario.length,
        droppedLength: existing.comentario.length,
      });
      dedupedByKey.set(key, {
        ranking,
        usuario,
        slug,
        pelicula,
        comentario,
        extractedImdbIds,
      });
    } else {
      duplicatesCollapsed.push({
        key,
        keptLength: existing.comentario.length,
        droppedLength: comentario.length,
      });
    }
  }

  const deduped = [...dedupedByKey.values()];
  console.log(`📊 Parsed rows: ${parsedRows}`);
  console.log(`📊 Deduped review rows: ${deduped.length}`);
  if (rowsWithoutRanking > 0)
    console.log(`⚠️  Skipped (missing/invalid Ranking): ${rowsWithoutRanking}`);
  if (rowsWithoutUser > 0)
    console.log(`⚠️  Skipped (missing Usuario): ${rowsWithoutUser}`);
  if (rowsWithEmptyComment > 0)
    console.log(`⚠️  Skipped (empty comment): ${rowsWithEmptyComment}`);
  if (duplicatesCollapsed.length > 0)
    console.log(
      `ℹ️  Collapsed duplicates (Ranking+Usuario): ${duplicatesCollapsed.length}`
    );
  console.log('');

  // Expand multi-participant entries into separate reviews
  type ExpandedReview = {
    ranking: number;
    usuario: string;
    slug: string;
    pelicula: string;
    comentario: string;
    extractedImdbIds: string[];
    originalUsuario: string; // keep original for reference
  };

  const expandedReviews: ExpandedReview[] = [];
  for (const r of deduped) {
    const mappedImdbId = rankToImdb.get(r.ranking);
    const participantNames = resolveParticipantNames(r.usuario, mappedImdbId);

    for (const participantName of participantNames) {
      expandedReviews.push({
        ranking: r.ranking,
        usuario: participantName,
        slug: generateSlug(participantName),
        pelicula: r.pelicula,
        comentario: r.comentario,
        extractedImdbIds: r.extractedImdbIds,
        originalUsuario: r.usuario,
      });
    }
  }

  console.log(
    `📊 Expanded reviews (multi-participant split): ${expandedReviews.length}`
  );
  console.log('');

  // Build rank->imdb for the expanded set and detect comment imdb mismatches
  const missingRankMapping: Array<{
    ranking: number;
    usuario: string;
    pelicula: string;
  }> = [];
  const imdbMismatch: Array<{
    ranking: number;
    usuario: string;
    pelicula: string;
    mappedImdbId: string;
    extractedImdbIds: string[];
  }> = [];

  const neededImdbIds = new Set<string>();
  const neededSlugs = new Set<string>();

  for (const r of expandedReviews) {
    const mappedImdbId = rankToImdb.get(r.ranking);
    if (!mappedImdbId) {
      missingRankMapping.push({
        ranking: r.ranking,
        usuario: r.usuario,
        pelicula: r.pelicula,
      });
      continue;
    }

    // For imdbMismatch cases, prefer extractedImdbId if it exists in DB
    // We'll check this later when we have the movie list
    const finalImdbId = mappedImdbId;
    neededImdbIds.add(finalImdbId);
    neededSlugs.add(r.slug);

    if (
      r.extractedImdbIds.length > 0 &&
      !r.extractedImdbIds.includes(mappedImdbId)
    ) {
      imdbMismatch.push({
        ranking: r.ranking,
        usuario: r.usuario,
        pelicula: r.pelicula,
        mappedImdbId,
        extractedImdbIds: r.extractedImdbIds,
      });
    }
  }

  console.log(
    `📌 Rows without rank->imdb mapping: ${missingRankMapping.length}`
  );
  console.log(`📌 Rows with comment imdb mismatch: ${imdbMismatch.length}`);
  console.log('');

  // Everything up to here completes the first todo (parsing + rank map).
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    // The rest is handled in next todo (DB join + updates)
    const report = {
      inputs: {
        csvPaths: args.csvPaths.map((p) => path.resolve(p)),
        db2Path,
        dryRun: args.dryRun,
      },
      counts: {
        parsedRows,
        dedupedRows: deduped.length,
        duplicatesCollapsed: duplicatesCollapsed.length,
        rowsWithoutRanking,
        rowsWithoutUser,
        rowsWithEmptyComment,
        missingRankMapping: missingRankMapping.length,
        imdbMismatch: imdbMismatch.length,
      },
      skippedRowsWithoutRanking,
      skippedRowsWithoutUser,
      skippedRowsWithEmptyComment,
      missingRankMapping,
      imdbMismatch,
      // populated later:
      missingParticipants: [] as Array<{
        usuario: string;
        slug: string;
        slugAlt?: string;
        compactUsuario?: string;
        ranking: number;
        imdbId: string;
      }>,
      missingMovies: [] as Array<{
        imdbId: string;
        ranking: number;
        usuario: string;
      }>,
      missingPicks: [] as Array<{
        ranking: number;
        usuario: string;
        imdbId: string;
        participantSlug: string;
      }>,
      skippedExistingReview: [] as Array<{
        ranking: number;
        usuario: string;
        imdbId: string;
      }>,
      wouldUpdate: [] as Array<{
        ranking: number;
        usuario: string;
        imdbId: string;
        pickId: number;
        reviewLength: number;
      }>,
      updated: [] as Array<{
        ranking: number;
        usuario: string;
        imdbId: string;
        pickId: number;
        reviewLength: number;
      }>,
    };

    // Preload participants and movies into maps
    // Also add extractedImdbIds from imdbMismatch cases to check if they exist
    // And add all override IMDB IDs to ensure they're looked up
    const imdbIdList = [...neededImdbIds];
    for (const mismatch of imdbMismatch) {
      for (const extractedId of mismatch.extractedImdbIds) {
        imdbIdList.push(extractedId);
      }
    }
    // Add all override IMDB IDs to the lookup list
    for (const overrideImdbId of Object.values(RANKING_IMDB_OVERRIDES)) {
      imdbIdList.push(overrideImdbId);
    }
    const uniqueImdbIdList = [...new Set(imdbIdList)];

    const neededUsuariosCount = new Set(
      expandedReviews
        .map((r) => stripLeadingAt(r.usuario).toLowerCase())
        .filter(Boolean)
    ).size;

    const [participants, movies] = await Promise.all([
      // Load all participants so we can match CSV usuarios like "@joianunez"
      // against displayName (e.g. "Joia Nunez") using a compact comparison.
      prisma.mamParticipant.findMany({
        select: { id: true, slug: true, displayName: true },
      }),
      prisma.movie.findMany({
        where: { imdbId: { in: uniqueImdbIdList } },
        select: { id: true, imdbId: true },
      }),
    ]);

    const participantIdBySlug = new Map<string, number>();
    const participantIdByCompactDisplay = new Map<string, number>();

    for (const p of participants) {
      participantIdBySlug.set(p.slug, p.id);

      const compact = compactAlphaNum(p.displayName);
      // Only store unique compacts to avoid ambiguous matches.
      if (!participantIdByCompactDisplay.has(compact)) {
        participantIdByCompactDisplay.set(compact, p.id);
      } else {
        // mark as ambiguous
        participantIdByCompactDisplay.set(compact, -1);
      }
    }

    const movieIdByImdb = new Map<string, number>();
    for (const m of movies) movieIdByImdb.set(m.imdbId, m.id);

    // Fetch picks that could be updated in one query and index them
    const participantIds = [...participantIdBySlug.values()];
    const movieIds = [...movieIdByImdb.values()];

    const picks = await prisma.mamPick.findMany({
      where: {
        participantId: {
          in: participantIds.length > 0 ? participantIds : [-1],
        },
        movieId: { in: movieIds.length > 0 ? movieIds : [-1] },
      },
      select: { id: true, participantId: true, movieId: true, review: true },
    });

    const pickByKey = new Map<string, { id: number; review: string | null }>();
    for (const p of picks) {
      pickByKey.set(`${p.participantId}:${p.movieId}`, {
        id: p.id,
        review: p.review,
      });
    }

    let missingParticipantCount = 0;
    let missingMovieCount = 0;
    let missingPickCount = 0;
    let skippedExistingReviewCount = 0;
    let toUpdateCount = 0;
    let updatedCount = 0;

    const updates: Array<{
      pickId: number;
      review: string;
      meta: { ranking: number; usuario: string; imdbId: string };
    }> = [];

    for (const r of expandedReviews) {
      // Resolve imdbId: first check manual overrides, then use rank mapping
      let mappedImdbId = rankToImdb.get(r.ranking);
      if (!mappedImdbId) continue; // already tracked in missingRankMapping

      // Apply manual override if exists
      let imdbId = getCorrectImdbId(r.ranking, r.usuario, mappedImdbId);

      // If override was applied, use it; otherwise check extractedImdbIds
      if (imdbId === mappedImdbId && r.extractedImdbIds.length > 0) {
        // Check if we have an extractedImdbId that exists in DB and use it instead
        for (const extractedId of r.extractedImdbIds) {
          if (movieIdByImdb.has(extractedId)) {
            imdbId = extractedId;
            break; // Use first valid extracted ID
          }
        }
      }

      const usuarioStripped = stripLeadingAt(r.usuario);
      const slugAlt = generateSlug(usuarioStripped);

      let participantId =
        participantIdBySlug.get(r.slug) ??
        participantIdBySlug.get(slugAlt) ??
        undefined;

      if (!participantId) {
        const compactUsuario = compactAlphaNum(usuarioStripped);
        const compactMatch = participantIdByCompactDisplay.get(compactUsuario);
        if (compactMatch && compactMatch > 0) {
          participantId = compactMatch;
        }
      }

      if (!participantId) {
        missingParticipantCount++;
        report.missingParticipants.push({
          usuario: r.usuario,
          slug: r.slug,
          slugAlt,
          compactUsuario: compactAlphaNum(usuarioStripped),
          ranking: r.ranking,
          imdbId,
        });
        continue;
      }

      const movieId = movieIdByImdb.get(imdbId);
      if (!movieId) {
        missingMovieCount++;
        report.missingMovies.push({
          imdbId,
          ranking: r.ranking,
          usuario: r.usuario,
        });
        continue;
      }

      const pick = pickByKey.get(`${participantId}:${movieId}`);
      if (!pick) {
        missingPickCount++;
        report.missingPicks.push({
          ranking: r.ranking,
          usuario: r.usuario,
          imdbId,
          participantSlug: r.slug,
        });
        continue;
      }

      if (!isEmptyReview(pick.review)) {
        skippedExistingReviewCount++;
        report.skippedExistingReview.push({
          ranking: r.ranking,
          usuario: r.usuario,
          imdbId,
        });
        continue;
      }

      toUpdateCount++;
      report.wouldUpdate.push({
        ranking: r.ranking,
        usuario: r.usuario,
        imdbId,
        pickId: pick.id,
        reviewLength: r.comentario.length,
      });

      updates.push({
        pickId: pick.id,
        review: r.comentario,
        meta: { ranking: r.ranking, usuario: r.usuario, imdbId },
      });
    }

    console.log('📊 Join/Update summary');
    console.log('----------------------');
    console.log(`✅ Participants in DB: ${participants.length}`);
    console.log(`✅ Distinct usuarios (CSV): ${neededUsuariosCount}`);
    console.log(`✅ Movies found: ${movies.length}/${imdbIdList.length}`);
    console.log(`✅ Picks preloaded: ${picks.length}`);
    console.log(`⚠️  Missing participants: ${missingParticipantCount}`);
    console.log(`⚠️  Missing movies: ${missingMovieCount}`);
    console.log(`⚠️  Missing picks: ${missingPickCount}`);
    console.log(`⏭️  Skipped (existing review): ${skippedExistingReviewCount}`);
    console.log(`✍️  To update: ${toUpdateCount}`);
    console.log('');

    if (!args.dryRun && updates.length > 0) {
      const BATCH_SIZE = 50;
      for (let i = 0; i < updates.length; i += BATCH_SIZE) {
        const batch = updates.slice(i, i + BATCH_SIZE);
        await prisma.$transaction(
          batch.map((u) =>
            prisma.mamPick.update({
              where: { id: u.pickId },
              data: { review: u.review },
            })
          )
        );

        for (const u of batch) {
          report.updated.push({
            ranking: u.meta.ranking,
            usuario: u.meta.usuario,
            imdbId: u.meta.imdbId,
            pickId: u.pickId,
            reviewLength: u.review.length,
          });
        }

        updatedCount += batch.length;
        process.stdout.write(
          `\r  Progress: ${Math.min(i + BATCH_SIZE, updates.length)}/${
            updates.length
          }`
        );
      }
      console.log('\n');
    }

    if (!args.dryRun) {
      console.log(`✅ Updated picks: ${updatedCount}`);
    } else {
      console.log(`🔍 Would update picks: ${updates.length}`);
    }

    // Summary of all left-out reviews
    const totalLeftOut =
      skippedRowsWithoutRanking.length +
      skippedRowsWithoutUser.length +
      skippedRowsWithEmptyComment.length +
      missingRankMapping.length +
      report.missingParticipants.length +
      report.missingMovies.length +
      report.missingPicks.length +
      report.skippedExistingReview.length;

    console.log('\n📋 Summary of left-out reviews');
    console.log('==============================');
    console.log(
      `❌ Missing/invalid Ranking: ${skippedRowsWithoutRanking.length}`
    );
    console.log(`❌ Missing Usuario: ${skippedRowsWithoutUser.length}`);
    console.log(`❌ Empty comment: ${skippedRowsWithEmptyComment.length}`);
    console.log(`❌ No rank->imdb mapping: ${missingRankMapping.length}`);
    console.log(`❌ Missing participant: ${report.missingParticipants.length}`);
    console.log(`❌ Missing movie: ${report.missingMovies.length}`);
    console.log(`❌ Missing pick: ${report.missingPicks.length}`);
    console.log(
      `⏭️  Existing review (skipped): ${report.skippedExistingReview.length}`
    );
    console.log(`📊 Total left out: ${totalLeftOut}`);
    console.log(
      `✅ Successfully imported/ready: ${
        args.dryRun ? updates.length : updatedCount
      }`
    );

    // Write full detailed report to ./data
    const reportPath = path.resolve(
      process.cwd(),
      'data/mam-review-import-report.json'
    );
    await writeFileAsync(reportPath, JSON.stringify(report, null, 2), 'utf8');
    console.log(`\n🧾 Wrote detailed report: ${reportPath}`);

    // Write simpler issues-only report
    const issuesReport = {
      summary: {
        totalProcessed: expandedReviews.length,
        successfullyImported: args.dryRun ? updates.length : updatedCount,
        issues: {
          missingParticipants: report.missingParticipants.length,
          missingMovies: report.missingMovies.length,
          missingPicks: report.missingPicks.length,
        },
      },
      issues: {
        missingParticipants: report.missingParticipants,
        missingMovies: report.missingMovies,
        missingPicks: report.missingPicks,
      },
    };

    const issuesPath = path.resolve(
      process.cwd(),
      'data/mam-review-import-issues.json'
    );
    await writeFileAsync(
      issuesPath,
      JSON.stringify(issuesReport, null, 2),
      'utf8'
    );
    console.log(`📋 Wrote issues report: ${issuesPath}`);
    console.log(
      '   (This file only contains actual issues, not skipped empty rows)'
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
