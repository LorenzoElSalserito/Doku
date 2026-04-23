#!/usr/bin/env node

const { existsSync, statSync } = require('node:fs');
const { execFileSync } = require('node:child_process');
const { join } = require('node:path');

const rootDir = process.cwd();
const debPath = join(rootDir, 'build/desktop/Doku-0.1.0-linux-amd64.deb');
const unpackedDir = join(rootDir, 'build/desktop/linux-unpacked');

const requiredUnpackedFiles = [
  '@dokudesktop',
  'resources/app.asar',
  'resources/export-runtime/printStylesheet.css',
  'resources/export-runtime/scripts/render_weasy_pdf.py',
  'resources/export-runtime/weasy-python/bin/python',
  'resources/export-runtime/latex/bin/pandoc',
  'resources/export-runtime/latex/bin/lualatex',
  'resources/export-runtime/latex/share/texlive/texmf-dist/web2c/texmf.cnf',
];

const requiredDebContent = [
  './opt/Doku/@dokudesktop',
  './opt/Doku/resources/app.asar',
  './opt/Doku/resources/export-runtime/printStylesheet.css',
  './opt/Doku/resources/export-runtime/scripts/render_weasy_pdf.py',
  './opt/Doku/resources/export-runtime/weasy-python/bin/python',
  './opt/Doku/resources/export-runtime/latex/bin/pandoc',
  './opt/Doku/resources/export-runtime/latex/bin/lualatex',
  './opt/Doku/resources/export-runtime/latex/share/texlive/texmf-dist/web2c/texmf.cnf',
  './usr/share/applications/@dokudesktop.desktop',
];

function main() {
  const checks = [];

  assertExists(debPath, 'Linux .deb artifact exists');
  assertExists(unpackedDir, 'linux-unpacked directory exists');

  for (const relativePath of requiredUnpackedFiles) {
    assertExists(join(unpackedDir, relativePath), `Unpacked artifact contains ${relativePath}`);
  }

  const debStats = statSync(debPath);
  checks.push(ok(`.deb size is ${formatBytes(debStats.size)}`));

  const controlOutput = exec('dpkg-deb', ['-I', debPath]);
  assertIncludes(controlOutput, 'Package: doku', 'Debian control metadata contains package name');
  assertIncludes(controlOutput, 'Version: 0.1.0', 'Debian control metadata contains version');
  assertIncludes(
    controlOutput,
    'Maintainer: Lorenzo DM <commercial.lorenzodm@gmail.com>',
    'Debian control metadata contains maintainer',
  );
  assertIncludes(
    controlOutput,
    'Homepage: https://github.com/LorenzoElSalserito/Doku',
    'Debian control metadata contains homepage',
  );

  const contentOutput = exec('dpkg-deb', ['-c', debPath]);
  for (const entry of requiredDebContent) {
    assertIncludes(contentOutput, entry, `Debian archive contains ${entry}`);
  }

  console.log('Doku Linux packaging smoke check passed.');
  for (const check of checks) {
    console.log(check);
  }

  function assertExists(path, label) {
    if (!existsSync(path)) {
      fail(`${label}: missing at ${path}`);
    }
    checks.push(ok(label));
  }

  function assertIncludes(haystack, needle, label) {
    if (!haystack.includes(needle)) {
      fail(`${label}: expected to find "${needle}"`);
    }
    checks.push(ok(label));
  }
}

function exec(command, args) {
  try {
    return execFileSync(command, args, {
    cwd: rootDir,
    encoding: 'utf8',
    maxBuffer: 128 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  } catch (error) {
    fail(`${command} ${args.join(' ')} failed: ${error.message}`);
  }
}

function formatBytes(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function ok(message) {
  return `- ${message}`;
}

function fail(message) {
  console.error(`Smoke check failed: ${message}`);
  process.exit(1);
}

main();
