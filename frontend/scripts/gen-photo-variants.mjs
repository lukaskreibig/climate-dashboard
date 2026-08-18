#!/usr/bin/env node
/**
 * Encodes every photograph the story shows into AVIF and WebP, once, here,
 * and writes lib/photoVariants.ts describing what it made.
 *
 * WHY THIS EXISTS. These photos used to go through next/image, which resizes
 * and encodes on demand inside the running server. Measured against
 * `next start`: a single 2800 px AVIF encode takes the process from 55 MB to
 * 312 MB, and four photos warmed two at a time push the tree 442 MB above idle.
 * The container has 512 MB and was killed for it. Spending 400 MB and three
 * seconds of a web server's life on a photograph that has not changed since
 * October 2025 is the wrong place to do the work.
 *
 * So the work moves here. The encode happens once, the output is committed, and
 * the server does nothing at request time but hand over a file.
 *
 * WHY AVIF STAYS. It earns its keep on quality per byte: at 1920 px this photo
 * set lands at 41.3 dB for 374 KB, where WebP needs 415 KB to reach 39.9 dB.
 * The quality is deliberately identical to what next/image was serving, so
 * moving the encode changes the bytes on the wire and nothing the reader sees.
 *
 * WHY THE OUTPUT IS NOT COMMITTED. It is 12 MB of files derived from other
 * files already in the repository, which is the definition of something that
 * should be built rather than stored. The full run is 24 seconds and it is
 * incremental, so a build whose photographs have not changed pays nothing. The
 * manifest IS committed, because typechecking has to see it without running a
 * build first, and lib/__tests__/photoVariants.test.ts holds the two together.
 *
 * Chained into `build` and `dev` explicitly rather than through a prebuild
 * hook: this package is on Yarn 3, which unlike npm does not run pre and post
 * scripts by itself, and a photo pipeline that silently does not run is worse
 * than one that is spelled out.
 *
 * Run by hand after adding or replacing a photograph:
 *   yarn node scripts/gen-photo-variants.mjs
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { basename, extname, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const sourceDir = join(root, 'public', 'images');
const outDir = join(root, 'public', 'photos');

/**
 * Not everything in public/images is a photograph.
 *
 * The rasters below are read as DATA, not shown as pictures: three of them are
 * fed to Mapbox or to a canvas that samples their pixels, and og-cover.jpg is
 * fetched by social platforms that will not negotiate a format. Re-encoding any
 * of them would range from pointless to actively wrong, so they keep their
 * original bytes and never appear in the manifest.
 */
const NOT_PHOTOGRAPHS = new Set([
  'basemap-summer.jpg', // Mapbox raster source, see lib/basemapLayers.ts
  'overlay.jpg',
  'overlay.webp',
  'satellite.jpg', // sampled pixel by pixel by SatellitePixelInspector
  'satellite.webp',
  'og-cover.jpg', // link previews; the crawlers want a plain JPEG
]);

/**
 * The rungs, before the photo's own width is added on top.
 *
 * 640 and 828 are the phone sizes, 1200 covers a tablet and a phone at high
 * pixel ratio, 1920 a desktop. Anything above that is the photo's native
 * resolution, added per file below, because upscaling to a round number would
 * ship bytes that carry no detail.
 */
const LADDER = [640, 828, 1200, 1920, 2560];

/**
 * Two rungs closer together than this are not worth two files: the browser
 * picks one of them and the other is dead weight in the repository.
 */
const MIN_RATIO = 1.15;

/**
 * AVIF quality 75 is what next/image was serving, kept so this migration is not
 * also a silent quality change. The diagram is the exception: it carries small
 * type, where the ringing a photographic quality setting allows is legible as
 * a defect rather than invisible as noise.
 */
const QUALITY = { avif: 75, webp: 85 };
const QUALITY_OVERRIDE = { 'pipeline.png': { avif: 88, webp: 92 } };

/**
 * The one failure a <picture> cannot rescue.
 *
 * Safari 16.1 through 16.3 advertises AVIF and then cannot decode the tiled
 * (grid) form that encoders reach for on large images. Because the browser
 * claims support, the <source type="image/avif"> matches, the decode fails, and
 * nothing falls through to WebP: the reader gets an empty frame with a pull
 * quote over it. libheif does not tile at these sizes today, which is why this
 * has never bitten, and that is exactly the kind of thing that changes quietly
 * in a dependency update. So it is checked rather than assumed.
 */
const assertNotTiled = (buf, format, label) => {
  if (format !== 'avif') return;
  // A grid image declares a 'grid' item type in iinf, near the front of the file.
  if (buf.subarray(0, 8192).includes(Buffer.from('grid'))) {
    throw new Error(
      `${label}.avif came out tiled. Safari 16.1 to 16.3 cannot decode that and ` +
        `<picture> will not fall back, so those readers would see an empty frame. ` +
        `Cap the largest AVIF rung or turn tiling off in the encoder.`,
    );
  }
};

const widthsFor = (intrinsic) => {
  const rungs = [...LADDER.filter((w) => w < intrinsic), intrinsic];
  return rungs.filter((w, i) => i === rungs.length - 1 || rungs[i + 1] / w >= MIN_RATIO);
};

const sources = readdirSync(sourceDir)
  .filter((name) => /\.(jpe?g|png)$/i.test(name) && !NOT_PHOTOGRAPHS.has(name))
  .sort();

mkdirSync(outDir, { recursive: true });

const started = Date.now();
const manifest = [];
const expected = new Set();
let encoded = 0;
let reused = 0;

for (const name of sources) {
  const source = join(sourceDir, name);
  const sourceTime = statSync(source).mtimeMs;
  const buf = readFileSync(source);
  const { width, height } = await sharp(buf).metadata();
  if (!width || !height) throw new Error(`could not read the dimensions of ${name}`);

  const stem = basename(name, extname(name));
  const quality = QUALITY_OVERRIDE[name] ?? QUALITY;
  const widths = widthsFor(width);
  let made = 0;

  for (const w of widths) {
    // Serially, and one photo at a time. libaom is expensive enough that
    // encoding the set in parallel is how a laptop starts swapping.
    for (const format of ['avif', 'webp']) {
      const file = join(outDir, `${stem}-${w}.${format}`);
      expected.add(`${stem}-${w}.${format}`);
      if (existsSync(file) && statSync(file).mtimeMs > sourceTime) {
        reused += 1;
        continue;
      }
      const out = await sharp(buf)
        .resize(w, undefined, { withoutEnlargement: true })
        [format]({ quality: quality[format] })
        .toBuffer();
      assertNotTiled(out, format, `${stem}-${w}`);
      writeFileSync(file, out);
      encoded += 1;
      made += 1;
    }
  }

  manifest.push({ src: `/images/${name}`, stem, width, height, widths });
  if (made) {
    process.stdout.write(`  ${name.padEnd(30)} ${String(width).padStart(4)} px  ${widths.join(', ')}\n`);
  }
}

/* A renamed or deleted photograph would otherwise leave its variants behind,
   and a stale file that nothing references is a file nobody notices is wrong. */
let removed = 0;
for (const file of readdirSync(outDir)) {
  if (!expected.has(file)) {
    unlinkSync(join(outDir, file));
    removed += 1;
  }
}

const entries = manifest
  .map(
    ({ src, stem, width, height, widths }) =>
      `  "${src}": { stem: "${stem}", width: ${width}, height: ${height}, widths: [${widths.join(', ')}] },`,
  )
  .join('\n');

writeFileSync(
  join(root, 'lib', 'photoVariants.ts'),
  `/**
 * Generated by scripts/gen-photo-variants.mjs. Do not edit by hand.
 *
 * Which pre-encoded widths exist for each photograph, and its intrinsic size.
 * The files themselves are in public/photos, named <stem>-<width>.<format>.
 *
 * lib/__tests__/photoVariants.test.ts checks that this file, the files on disk
 * and the photographs the story actually references still agree.
 */
export interface PhotoVariant {
  /** File name without extension, which is also the variant file name stem. */
  stem: string;
  width: number;
  height: number;
  /** Ascending. The last one is the photograph's own resolution. */
  widths: number[];
}

export const PHOTO_VARIANTS: Record<string, PhotoVariant> = {
${entries}
};
`,
);

const seconds = ((Date.now() - started) / 1000).toFixed(1);
console.log(
  `photo variants: ${manifest.length} photographs, ${encoded} encoded, ${reused} reused` +
    `${removed ? `, ${removed} stale removed` : ''} (${seconds} s)`,
);
