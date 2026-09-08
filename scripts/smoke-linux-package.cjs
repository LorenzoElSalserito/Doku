#!/usr/bin/env node

const { existsSync, readdirSync, readFileSync, statSync } = require('node:fs');
const { join } = require('node:path');
const { listPackage } = require('@electron/asar');
const { certifyExportRuntime } = require('./lib/smoke-export-runtime.cjs');

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
certifyExportRuntime(join(unpackedDir, 'resources/export-runtime'));

console.log(`Certificazione bundle Linux superata: ${appImage}`);
console.log(`Dimensione: ${formatBytes(statSync(appImage).size)}`);
console.log('Runtime applicativi richiesti inclusi: Electron, Pandoc, LuaLaTeX, Python, WeasyPrint.');

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
