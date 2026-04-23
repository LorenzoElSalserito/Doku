#!/usr/bin/env node

const { existsSync } = require('node:fs');
const fs = require('node:fs/promises');
const { join } = require('node:path');
const { spawnSync } = require('node:child_process');

const rootDir = join(__dirname, '..');
const sourceExportDir = join(rootDir, 'packages/infrastructure/src/export');
const runtimeDir = join(rootDir, 'build/export-runtime');
const weasyRuntimeDir = join(runtimeDir, 'weasy-python');
const pythonBin = process.platform === 'win32'
  ? join(weasyRuntimeDir, 'Scripts/python.exe')
  : join(weasyRuntimeDir, 'bin/python');

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

async function main() {
  await fs.mkdir(runtimeDir, { recursive: true });
  await fs.copyFile(
    join(sourceExportDir, 'printStylesheet.css'),
    join(runtimeDir, 'printStylesheet.css'),
  );
  await fs.mkdir(join(runtimeDir, 'scripts'), { recursive: true });
  await fs.copyFile(
    join(sourceExportDir, 'scripts/render_weasy_pdf.py'),
    join(runtimeDir, 'scripts/render_weasy_pdf.py'),
  );

  if (!existsSync(pythonBin)) {
    run('python3', ['-m', 'venv', '--copies', weasyRuntimeDir]);
  }

  run(pythonBin, ['-m', 'pip', 'install', '--upgrade', 'pip']);
  run(pythonBin, ['-m', 'pip', 'install', 'weasyprint==66.0']);
  run(pythonBin, ['-c', 'from weasyprint import HTML; print("WeasyPrint runtime ready")']);
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: rootDir,
    stdio: 'inherit',
    env: {
      ...process.env,
      PIP_DISABLE_PIP_VERSION_CHECK: '1',
    },
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(' ')}`);
  }
}
