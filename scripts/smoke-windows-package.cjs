#!/usr/bin/env node
const { existsSync, readFileSync } = require('node:fs');
const { execFileSync } = require('node:child_process');
const { join } = require('node:path');
const { listPackage } = require('@electron/asar');
const { certifyExportRuntime } = require('./lib/smoke-export-runtime.cjs');

if (process.platform !== 'win32') throw new Error('Windows runner required');
const output = join(__dirname, '../build/desktop');
const { version } = require('../package.json');
const installer = join(output, `doku_v${version}-setup.exe`);
const portable = join(output, `doku_v${version}-portable.zip`);

for (const file of [installer, portable, join(output, 'win-unpacked/Doku.exe'), join(output, 'win-unpacked/resources/app.asar')]) {
  if (!existsSync(file)) throw new Error(`Missing Windows artifact: ${file}`);
}
for (const exe of [installer, join(output, 'win-unpacked/Doku.exe')]) {
  if (readFileSync(exe).subarray(0, 2).toString() !== 'MZ') throw new Error(`Invalid PE executable: ${exe}`);
}
if (readFileSync(portable).subarray(0, 2).toString() !== 'PK') throw new Error(`Invalid ZIP archive: ${portable}`);
// The portable archive must be extract-and-run: Doku.exe and its resources at the root, no installer.
const listing = execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
  `Add-Type -AssemblyName System.IO.Compression.FileSystem; $zip = [System.IO.Compression.ZipFile]::OpenRead('${portable.replace(/'/g, "''")}'); try { $zip.Entries | ForEach-Object { $_.FullName } } finally { $zip.Dispose() }`],
  { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const entries = listing.split(/\r?\n/).map((line) => line.trim().replace(/\\/g, '/')).filter(Boolean);
for (const required of ['Doku.exe', 'resources/app.asar', 'resources/export-runtime/scripts/render_weasy_pdf.py', 'resources/export-runtime/weasy-python/python.exe', 'resources/export-runtime/latex/bin/pandoc.exe', 'resources/export-runtime/latex/bin/lualatex.exe']) {
  if (!entries.includes(required)) throw new Error(`Portable archive is missing ${required}`);
}
if (entries.some((entry) => /^Uninstall .*\.exe$/i.test(entry))) throw new Error('Portable archive must not contain the NSIS uninstaller');
if (listPackage(join(output, 'win-unpacked/resources/app.asar')).some((entry) => entry.startsWith('/node_modules/'))) {
  throw new Error('Runtime dependencies must be pre-bundled');
}
certifyExportRuntime(join(output, 'win-unpacked/resources/export-runtime'));
console.log('Windows installer, portable archive and relocated PDF runtime verified');
