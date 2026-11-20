/**
 * Generates the PWA / TWA / Apple touch icons from a "MM" monogram.
 *
 * The letters are drawn as plain polygons (no font), so the output is the
 * same on every machine. Run with `pnpm icons:generate` and commit the PNGs.
 */
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const INK = '#0a181b'; // app background (teal ink)
const BOX = '#f2b632'; // box yellow accent

const root = path.resolve(import.meta.dirname, '..');

/** One condensed "M" as a polygon inside a w × h box at (x, y). */
function letterM(x: number, y: number, w: number, h: number): string {
  const s = w * 0.24; // stem thickness
  const valley = h * 0.62; // where the inner V bottoms out
  const pts: Array<[number, number]> = [
    [0, h],
    [0, 0],
    [s, 0],
    [w / 2, valley - s * 0.9],
    [w - s, 0],
    [w, 0],
    [w, h],
    [w - s, h],
    [w - s, h * 0.36],
    [w / 2 + s * 0.42, valley + s * 0.15],
    [w / 2 - s * 0.42, valley + s * 0.15],
    [s, h * 0.36],
    [s, h],
  ];
  return pts.map(([px, py]) => `${(x + px).toFixed(2)},${(y + py).toFixed(2)}`).join(' ');
}

/**
 * The monogram SVG at `size` px. `scale` is how much of the canvas the mark
 * may use (maskable icons must keep it inside the central 80% circle).
 */
function monogramSvg(size: number, scale: number): string {
  const markW = size * scale;
  const gap = markW * 0.07;
  const letterW = (markW - gap) / 2;
  const letterH = letterW * 1.45;
  const barH = letterH * 0.09;
  const barGap = letterH * 0.12;
  const totalH = letterH + barGap + barH;
  const x0 = (size - markW) / 2;
  const y0 = (size - totalH) / 2;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${INK}"/>
  <polygon points="${letterM(x0, y0, letterW, letterH)}" fill="${BOX}"/>
  <polygon points="${letterM(x0 + letterW + gap, y0, letterW, letterH)}" fill="${BOX}"/>
  <rect x="${x0}" y="${y0 + letterH + barGap}" width="${markW}" height="${barH}" fill="${BOX}"/>
</svg>`;
}

const outputs = [
  // purpose "any": the mark can be larger, the launcher won't crop it
  { file: 'public/icons/icon-192.png', size: 192, scale: 0.62 },
  { file: 'public/icons/icon-512.png', size: 512, scale: 0.62 },
  // purpose "maskable": keep everything inside the 80% safe zone
  { file: 'public/icons/maskable-512.png', size: 512, scale: 0.5 },
  // iOS rounds the corners itself and wants no transparency
  { file: 'src/app/apple-icon.png', size: 180, scale: 0.62 },
];

for (const { file, size, scale } of outputs) {
  const target = path.join(root, file);
  await mkdir(path.dirname(target), { recursive: true });
  await sharp(Buffer.from(monogramSvg(size, scale)))
    .flatten({ background: INK })
    .png()
    .toFile(target);
  console.log(`wrote ${file}`);
}
