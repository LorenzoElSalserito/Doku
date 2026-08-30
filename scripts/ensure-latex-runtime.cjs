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
  const suffix = process.platform === 'win32' ? '.exe' : '';
  const pandoc = resolveExecutable('pandoc', '/usr/bin/pandoc');
  const luahbtex = resolveExecutable('luahbtex', '/usr/bin/luahbtex');
  const kpsewhich = resolveExecutable('kpsewhich', '/usr/bin/kpsewhich');

  await copyExecutable(pandoc, join(binDir, `pandoc${suffix}`));
  await copyExecutable(luahbtex, join(binDir, `luahbtex${suffix}`));
  await copyExecutable(luahbtex, join(binDir, `lualatex${suffix}`));
  await copyExecutable(kpsewhich, join(binDir, `kpsewhich${suffix}`));

  await copyTree(resolveTexTree(kpsewhich, 'TEXMFROOT'), join(runtimeDir, 'share/texlive'));
  await copyTree(resolveTexTree(kpsewhich, 'TEXMFLOCAL'), join(runtimeDir, 'share/texmf'));
  await copyTree(resolveTexTree(kpsewhich, 'TEXMFSYSVAR'), join(runtimeDir, 'var/lib/texmf'));
  await copyTree(resolveTexTree(kpsewhich, 'TEXMFSYSCONFIG'), join(runtimeDir, 'etc/texmf'));

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

  const lookupCommand = process.platform === 'win32' ? 'where' : 'which';
  const result = spawnSync(lookupCommand, [name], {
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

function resolveTexTree(kpsewhich, variable) {
  const result = spawnSync(kpsewhich, [`-var-value=${variable}`], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const path = result.status === 0 ? result.stdout.trim().split(/\r?\n/)[0] : '';
  if (!path || !existsSync(path)) {
    throw new Error(`Missing required TeX tree: ${variable} (${path || 'not resolved'})`);
  }
  return path;
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
