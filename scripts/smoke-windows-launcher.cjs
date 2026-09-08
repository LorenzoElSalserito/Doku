#!/usr/bin/env node
const fs = require('node:fs');
const { join } = require('node:path');
const { tmpdir } = require('node:os');
const { spawn, spawnSync } = require('node:child_process');
const { setTimeout: delay } = require('node:timers/promises');
const assert = require('node:assert/strict');

if (process.platform !== 'win32') throw new Error('Windows runner required');
const { version } = require('../package.json');
const temporary = fs.mkdtempSync(join(tmpdir(), 'doku launcher '));
const diagnostics = join(__dirname, '../build/smoke-diagnostics');

async function launch(directory) {
  const appUser = join(directory, 'AppUser');
  const logs = join(appUser, 'logs');
  fs.rmSync(logs, { recursive: true, force: true });
  const env = { ...process.env, PATH: join(process.env.SystemRoot, 'System32') };
  for (const key of ['DOKU_DATA_DIR', 'PORTABLE_EXECUTABLE_DIR', 'PORTABLE_EXECUTABLE_FILE', 'PYTHONHOME', 'PYTHONPATH', 'WEASYPRINT_DLL_DIRECTORIES', 'ELECTRON_RUN_AS_NODE']) delete env[key];
  const child = spawn(join(directory, 'Doku.exe'), [], { env, stdio: 'inherit' });
  let failure;
  child.on('error', (error) => { failure = error; });
  try {
    const deadline = Date.now() + 120_000;
    while (Date.now() < deadline) {
      if (failure) throw failure;
      if (fs.existsSync(logs)) {
        const entries = fs.readdirSync(logs).filter((name) => name.endsWith('.log'))
          .flatMap((name) => fs.readFileSync(join(logs, name), 'utf8').split('\n'))
          .filter(Boolean).flatMap((line) => { try { return [JSON.parse(line)]; } catch { return []; } });
        const fatal = entries.find((entry) => entry.event === 'app:fatal-bootstrap-error');
        if (fatal) throw new Error(JSON.stringify(fatal));
        if (entries.some((entry) => entry.event === 'window:reveal-end')) {
          const start = entries.find((entry) => entry.event === 'startup:process-created');
          assert.equal(start.context.appDataDir, appUser);
          assert.equal(start.context.electronUserDataDir, join(appUser, 'Electron'));
          return;
        }
      }
      await delay(500);
    }
    throw new Error('Portable EXE did not show its window within 120 seconds');
  } finally {
    if (child.pid) spawnSync('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    await delay(1500);
    if (fs.existsSync(logs)) fs.cpSync(logs, join(diagnostics, String(Date.now())), { recursive: true });
  }
}

(async () => {
  try {
    const first = join(temporary, 'prima posizione');
    const moved = join(temporary, 'seconda posizione');
    fs.mkdirSync(first);
    fs.copyFileSync(join(__dirname, `../build/desktop/doku_v${version}.exe`), join(first, 'Doku.exe'));
    await launch(first);
    const settingsPath = join(first, 'AppUser/settings.json');
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    settings.theme = 'dark';
    fs.writeFileSync(settingsPath, JSON.stringify(settings));
    fs.renameSync(first, moved);
    await launch(moved);
    assert.equal(JSON.parse(fs.readFileSync(join(moved, 'AppUser/settings.json'), 'utf8')).theme, 'dark');
    console.log('Portable EXE starts with OS-only PATH; AppUser survives relocation');
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true, maxRetries: 10, retryDelay: 500 });
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
