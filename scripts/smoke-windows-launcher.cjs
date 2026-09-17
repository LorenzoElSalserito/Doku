#!/usr/bin/env node
/**
 * Windows launch smoke, run on the CI Windows runner after packaging:
 *
 *  1. Portable archive: extract `doku_v<version>-portable.zip`, launch
 *     `Doku.exe` with an OS-only PATH and no Doku environment, expect the
 *     window to be revealed and the data to live in `AppUser` beside the
 *     executable; then move the folder and launch again (state survives).
 *  2. Installer: run `doku_v<version>-setup.exe` silently into a temporary
 *     directory, launch the installed `Doku.exe`, expect the installed layout
 *     (no `AppUser` beside the binary), then uninstall silently.
 *
 * Every launch has a hard budget: Electron must reveal its window within
 * 120 s. There is no extraction phase any more — the previous NSIS "portable"
 * self-extractor unpacked the multi-GB PDF runtime on every start.
 */
const fs = require('node:fs');
const { join, dirname } = require('node:path');
const { tmpdir } = require('node:os');
const { spawn, spawnSync } = require('node:child_process');
const { setTimeout: delay } = require('node:timers/promises');
const assert = require('node:assert/strict');

if (process.platform !== 'win32') throw new Error('Windows runner required');
const { version } = require('../package.json');
const output = join(__dirname, '../build/desktop');
const portableArchive = join(output, `doku_v${version}-portable.zip`);
const installer = join(output, `doku_v${version}-setup.exe`);
const temporary = fs.mkdtempSync(join(tmpdir(), 'doku launcher '));
const diagnostics = join(__dirname, '../build/smoke-diagnostics');
const WINDOW_BUDGET_MS = 120_000;

function readLogEntries(logs) {
  if (!fs.existsSync(logs)) return [];
  return fs.readdirSync(logs).filter((name) => name.endsWith('.log'))
    .flatMap((name) => fs.readFileSync(join(logs, name), 'utf8').split('\n'))
    .filter(Boolean).flatMap((line) => { try { return [JSON.parse(line)]; } catch { return []; } });
}

function powershell(command) {
  const result = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`PowerShell failed (${result.status}): ${command}\n${result.stdout}\n${result.stderr}`);
  return result.stdout;
}

function killDoku() {
  spawnSync('taskkill.exe', ['/IM', 'Doku.exe', '/T', '/F'], { stdio: 'ignore' });
}

/**
 * Launches `exe` with an OS-only environment and waits for the window reveal.
 * `expected.appDataDir` is the data directory the main process must report.
 */
async function launch(exe, { logs, expected, extraEnv = {} }) {
  fs.rmSync(logs, { recursive: true, force: true });
  const env = { ...process.env, PATH: join(process.env.SystemRoot, 'System32'), ...extraEnv };
  for (const key of ['DOKU_DATA_DIR', 'PORTABLE_EXECUTABLE_DIR', 'PORTABLE_EXECUTABLE_FILE', 'PYTHONHOME', 'PYTHONPATH', 'WEASYPRINT_DLL_DIRECTORIES', 'ELECTRON_RUN_AS_NODE']) {
    if (!(key in extraEnv)) delete env[key];
  }
  const child = spawn(exe, [], { env, stdio: 'inherit', cwd: dirname(exe) });
  let failure;
  let exit;
  child.on('error', (error) => { failure = error; });
  child.on('exit', (code, signal) => { exit = { code, signal }; });
  const started = Date.now();
  try {
    while (Date.now() < started + WINDOW_BUDGET_MS) {
      if (failure) throw failure;
      if (exit) throw new Error(`Doku exited before window reveal: ${JSON.stringify(exit)}`);
      const entries = readLogEntries(logs);
      const fatal = entries.find((entry) => entry.event === 'app:fatal-bootstrap-error');
      if (fatal) throw new Error(JSON.stringify(fatal));
      if (entries.some((entry) => entry.event === 'window:reveal-end')) {
        const start = entries.find((entry) => entry.event === 'startup:process-created');
        assert.ok(start, 'startup:process-created missing from logs');
        assert.equal(start.context.appDataDir, expected.appDataDir);
        if (expected.electronUserDataDir) assert.equal(start.context.electronUserDataDir, expected.electronUserDataDir);
        assert.equal(start.context.isPackaged, true);
        return entries;
      }
      await delay(500);
    }
    throw new Error(`Electron did not show its window within ${WINDOW_BUDGET_MS / 1000} seconds (${exe})`);
  } finally {
    fs.mkdirSync(diagnostics, { recursive: true });
    fs.writeFileSync(join(diagnostics, `launcher-${started}.json`), JSON.stringify({
      exe, pid: child.pid, exit, elapsedMs: Date.now() - started, error: failure?.message, expected,
    }, null, 2));
    if (child.pid) spawnSync('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    await delay(1500);
    if (fs.existsSync(logs)) fs.cpSync(logs, join(diagnostics, String(Date.now())), { recursive: true });
  }
}

async function smokePortableArchive() {
  const first = join(temporary, 'prima posizione');
  const moved = join(temporary, 'seconda posizione');
  const extractStarted = Date.now();
  powershell(`Expand-Archive -LiteralPath '${portableArchive}' -DestinationPath '${first}' -Force`);
  console.log(`- Portable archive extracted in ${Math.round((Date.now() - extractStarted) / 1000)} s`);
  const exe = join(first, 'Doku.exe');
  assert.ok(fs.existsSync(exe), `Doku.exe missing from the extracted archive: ${exe}`);
  assert.ok(!fs.existsSync(join(first, 'Uninstall Doku.exe')), 'Portable archive must not contain the uninstaller');

  await launch(exe, {
    logs: join(first, 'AppUser/logs'),
    expected: { appDataDir: join(first, 'AppUser'), electronUserDataDir: join(first, 'AppUser/Electron') },
  });
  const settingsPath = join(first, 'AppUser/settings.json');
  const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  settings.theme = 'dark';
  fs.writeFileSync(settingsPath, JSON.stringify(settings));

  fs.renameSync(first, moved);
  await launch(join(moved, 'Doku.exe'), {
    logs: join(moved, 'AppUser/logs'),
    expected: { appDataDir: join(moved, 'AppUser'), electronUserDataDir: join(moved, 'AppUser/Electron') },
  });
  assert.equal(JSON.parse(fs.readFileSync(join(moved, 'AppUser/settings.json'), 'utf8')).theme, 'dark');
  console.log('- Portable archive starts with OS-only PATH; AppUser survives relocation');
}

async function smokeInstaller() {
  const installDir = join(temporary, 'installazione');
  const dataDir = join(temporary, 'dati installazione');
  const installStarted = Date.now();
  // NSIS: /S silent, /D must be last and unquoted. Silent installs do not auto-run the app.
  const install = spawnSync(installer, ['/S', `/D=${installDir}`], { stdio: 'inherit', timeout: 15 * 60_000 });
  if (install.error) throw install.error;
  if (install.status !== 0) throw new Error(`Installer exited with ${install.status}`);
  killDoku();
  console.log(`- Installer finished in ${Math.round((Date.now() - installStarted) / 1000)} s`);
  const exe = join(installDir, 'Doku.exe');
  const uninstaller = join(installDir, 'Uninstall Doku.exe');
  assert.ok(fs.existsSync(exe), `Installed Doku.exe missing: ${exe}`);
  assert.ok(fs.existsSync(uninstaller), `Uninstaller missing: ${uninstaller}`);

  // DOKU_DATA_DIR pins the document data dir so the smoke never touches the runner's Documents folder;
  // the Electron user-data dir must be the profile one, never AppUser beside the binary.
  const entries = await launch(exe, {
    logs: join(dataDir, 'logs'),
    extraEnv: { DOKU_DATA_DIR: dataDir },
    expected: { appDataDir: dataDir },
  });
  const start = entries.find((entry) => entry.event === 'startup:process-created');
  assert.ok(!String(start.context.electronUserDataDir).startsWith(installDir), 'Installed build must not use AppUser beside the binary');
  assert.ok(!fs.existsSync(join(installDir, 'AppUser')), 'Installed build created AppUser beside the binary');

  const uninstall = spawnSync(uninstaller, ['/S', `_?=${installDir}`], { stdio: 'inherit', timeout: 10 * 60_000 });
  if (uninstall.error) throw uninstall.error;
  if (uninstall.status !== 0) throw new Error(`Uninstaller exited with ${uninstall.status}`);
  await delay(2000);
  assert.ok(!fs.existsSync(exe), 'Doku.exe still present after uninstall');
  console.log('- Installer installs, launches with profile data and uninstalls silently');
}

(async () => {
  try {
    for (const artifact of [portableArchive, installer]) {
      if (!fs.existsSync(artifact)) throw new Error(`Missing Windows artifact: ${artifact}`);
    }
    await smokePortableArchive();
    await smokeInstaller();
    console.log('Windows portable archive and installer verified');
  } finally {
    killDoku();
    fs.rmSync(temporary, { recursive: true, force: true, maxRetries: 10, retryDelay: 500 });
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
