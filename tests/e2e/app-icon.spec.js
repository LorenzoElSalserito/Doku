const { expect, test } = require('@playwright/test');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const {
  cleanupDokuE2EContext,
  closeDokuApp,
  createDokuE2EContext,
  launchDokuApp,
  prepareDokuProfile,
} = require('./helpers/dokuApp.cjs');

const repoRoot = process.cwd();
const sourceIcon = path.join(repoRoot, 'apps/desktop/src/assets/icon-source.png');
const assetsDir = path.join(repoRoot, 'apps/desktop/src/assets');

/**
 * Downscaled RGB fingerprint of an image file, via ImageMagick. Transparency is
 * flattened on white so it matches what a canvas readback produces.
 */
function fingerprintFile(file, size = 8) {
  const raw = execFileSync(
    'magick',
    [`${file}[0]`, '-strip', '-background', 'white', '-alpha', 'remove', '-alpha', 'off',
     '-resize', `${size}x${size}!`, 'RGB:-'],
    { maxBuffer: 1 << 26 },
  );
  return Array.from(raw);
}

function maxChannelDelta(left, right) {
  expect(left.length).toBe(right.length);
  return left.reduce((worst, value, index) => Math.max(worst, Math.abs(value - right[index])), 0);
}

test.describe('application icon', () => {
  const sourcePrint = fingerprintFile(sourceIcon);

  test('every packaged rendition comes from the new source icon', () => {
    const files = [
      path.join(assetsDir, 'icon.png'),
      path.join(assetsDir, 'icon.ico'),
      ...['16x16', '24x24', '32x32', '48x48', '64x64', '128x128', '256x256', '512x512', '1024x1024', '1080x1080'].map(
        (name) => path.join(assetsDir, 'linux-icons', `${name}.png`),
      ),
    ];

    for (const file of files) {
      expect(fs.existsSync(file), `${file} is missing`).toBe(true);
      // Small renditions lose detail, so compare the shared downscale instead
      // of the raw bytes.
      expect(maxChannelDelta(fingerprintFile(file), sourcePrint), `${file} differs`).toBeLessThan(24);
    }
  });

  test('the icns keeps every rendition type and carries the new artwork', () => {
    const icns = fs.readFileSync(path.join(assetsDir, 'icon.icns'));
    expect(icns.toString('ascii', 0, 4)).toBe('icns');
    expect(icns.readUInt32BE(4)).toBe(icns.length);

    const chunks = new Map();
    let offset = 8;
    while (offset < icns.length) {
      const type = icns.toString('ascii', offset, offset + 4);
      const length = icns.readUInt32BE(offset + 4);
      expect(length, `bad chunk length for ${type}`).toBeGreaterThan(8);
      chunks.set(type, icns.subarray(offset + 8, offset + length));
      offset += length;
    }

    // Same rendition set the previous icon shipped with.
    for (const type of ['ic07', 'ic08', 'ic09', 'ic10', 'ic11', 'ic12', 'ic13', 'ic14', 'is32', 's8mk', 'il32', 'l8mk']) {
      expect(chunks.has(type), `missing ${type}`).toBe(true);
    }

    const png = path.join(test.info().outputPath('icns-ic08.png'));
    fs.mkdirSync(path.dirname(png), { recursive: true });
    fs.writeFileSync(png, chunks.get('ic08'));
    expect(maxChannelDelta(fingerprintFile(png), sourcePrint)).toBeLessThan(24);
  });

  test('the About dialog shows the new icon in the running app', async () => {
    const context = createDokuE2EContext();
    await prepareDokuProfile(context);
    const run = await launchDokuApp(context);

    try {
      await run.page.getByRole('button', { name: 'About' }).click();
      const icon = run.page.locator('img.info-dialog__icon');
      await icon.waitFor({ state: 'visible' });

      const rendered = await icon.evaluate((img) =>
        new Promise((resolve) => {
          const read = () => {
            const size = 8;
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, size, size);
            ctx.drawImage(img, 0, 0, size, size);
            const data = ctx.getImageData(0, 0, size, size).data;
            const pixels = [];
            for (let i = 0; i < data.length; i += 4) {
              pixels.push(data[i], data[i + 1], data[i + 2]);
            }
            resolve({
              naturalWidth: img.naturalWidth,
              naturalHeight: img.naturalHeight,
              pixels,
            });
          };
          if (img.complete && img.naturalWidth > 0) read();
          else img.addEventListener('load', read, { once: true });
        }),
      );

      expect(rendered.naturalWidth).toBe(1080);
      expect(rendered.naturalHeight).toBe(1080);
      // Browser and ImageMagick downscale differently, hence the wider band.
      expect(maxChannelDelta(rendered.pixels, sourcePrint)).toBeLessThan(48);
    } finally {
      await closeDokuApp(run.app);
      await cleanupDokuE2EContext(context);
    }
  });
});
