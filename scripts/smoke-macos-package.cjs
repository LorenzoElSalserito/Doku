#!/usr/bin/env node
const { existsSync, readdirSync } = require('node:fs');
const { join } = require('node:path');
const { certifyExportRuntime } = require('./lib/smoke-export-runtime.cjs');
if (process.platform !== 'darwin') throw new Error('macOS runner required');
const output = join(__dirname, '../build/desktop');
const { version } = require('../package.json');
if (!existsSync(join(output, `doku_v${version}.dmg`))) throw new Error('Missing DMG artifact');
const directories = readdirSync(output).filter((name) => name === 'mac' || name.startsWith('mac-'));
const app = directories.map((name) => join(output, name, 'Doku.app/Contents'))
  .find((directory) => existsSync(join(directory, 'MacOS/Doku')));
if (!app) throw new Error('Missing packaged macOS app');
certifyExportRuntime(join(app, 'Resources/export-runtime'));
console.log('macOS DMG and relocated PDF runtime verified');
