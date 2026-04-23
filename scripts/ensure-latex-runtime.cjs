#!/usr/bin/env node

const { existsSync } = require('node:fs');
const fs = require('node:fs/promises');
const { join } = require('node:path');

const rootDir = join(__dirname, '..');
const runtimeDir = join(rootDir, 'build/export-runtime/latex');
const binDir = join(runtimeDir, 'bin');

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

async function main() {
  await fs.mkdir(binDir, { recursive: true });
  await copyExecutable('/usr/bin/pandoc', join(binDir, 'pandoc'));
  await copyExecutable('/usr/bin/luahbtex', join(binDir, 'luahbtex'));
  await copyExecutable('/usr/bin/luahbtex', join(binDir, 'lualatex'));
  await copyExecutable('/usr/bin/kpsewhich', join(binDir, 'kpsewhich'));

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
