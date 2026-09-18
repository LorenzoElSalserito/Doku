const fs = require('node:fs');
const os = require('node:os');
const { join, resolve } = require('node:path');

const repoRoot = resolve(__dirname, '../..');
// A single Linux artifact stages the whole ~2 GB portable runtime and then
// writes its compressed payload beside it, and AppImage, deb and rpm can be
// in flight together. Distributions that mount /tmp as tmpfs (Fedora, Arch,
// Debian 13, and any systemd default) size it from RAM, so rpmbuild dies with
// "cpio: write failed - No space left on device" long before the disk is full.
const REQUIRED_BYTES = 8 * 1024 ** 3;

function freeBytes(directory) {
  try {
    const stats = fs.statfsSync(directory);
    return stats.bavail * stats.bsize;
  } catch {
    return null;
  }
}

const gigabytes = (bytes) => `${(bytes / 1024 ** 3).toFixed(1)} GB`;

/**
 * Points the temporary directory at the build tree when the system one is too
 * small for packaging. Child processes (electron-builder's fpm, rpmbuild) and
 * later `os.tmpdir()` calls both read these variables, so setting them here
 * covers the whole run. Returns the directory in use.
 */
function ensureBuildTmpdir(required = REQUIRED_BYTES) {
  const current = os.tmpdir();
  const available = freeBytes(current);
  if (available === null || available >= required) return current;

  const fallback = join(repoRoot, 'build/tmp');
  fs.mkdirSync(fallback, { recursive: true });
  const fallbackAvailable = freeBytes(fallback);
  if (fallbackAvailable !== null && fallbackAvailable <= available) {
    console.warn(`[build-tmpdir] ${current} has only ${gigabytes(available)} free and ${fallback} has no more; packaging may fail`);
    return current;
  }

  process.env.TMPDIR = fallback;
  process.env.TMP = fallback;
  process.env.TEMP = fallback;
  console.log(`[build-tmpdir] ${current} has ${gigabytes(available)} free, below the ${gigabytes(required)} packaging needs: using ${fallback}`);
  return fallback;
}

module.exports = { ensureBuildTmpdir, REQUIRED_BYTES };
