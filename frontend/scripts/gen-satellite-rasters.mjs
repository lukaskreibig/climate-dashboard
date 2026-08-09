#!/usr/bin/env node
/**
 * Writes public/images/satellite.webp and overlay.webp from the JPEG masters.
 *
 * These two are the one pair of pictures next/image cannot help with. Mapbox
 * takes them as an `image` source, which accepts a URL and nothing else, while
 * the pixel inspector renders them again on top and the loading gate warms them
 * a third time. The optimiser answers with `Vary: Accept`, and those three
 * consumers send three different Accept headers, so each of them got its own
 * cache entry and the reader downloaded the same picture up to four times.
 *
 * A plain static file has no Vary, so all three share one entry. WebP rather
 * than AVIF because this has to work everywhere without negotiation, and at
 * quality 80 it turns 2.4 MB of JPEG into 537 KB at the same 1251 by 1500.
 *
 * Run after replacing either master:
 *   yarn node scripts/gen-satellite-rasters.mjs
 */
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const QUALITY = 80;
const root = join(dirname(fileURLToPath(import.meta.url)), '..');

for (const name of ['satellite', 'overlay']) {
  const from = join(root, 'public', 'images', `${name}.jpg`);
  const to = join(root, 'public', 'images', `${name}.webp`);
  const info = await sharp(from).webp({ quality: QUALITY }).toFile(to);
  console.log(`${name}.webp  ${info.width}x${info.height}  ${(info.size / 1024).toFixed(0)} KB`);
}
