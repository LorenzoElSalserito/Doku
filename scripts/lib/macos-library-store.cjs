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

// WeasyPrint's CFFI opens these by name, and ctypes.util.find_library turns
// "gobject-2.0" into the unversioned alias (libgobject-2.0.dylib).
const CFFI_LIBRARY = /^(libgobject-|libpango|libharfbuzz|libfontconfig)/;

/**
 * Name under which a library WeasyPrint opens by name must be staged: its
 * shortest alias (libgobject-2.0.dylib, libharfbuzz.dylib). Staging it once,
 * under that name, makes CFFI and every Mach-O consumer load the same file.
 * Two copies of GObject are two type systems, and Pango then rejects its own
 * font map ("PANGO_IS_FONT_MAP (font_map)' failed"). Wheel-vendored copies
 * (Pillow's libharfbuzz) are reached through @loader_path and keep a hash.
 */
function cffiLibraryName(canonical) {
  if (canonical.includes('/site-packages/') || !CFFI_LIBRARY.test(basename(canonical))) return null;
  const directory = dirname(canonical);
  const aliases = fs.readdirSync(directory).filter((name) => {
    const entry = join(directory, name);
    return fs.lstatSync(entry).isSymbolicLink() && fs.existsSync(entry) && fs.realpathSync(entry) === canonical;
  });
  return [basename(canonical), ...aliases].sort((a, b) => a.length - b.length || a.localeCompare(b))[0];
}

function createLibraryStore(directory, nameFor = () => null) {
  const origins = new Map();
  const sources = new Map();
  const owners = new Map();
  fs.mkdirSync(directory, { recursive: true });
  function stage(source) {
    const canonical = fs.realpathSync(source);
    if (sources.has(canonical)) return sources.get(canonical);
    // Homebrew and Python wheels can ship incompatible libraries with the
    // same basename. Preserve both and rewrite each consumer to its own copy.
    const hash = createHash('sha256').update(canonical).digest('hex').slice(0, 16);
    const target = dirname(canonical) === resolve(directory)
      ? canonical : join(directory, nameFor(canonical) ?? `${hash}-${basename(canonical)}`);
    if (owners.has(target) && owners.get(target) !== canonical) {
      throw new Error(`Two libraries staged as ${target}: ${owners.get(target)} and ${canonical}`);
    }
    owners.set(target, canonical);
    copyWritable(canonical, target);
    sources.set(canonical, target);
    origins.set(target, canonical);
    return target;
  }
  return { stage, origins };
}
module.exports = { cffiLibraryName, copyWritable, createLibraryStore };
