#!/usr/bin/env node
const fs = require('node:fs');
const { join } = require('node:path');
const { tmpdir } = require('node:os');
const { execFileSync } = require('node:child_process');
const { certifyExportRuntime } = require('./lib/smoke-export-runtime.cjs');
const { version } = require('../package.json');
const artifact = join(__dirname, `../build/desktop/doku_v${version}.deb`);
const temporary = fs.mkdtempSync(join(tmpdir(), 'doku-deb-smoke-'));
try {
  const actual = execFileSync('dpkg-deb', ['-f', artifact, 'Version'], { encoding: 'utf8' }).trim();
  if (actual !== version) throw new Error(`DEB version mismatch: ${actual}`);
  execFileSync('dpkg-deb', ['--extract', artifact, temporary], { stdio: 'inherit' });
  certifyExportRuntime(join(temporary, 'opt/Doku/resources/export-runtime'));
  console.log(`Finalized DEB runtime verified: ${artifact}`);
} finally {
  fs.rmSync(temporary, { recursive: true, force: true });
}
