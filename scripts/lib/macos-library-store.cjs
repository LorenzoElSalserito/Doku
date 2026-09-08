const fs = require('node:fs');
const { createHash } = require('node:crypto');
const { basename, dirname, join, resolve } = require('node:path');

function copyWritable(source, target) {
  if (resolve(source) === resolve(target)) {
    fs.chmodSync(target, 0o755);
    return;
  }
  if (fs.existsSync(target)) fs.chmodSync(target, 0o755);
  fs.copyFileSync(source, target);
  fs.chmodSync(target, 0o755);
}

function createLibraryStore(directory) {
  const origins = new Map();
  const sources = new Map();
  fs.mkdirSync(directory, { recursive: true });
  function stage(source) {
    const canonical = fs.realpathSync(source);
    if (sources.has(canonical)) return sources.get(canonical);
    // Homebrew and Python wheels can ship incompatible libraries with the
    // same basename. Preserve both and rewrite each consumer to its own copy.
    const hash = createHash('sha256').update(canonical).digest('hex').slice(0, 16);
    const target = dirname(canonical) === resolve(directory)
      ? canonical : join(directory, `${hash}-${basename(canonical)}`);
    copyWritable(canonical, target);
    sources.set(canonical, target);
    origins.set(target, canonical);
    return target;
  }
  return { stage, origins };
}
module.exports = { copyWritable, createLibraryStore };
