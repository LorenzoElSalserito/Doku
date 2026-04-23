#!/usr/bin/env node

const { existsSync } = require('node:fs');
const fs = require('node:fs/promises');
const { join } = require('node:path');
const { spawnSync } = require('node:child_process');

const rootDir = join(__dirname, '..');
const runtimeDir = join(rootDir, 'build/export-runtime/latex');
const binDir = join(runtimeDir, 'bin');

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

async function main() {
  await fs.mkdir(binDir, { recursive: true });
  const pandoc = resolveExecutable('pandoc', '/usr/bin/pandoc');
  const luahbtex = resolveExecutable('luahbtex', '/usr/bin/luahbtex');
  const kpsewhich = resolveExecutable('kpsewhich', '/usr/bin/kpsewhich');

  await copyExecutable(pandoc, join(binDir, 'pandoc'));
  await copyExecutable(luahbtex, join(binDir, 'luahbtex'));
  await copyExecutable(luahbtex, join(binDir, 'lualatex'));
  await copyExecutable(kpsewhich, join(binDir, 'kpsewhich'));

  await copyTree('/usr/share/texlive', join(runtimeDir, 'share/texlive'));
  await copyTree('/usr/share/texmf', join(runtimeDir, 'share/texmf'));
  await copyTree('/var/lib/texmf', join(runtimeDir, 'var/lib/texmf'));
  await copyTree('/etc/texmf', join(runtimeDir, 'etc/texmf'));

  console.log(`LuaLaTeX runtime ready at ${runtimeDir}`);
}

async function copyExecutable(source, target) {
  if (!existsSync(source)) {
    throw new Error(`Missing required executable: ${source}`);
  }

  await fs.copyFile(source, target);
  await fs.chmod(target, 0o755);
}

function resolveExecutable(name, fallbackPath) {
  if (existsSync(fallbackPath)) {
    return fallbackPath;
  }

  const result = spawnSync('which', [name], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  const resolved = result.status === 0 ? result.stdout.trim().split('\n')[0] : '';

  if (resolved && existsSync(resolved)) {
    return resolved;
  }

  throw new Error(
    `Missing required executable: ${name}. Install pandoc and TeX Live LuaLaTeX before running ensure:latex-runtime.`,
  );
}

async function copyTree(source, target) {
  if (!existsSync(source)) {
    throw new Error(`Missing required TeX tree: ${source}`);
  }

  await fs.rm(target, { recursive: true, force: true });
  await fs.cp(source, target, {
    recursive: true,
    dereference: false,
    preserveTimestamps: true,
  });
}
