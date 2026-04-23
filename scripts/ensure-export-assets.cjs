#!/usr/bin/env node

const fs = require('node:fs/promises');
const { join } = require('node:path');

const rootDir = join(__dirname, '..');
const sourceExportDir = join(rootDir, 'packages/infrastructure/src/export');
const runtimeDir = join(rootDir, 'build/export-runtime');

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

async function main() {
  await fs.mkdir(join(runtimeDir, 'scripts'), { recursive: true });
  await fs.copyFile(
    join(sourceExportDir, 'printStylesheet.css'),
    join(runtimeDir, 'printStylesheet.css'),
  );
  await fs.copyFile(
    join(sourceExportDir, 'scripts/render_weasy_pdf.py'),
    join(runtimeDir, 'scripts/render_weasy_pdf.py'),
  );

  console.log(`Portable export assets ready at ${runtimeDir}`);
}
