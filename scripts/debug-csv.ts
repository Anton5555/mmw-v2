import { parse } from 'csv-parse/sync';
import * as fs from 'fs';

const content = fs.readFileSync('data/datayear-top-2025.csv', 'utf8');
const records = parse(content, {
  columns: true,
  skip_empty_lines: true,
  relax_quotes: true,
  relax_column_count: true,
  trim: false,
}) as Record<string, string>[];

const anton = records.find((r) => r['¿Quién sos? Tu nombre o @ de Telegram.']?.includes('Anton'));

if (anton) {
  console.log('Found Anton!');
  console.log('\nAll column names:');
  console.log(Object.keys(anton).slice(0, 15));
  
  console.log('\nLooking for #8 (where Frankenstein should be):');
  const keysFor8 = Object.keys(anton).filter((k) => k.includes('#8') || k.includes('8'));
  console.log('Keys containing #8 or 8:', keysFor8);
  
  if (keysFor8.length > 0) {
    keysFor8.forEach((key) => {
      console.log(`  "${key}": "${anton[key]}"`);
    });
  }
  
  console.log('\nAll MEJORES columns:');
  Object.keys(anton)
    .filter((k) => k.includes('MEJORES'))
    .forEach((k) => {
      console.log(`  "${k}": "${anton[k]}"`);
    });
}
