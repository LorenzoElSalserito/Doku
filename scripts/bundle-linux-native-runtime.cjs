#!/usr/bin/env node

const { existsSync } = require('node:fs');
const fs = require('node:fs/promises');
const { basename, dirname, join } = require('node:path');
const { spawnSync } = require('node:child_process');

if (process.platform !== 'linux') process.exit(0);

const rootDir = join(__dirname, '..');
const runtimeDir = join(rootDir, 'build/export-runtime');
const libraryDir = join(runtimeDir, 'lib');
const pythonHome = join(runtimeDir, 'weasy-python');
const pythonBin = join(pythonHome, 'bin/python');
const seeds = [
  pythonBin,
  join(runtimeDir, 'latex/bin/pandoc'),
  join(runtimeDir, 'latex/bin/lualatex'),
  join(runtimeDir, 'latex/bin/kpsewhich'),
];

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

async function main() {
  for (const seed of seeds) {
    if (!existsSync(seed)) throw new Error(`Missing bundled executable: ${seed}`);
  }

  await fs.mkdir(libraryDir, { recursive: true });
  await bundlePythonStandardLibrary();

  const loadedLibraries = probeWeasyLoadedLibraries();
  // dlopen libraries are roots, not dependencies reported by ldd.
  for (const library of loadedLibraries) await copyLibrary(library);
  const queue = [...seeds, ...loadedLibraries, ...await pythonExtensions(pythonHome)];
  const visited = new Set();
  while (queue.length > 0) {
    const binary = queue.shift();
    if (!binary || visited.has(binary)) continue;
    visited.add(binary);

    for (const dependency of resolveLddDependencies(binary)) {
      await copyLibrary(dependency);
      if (!visited.has(dependency)) queue.push(dependency);
    }
  }

  console.log(`Linux native runtime bundled at ${libraryDir} (${visited.size} ELF objects scanned)`);
}

async function pythonExtensions(directory) {
  const result = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const file = join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await pythonExtensions(file));
    else if (entry.isFile() && /\.so(?:\.|$)/.test(entry.name)) result.push(file);
  }
  return result;
}

async function copyLibrary(library) {
  for (const name of new Set([basename(library), resolveSoname(library)].filter(Boolean))) {
    await fs.copyFile(library, join(libraryDir, name));
    await fs.chmod(join(libraryDir, name), 0o755);
  }
}

function resolveSoname(binary) {
  const result = spawnSync('objdump', ['-p', binary], { encoding: 'utf8' });
  return result.stdout.match(/^\s*SONAME\s+(\S+)/m)?.[1];
}

async function bundlePythonStandardLibrary() {
  const version = run(pythonBin, ['-c', 'import sys; print(f"python{sys.version_info.major}.{sys.version_info.minor}")']);
  const stdlib = run(pythonBin, ['-c', 'import sysconfig; print(sysconfig.get_path("stdlib"))']);
  const target = join(pythonHome, 'lib', version);
  await removeSymlinks(target);
  await fs.cp(stdlib, target, {
    recursive: true,
    force: true,
    dereference: true,
    filter: (source) => !source.includes(`${join(stdlib, 'site-packages')}`),
  });
}

async function removeSymlinks(directory) {
  if (!existsSync(directory)) return;
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isSymbolicLink()) {
      await fs.rm(path, { force: true });
    } else if (entry.isDirectory() && entry.name !== 'site-packages') {
      await removeSymlinks(path);
    }
  }
}

function probeWeasyLoadedLibraries() {
  const script = [
    'from weasyprint import HTML',
    'HTML(string="<p>Doku dependency probe</p>").write_pdf("/tmp/doku-weasy-dependency-probe.pdf")',
    'import re',
    'print("\\n".join(sorted(set(re.findall(r"(/[^^\\s]+\\.so(?:\\.[0-9]+)*)", open("/proc/self/maps").read())))))',
  ].join('; ');
  const output = run(pythonBin, ['-c', script]);
  return output.split('\n').map((value) => value.trim()).filter((value) => value.startsWith('/') && existsSync(value));
}

function resolveLddDependencies(binary) {
  const result = spawnSync('ldd', [binary], { encoding: 'utf8',
    env: { ...process.env, LD_LIBRARY_PATH: `${dirname(binary)}:${libraryDir}:${process.env.LD_LIBRARY_PATH || ''}` },
  });
  if (result.status !== 0 || result.stdout.includes('not found')) {
    throw new Error(`Unresolved ELF dependencies for ${binary}\n${result.stdout}\n${result.stderr}`);
  }
  const dependencies = [];
  for (const line of result.stdout.split('\n')) {
    const match = line.match(/=>\s+(\/[^\s]+)|^\s*(\/[^\s]+)/);
    const path = match?.[1] ?? match?.[2];
    if (path && existsSync(path)) dependencies.push(path);
  }
  return dependencies;
}

function run(command, args) {
  const result = spawnSync(command, args, { cwd: rootDir, encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(' ')}\n${result.stderr}`);
  }
  return result.stdout.trim();
}
