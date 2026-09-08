#!/usr/bin/env node

const { existsSync } = require('node:fs');
const fs = require('node:fs/promises');
const { join } = require('node:path');
const { spawnSync } = require('node:child_process');

const rootDir = join(__dirname, '..');
const runtimeDir = join(rootDir, 'build/export-runtime');
const weasyRuntimeDir = join(runtimeDir, 'weasy-python');
const pythonBin = process.platform === 'win32'
  ? join(weasyRuntimeDir, 'python.exe')
  : join(weasyRuntimeDir, 'bin/python');

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

async function main() {
  run(process.execPath, [join(__dirname, 'ensure-export-assets.cjs')]);

  if (process.platform === 'win32') {
    await ensureWindowsPython();
    return;
  }

  if (!existsSync(pythonBin)) {
    run('python3', ['-m', 'venv', '--copies', weasyRuntimeDir]);
  }

  run(pythonBin, ['-m', 'pip', 'install', '--upgrade', 'pip']);
  run(pythonBin, ['-m', 'pip', 'install', 'weasyprint==66.0']);
  run(pythonBin, ['-c', 'from weasyprint import HTML; print("WeasyPrint runtime ready")']);
}

async function ensureWindowsPython() {
  const hostPython = process.env.DOKU_BUILD_PYTHON || 'python';
  const probe = spawnSync(hostPython, ['-c', 'import sys; print(sys.base_prefix)'], { encoding: 'utf8' });
  if (probe.status !== 0) throw new Error(`Cannot locate build Python: ${probe.stderr}`);
  const base = probe.stdout.trim();
  // A venv launcher still needs the host installation. Ship CPython itself.
  await fs.rm(weasyRuntimeDir, { recursive: true, force: true });
  await fs.mkdir(weasyRuntimeDir, { recursive: true });
  for (const entry of ['Lib', 'DLLs', 'LICENSE.txt']) {
    await fs.cp(join(base, entry), join(weasyRuntimeDir, entry), {
      recursive: true,
      filter: (source) => !source.includes('site-packages') && !source.includes('__pycache__'),
    });
  }
  for (const entry of await fs.readdir(base)) {
    if (/^(python.*\.(exe|dll)|vcruntime.*\.dll)$/i.test(entry)) {
      await fs.copyFile(join(base, entry), join(weasyRuntimeDir, entry));
    }
  }
  run(hostPython, ['-m', 'pip', 'install', '--only-binary=:all:', '--target',
    join(weasyRuntimeDir, 'Lib/site-packages'), 'weasyprint==66.0']);
  const dllSource = process.env.DOKU_WEASY_DLL_DIR;
  if (!dllSource || !existsSync(join(dllSource, 'libgobject-2.0-0.dll'))) {
    throw new Error('Set DOKU_WEASY_DLL_DIR to the MSYS2 mingw64/bin directory containing Pango and GObject.');
  }
  const dllTarget = join(runtimeDir, 'lib');
  await fs.rm(dllTarget, { recursive: true, force: true });
  await fs.mkdir(dllTarget, { recursive: true });
  for (const entry of await fs.readdir(dllSource)) {
    if (entry.toLowerCase().endsWith('.dll')) await fs.copyFile(join(dllSource, entry), join(dllTarget, entry));
  }
  run(pythonBin, ['-c', 'from weasyprint import HTML; print("WeasyPrint runtime ready")'], {
    PYTHONHOME: weasyRuntimeDir,
    PYTHONPATH: join(weasyRuntimeDir, 'Lib/site-packages'),
    WEASYPRINT_DLL_DIRECTORIES: dllTarget,
  });
}

function run(command, args, environment = {}) {
  const result = spawnSync(command, args, {
    cwd: rootDir,
    stdio: 'inherit',
    env: {
      ...process.env,
      PIP_DISABLE_PIP_VERSION_CHECK: '1',
      ...environment,
    },
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(' ')}`);
  }
}
