#!/usr/bin/env node

const { existsSync, readdirSync, readFileSync, statSync } = require('node:fs');
const { join } = require('node:path');

const rootDir = process.cwd();
const outputDir = join(rootDir, 'build/desktop');
const version = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf8')).version;
const rpmPath = readdirSync(outputDir)
  .filter((name) => name.endsWith('.rpm') && name.includes(version))
  .map((name) => join(outputDir, name))
  .sort((left, right) => statSync(right).mtimeMs - statSync(left).mtimeMs)[0];

if (!rpmPath || !existsSync(rpmPath)) fail(`RPM ${version} mancante in ${outputDir}`);

require('./lib/rpm-runtime.cjs').certifyRpm(rpmPath);

console.log(`Certificazione RPM senza dipendenze superata: ${rpmPath}`);

function fail(message) {
  console.error(`Certificazione RPM fallita: ${message}`);
  process.exit(1);
}
