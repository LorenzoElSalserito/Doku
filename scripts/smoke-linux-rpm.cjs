#!/usr/bin/env node

const { existsSync, readdirSync, readFileSync, statSync } = require('node:fs');
const { execFileSync } = require('node:child_process');
const { join } = require('node:path');

const rootDir = process.cwd();
const outputDir = join(rootDir, 'build/desktop');
const version = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf8')).version;
const rpmPath = readdirSync(outputDir)
  .filter((name) => name.endsWith('.rpm') && name.includes(version))
  .map((name) => join(outputDir, name))
  .sort((left, right) => statSync(right).mtimeMs - statSync(left).mtimeMs)[0];

if (!rpmPath || !existsSync(rpmPath)) fail(`RPM ${version} mancante in ${outputDir}`);

const requirements = execFileSync('rpm', ['-qpR', '--dbpath', '/tmp/doku-rpmdb', rpmPath], {
  cwd: rootDir,
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe'],
}).trim().split('\n').filter(Boolean);

// electron-builder uses /bin/sh scriptlets to install the command symlink,
// configure Chromium sandbox permissions, and refresh desktop/MIME caches.
// No application, Python, or ELF dependency may escape the bundled runtime.
const externalRequirements = requirements.filter(
  (entry) => entry !== '/bin/sh' && !entry.startsWith('rpmlib('),
);
if (externalRequirements.length > 0) {
  fail(`dipendenze esterne trovate:\n${externalRequirements.join('\n')}`);
}

console.log(`Certificazione RPM senza dipendenze superata: ${rpmPath}`);

function fail(message) {
  console.error(`Certificazione RPM fallita: ${message}`);
  process.exit(1);
}
