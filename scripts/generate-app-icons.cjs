#!/usr/bin/env node
/**
 * Regenerates every Doku app icon from a single square source PNG.
 *
 *   node scripts/generate-app-icons.cjs                 # apps/desktop/src/assets/icon-source.png
 *   node scripts/generate-app-icons.cjs other-icon.png
 *
 * Requires ImageMagick 7 (`magick`). Writes apps/desktop/src/assets/icon.png,
 * icon.ico, icon.icns and the Linux rendition set. ImageMagick cannot encode
 * ICNS, so that container is assembled here: PNG-backed types plus the legacy
 * RLE24 + 8-bit-mask pairs the icon has always shipped.
 */
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const assetsDir = path.join(repoRoot, 'apps/desktop/src/assets');
const linuxIconsDir = path.join(assetsDir, 'linux-icons');
const LINUX_SIZES = [16, 24, 32, 48, 64, 128, 256, 512, 1024, 1080];
const ICO_SIZES = [256, 128, 64, 48, 32, 24, 16];
const ICNS_PNG_TYPES = [
  ['ic07', 128], ['ic08', 256], ['ic09', 512], ['ic10', 1024],
  ['ic11', 32], ['ic12', 64], ['ic13', 256], ['ic14', 512],
];

const source = process.argv[2] ?? path.join(assetsDir, 'icon-source.png');
if (!fs.existsSync(source)) {
  console.error(`Usage: node scripts/generate-app-icons.cjs [source.png] (not found: ${source})`);
  process.exit(1);
}

function magick(args, options = {}) {
  return execFileSync('magick', args, { maxBuffer: 1 << 28, ...options });
}

function resizeArgs(size) {
  return ['-strip', '-resize', `${size}x${size}`, '-background', 'none',
          '-gravity', 'center', '-extent', `${size}x${size}`];
}

function render(size, format) {
  return magick([source, ...resizeArgs(size), `${format}:-`]);
}

/** icns RLE24: the three colour channels in sequence, each run-length encoded. */
function rle24(rgba, size) {
  const out = [];
  for (let channel = 0; channel < 3; channel += 1) {
    const plane = Buffer.alloc(size * size);
    for (let i = 0; i < plane.length; i += 1) plane[i] = rgba[i * 4 + channel];
    let i = 0;
    while (i < plane.length) {
      let run = 1;
      while (run < 130 && i + run < plane.length && plane[i + run] === plane[i]) run += 1;
      if (run >= 3) {
        out.push(0x80 | (run - 3), plane[i]);
        i += run;
        continue;
      }
      const start = i;
      while (
        i < plane.length &&
        i - start < 128 &&
        !(i + 2 < plane.length && plane[i] === plane[i + 1] && plane[i] === plane[i + 2])
      ) i += 1;
      out.push(i - start - 1, ...plane.subarray(start, i));
    }
  }
  return Buffer.from(out);
}

function icnsChunk(type, data) {
  const header = Buffer.alloc(8);
  header.write(type, 0, 'ascii');
  header.writeUInt32BE(data.length + 8, 4);
  return Buffer.concat([header, data]);
}

function buildIcns() {
  const chunks = ICNS_PNG_TYPES.map(([type, size]) => icnsChunk(type, render(size, 'PNG32')));
  for (const [rleType, maskType, size] of [['is32', 's8mk', 16], ['il32', 'l8mk', 32]]) {
    const rgba = render(size, 'RGBA');
    if (rgba.length !== size * size * 4) throw new Error(`unexpected RGBA size for ${size}`);
    const alpha = Buffer.alloc(size * size);
    for (let i = 0; i < alpha.length; i += 1) alpha[i] = rgba[i * 4 + 3];
    chunks.push(icnsChunk(rleType, rle24(rgba, size)), icnsChunk(maskType, alpha));
  }
  const body = Buffer.concat(chunks);
  const head = Buffer.alloc(8);
  head.write('icns', 0, 'ascii');
  head.writeUInt32BE(body.length + 8, 4);
  return Buffer.concat([head, body]);
}

fs.mkdirSync(linuxIconsDir, { recursive: true });
magick([source, ...resizeArgs(1080), `PNG32:${path.join(assetsDir, 'icon.png')}`]);
for (const size of LINUX_SIZES) {
  magick([source, ...resizeArgs(size), `PNG32:${path.join(linuxIconsDir, `${size}x${size}.png`)}`]);
}
magick([source, '-strip', '-define', `icon:auto-resize=${ICO_SIZES.join(',')}`,
        path.join(assetsDir, 'icon.ico')]);
fs.writeFileSync(path.join(assetsDir, 'icon.icns'), buildIcns());

console.log(`[generate-app-icons] Icons regenerated from ${source}`);
