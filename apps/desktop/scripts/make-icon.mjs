// Builds build/icon.png (1024x1024) from the web favicon SVG, following the macOS
// icon grid: the rounded square fills 824px of the canvas, the rest is transparent.
// Run by the desktop release workflow before electron-builder. sharp comes along with
// Next.js (a dependency of apps/web), so it is resolved from there.
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const web = path.join(here, '..', '..', 'web');
const nextRequire = createRequire(createRequire(path.join(web, 'package.json')).resolve('next/package.json'));
const sharp = nextRequire('sharp');

const BODY = 824;
const OFFSET = (1024 - BODY) / 2;
const out = path.join(here, '..', 'build', 'icon.png');
mkdirSync(path.dirname(out), { recursive: true });

const body = await sharp(path.join(web, 'src', 'app', 'icon.svg'), { density: (72 * BODY) / 512 })
  .resize(BODY, BODY)
  .png()
  .toBuffer();
await sharp({ create: { width: 1024, height: 1024, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite([{ input: body, left: OFFSET, top: OFFSET }])
  .png()
  .toFile(out);
console.log(`icon written to ${out}`);
