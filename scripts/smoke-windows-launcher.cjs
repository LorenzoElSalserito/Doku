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
  let exit;
  child.on('error', (error) => { failure = error; });
  child.on('exit', (code, signal) => { exit = { code, signal }; });
  const started = Date.now();
  let bootstrapStarted;
  try {
    // NSIS extracts the complete Python/TeX bundle before Electron starts.
    // Give extraction its own budget, then enforce the window startup budget.
    while (Date.now() < (bootstrapStarted ? bootstrapStarted + 120_000 : started + 600_000)) {
      if (failure) throw failure;
      if (exit) throw new Error(`Portable launcher exited before window reveal: ${JSON.stringify(exit)}`);
      if (fs.existsSync(logs)) {
        const entries = fs.readdirSync(logs).filter((name) => name.endsWith('.log'))
          .flatMap((name) => fs.readFileSync(join(logs, name), 'utf8').split('\n'))
          .filter(Boolean).flatMap((line) => { try { return [JSON.parse(line)]; } catch { return []; } });
        const fatal = entries.find((entry) => entry.event === 'app:fatal-bootstrap-error');
        if (fatal) throw new Error(JSON.stringify(fatal));
        if (!bootstrapStarted && entries.length) bootstrapStarted = Date.now();
        if (entries.some((entry) => entry.event === 'window:reveal-end')) {
          const start = entries.find((entry) => entry.event === 'startup:process-created');
          assert.equal(start.context.appDataDir, appUser);
          assert.equal(start.context.electronUserDataDir, join(appUser, 'Electron'));
          return;
        }
      }
      await delay(500);
    }
    throw new Error(bootstrapStarted
      ? 'Electron did not show its window within 120 seconds after bootstrap'
      : 'Portable EXE did not start Electron within 600 seconds (extraction/startup phase)');
  } finally {
    fs.mkdirSync(diagnostics, { recursive: true });
    fs.writeFileSync(join(diagnostics, `launcher-${started}.json`), JSON.stringify({
      directory, pid: child.pid, exit, elapsedMs: Date.now() - started,
      bootstrapStarted, error: failure?.message,
    }, null, 2));
    const processes = spawnSync('powershell.exe', ['-NoProfile', '-Command',
      'Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId,Name,ExecutablePath | ConvertTo-Json'], { encoding: 'utf8' });
    fs.writeFileSync(join(diagnostics, `processes-${started}.txt`), `${processes.stdout || ''}\n${processes.stderr || ''}`);
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
