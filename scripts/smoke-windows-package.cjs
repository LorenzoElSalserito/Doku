#!/usr/bin/env node
const { existsSync, readFileSync } = require('node:fs');
const { join } = require('node:path');
const { listPackage } = require('@electron/asar');
const { certifyExportRuntime } = require('./lib/smoke-export-runtime.cjs');

if (process.platform !== 'win32') throw new Error('Windows runner required');
const output = join(__dirname, '../build/desktop');
const { version } = require('../package.json');
for (const entry of [`doku_v${version}.exe`, 'win-unpacked/Doku.exe', 'win-unpacked/resources/app.asar']) {
  const file = join(output, entry);
  if (!existsSync(file)) throw new Error(`Missing Windows artifact: ${file}`);
  if (entry.endsWith('.exe') && readFileSync(file).subarray(0, 2).toString() !== 'MZ') {
    throw new Error(`Invalid PE executable: ${file}`);
  }
}
if (listPackage(join(output, 'win-unpacked/resources/app.asar')).some((entry) => entry.startsWith('/node_modules/'))) {
  throw new Error('Runtime dependencies must be pre-bundled');
}
certifyExportRuntime(join(output, 'win-unpacked/resources/export-runtime'));
console.log('Windows portable artifact and relocated PDF runtime verified');
