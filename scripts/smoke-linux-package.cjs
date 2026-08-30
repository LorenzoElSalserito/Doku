#!/usr/bin/env node

const { existsSync, readdirSync, readFileSync, statSync } = require('node:fs');
const { join } = require('node:path');
const { listPackage } = require('@electron/asar');
const { execFileSync, spawnSync } = require('node:child_process');

const rootDir = process.cwd();
const outputDir = join(rootDir, 'build/desktop');
const unpackedDir = join(outputDir, 'linux-unpacked');
const packageJson = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf8'));
const appImage = readdirSync(outputDir)
  .filter((name) => name.endsWith('.AppImage') && name.includes(packageJson.version))
  .map((name) => join(outputDir, name))
  .sort((left, right) => statSync(right).mtimeMs - statSync(left).mtimeMs)[0];

const requiredFiles = [
  'doku',
  'resources/app.asar',
  'resources/export-runtime/printStylesheet.css',
  'resources/export-runtime/scripts/render_weasy_pdf.py',
  'resources/export-runtime/weasy-python/bin/python',
  'resources/export-runtime/latex/bin/pandoc',
  'resources/export-runtime/latex/bin/lualatex',
  'resources/export-runtime/latex/share/texlive/texmf-dist/web2c/texmf.cnf',
  'resources/export-runtime/lib/libc.so.6',
];

if (!appImage) fail(`AppImage ${packageJson.version} mancante in ${outputDir}`);
assertExists(appImage, 'AppImage portabile');
assertExists(unpackedDir, 'directory linux-unpacked');

for (const relativePath of requiredFiles) {
  assertExists(join(unpackedDir, relativePath), `runtime bundle: ${relativePath}`);
}

const asarEntries = listPackage(join(unpackedDir, 'resources/app.asar'));
if (asarEntries.some((entry) => entry === '/node_modules' || entry.startsWith('/node_modules/'))) {
  fail('app.asar contiene node_modules: dipendenze non pre-bundled');
}
console.log('- app.asar senza node_modules runtime');
certifyOfflineExportRuntime();

console.log(`Certificazione bundle Linux superata: ${appImage}`);
console.log(`Dimensione: ${formatBytes(statSync(appImage).size)}`);
console.log('Runtime applicativi richiesti inclusi: Electron, Pandoc, LuaLaTeX, Python, WeasyPrint.');

function certifyOfflineExportRuntime() {
  const runtime = join(unpackedDir, 'resources/export-runtime');
  const libraryDir = join(runtime, 'lib');
  const pythonHome = join(runtime, 'weasy-python');
  const env = {
    PATH: '/nonexistent',
    XDG_CACHE_HOME: '/tmp/doku-zero-dependency-cache',
    LD_LIBRARY_PATH: libraryDir,
    PYTHONHOME: pythonHome,
    PYTHONPATH: join(pythonHome, 'lib/python3.13/site-packages'),
    TEXMFROOT: join(runtime, 'latex/share/texlive'),
    TEXMFDIST: join(runtime, 'latex/share/texlive/texmf-dist'),
    TEXMFLOCAL: join(runtime, 'latex/share/texmf'),
    TEXMFSYSVAR: join(runtime, 'latex/var/lib/texmf'),
    TEXMFSYSCONFIG: join(runtime, 'latex/etc/texmf'),
    TEXMFCNF: [
      join(runtime, 'latex/etc/texmf/web2c'),
      join(runtime, 'latex/share/texlive/texmf-dist/web2c'),
    ].join(':'),
  };

  execFileSync(join(runtime, 'latex/bin/pandoc'), ['--version'], { env, stdio: 'ignore' });
  execFileSync(join(runtime, 'latex/bin/lualatex'), ['--version'], { env, stdio: 'ignore' });
  execFileSync(
    join(pythonHome, 'bin/python'),
    ['-c', 'from weasyprint import HTML; HTML(string="<p>Doku</p>").write_pdf("/tmp/doku-zero-dependency.pdf")'],
    { env, stdio: 'ignore' },
  );

  for (const executable of [
    join(runtime, 'latex/bin/pandoc'),
    join(runtime, 'latex/bin/lualatex'),
    join(pythonHome, 'bin/python'),
  ]) {
    const result = spawnSync('/usr/bin/ldd', [executable], { env, encoding: 'utf8' });
    const output = result.stdout ?? '';
    if (result.status !== 0 && !output) fail(`ldd non eseguibile per ${executable}`);
    if (output.includes('not found')) fail(`dipendenza ELF irrisolta: ${output}`);
  }
  console.log('- export runtime funziona con PATH host disabilitato');
  console.log('- dipendenze ELF risolte dal bundle');
}

function assertExists(path, label) {
  if (!existsSync(path)) fail(`${label}: mancante in ${path}`);
  console.log(`- ${label}`);
}

function formatBytes(bytes) {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fail(message) {
  console.error(`Certificazione bundle Linux fallita: ${message}`);
  process.exit(1);
}
