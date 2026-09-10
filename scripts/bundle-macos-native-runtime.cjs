#!/usr/bin/env node
const fs = require('node:fs');
const { basename, dirname, join, relative, resolve } = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');
const { copyWritable, createLibraryStore } = require('./lib/macos-library-store.cjs');
const { parseDependencies } = require('./lib/macho-dependencies.cjs');

if (process.platform !== 'darwin') process.exit(0);
const runtime = resolve(__dirname, '../build/export-runtime');
const pythonHome = join(runtime, 'weasy-python');
const python = join(pythonHome, 'bin/python');
const libraryDir = join(runtime, 'lib');
const run = (command, args) => execFileSync(command, args, { encoding: 'utf8' }).trim();
const version = run(python, ['-c', 'import sys; print(f"python{sys.version_info.major}.{sys.version_info.minor}")']);
const stdlib = run(python, ['-c', 'import sysconfig; print(sysconfig.get_path("stdlib"))']);
fs.cpSync(stdlib, join(pythonHome, 'lib', version), {
  recursive: true, dereference: true,
  filter: (source) => !source.includes('site-packages') && !source.includes('__pycache__'),
});
fs.mkdirSync(libraryDir, { recursive: true });

function files(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = join(directory, entry.name);
    return entry.isDirectory() ? files(file) : entry.isFile() ? [file] : [];
  });
}
// Pango/GObject are opened by CFFI and do not appear in otool -L for Python.
const loaded = run(python, ['-c', [
  'from weasyprint import HTML',
  'HTML(string="<p>Doku</p>").write_pdf()',
  'import ctypes',
  'dyld = ctypes.CDLL(None)',
  'dyld._dyld_get_image_name.restype = ctypes.c_char_p',
  'print("\\n".join(dyld._dyld_get_image_name(i).decode() for i in range(1, dyld._dyld_image_count())))',
].join('; ')]).split('\n').filter((file) => file.startsWith('/') && !file.startsWith('/usr/lib/') && !file.startsWith('/System/Library/'));
const queue = files(runtime);
const visited = new Set();
const { stage, origins } = createLibraryStore(libraryDir);
const modified = [];
for (const source of loaded) {
  queue.push(stage(source));
}

while (queue.length) {
  const binary = queue.shift();
  if (visited.has(binary)) continue;
  visited.add(binary);
  const fd = fs.openSync(binary, 'r');
  const magic = Buffer.alloc(4);
  try { fs.readSync(fd, magic, 0, 4, 0); } finally { fs.closeSync(fd); }
  if (!['feedface', 'feedfacf', 'cefaedfe', 'cffaedfe', 'cafebabe', 'bebafeca'].includes(magic.toString('hex'))) continue;
  const inspect = spawnSync('otool', ['-L', binary], { encoding: 'utf8' });
  if (inspect.status !== 0) continue;
  const original = origins.get(binary) || binary;
  const dependencies = parseDependencies(inspect.stdout);
  for (const dependency of dependencies) {
    if (dependency.startsWith('/usr/lib/') || dependency.startsWith('/System/Library/')) continue;
    let source = dependency.replace('@loader_path', dirname(original)).replace('@executable_path', dirname(python));
    if (source.startsWith('@rpath/')) {
      const loadCommands = run('otool', ['-l', original]);
      const rpaths = [...loadCommands.matchAll(/cmd LC_RPATH\s+cmdsize \d+\s+path (.+?) \(offset/g)]
        .map((match) => match[1].replace('@loader_path', dirname(original)).replace('@executable_path', dirname(python)));
      source = rpaths.map((rpath) => join(rpath, dependency.slice(7))).find((candidate) => fs.existsSync(candidate));
    }
    if (!source || !fs.existsSync(source)) throw new Error(`Unresolved Mach-O dependency: ${dependency} in ${original}`);
    // A dylib lists its own install name first.
    if (fs.realpathSync(source) === fs.realpathSync(original)) continue;
    const target = stage(source);
    if (!visited.has(target)) queue.push(target);
    fs.chmodSync(binary, 0o755);
    run('install_name_tool', ['-change', dependency, `@loader_path/${relative(dirname(binary), target)}`, binary]);
  }
  fs.chmodSync(binary, 0o755);
  modified.push(binary);
}
// CFFI requests unversioned dylib names; preserve those entry points.
for (const binary of [...modified]) {
  if (dirname(binary) !== libraryDir) continue;
  const source = origins.get(binary);
  if (!source || !/^(libgobject-|libpango|libharfbuzz|libfontconfig)/.test(basename(source))) continue;
  const aliases = new Set([basename(source)]);
  for (const alias of fs.readdirSync(dirname(source))) {
    const entry = join(dirname(source), alias);
    if (!fs.lstatSync(entry).isSymbolicLink() || !fs.existsSync(entry)) continue;
    if (fs.realpathSync(entry) !== fs.realpathSync(source)) continue;
    aliases.add(alias);
  }
  for (const alias of aliases) {
    const target = join(libraryDir, alias);
    if (target === binary) continue;
    copyWritable(binary, target);
    modified.push(target);
  }
}
for (const binary of modified) run('codesign', ['--force', '--sign', '-', binary]);
console.log(`macOS native runtime bundled: ${modified.length} Mach-O objects`);
