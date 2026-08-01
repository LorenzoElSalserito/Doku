const { _electron: electron } = require('@playwright/test');
const { spawn } = require('node:child_process');
const { promises: fs, mkdtempSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { dirname, join, resolve } = require('node:path');

const electronExecutable = require('electron');
const mainEntry = resolve(process.cwd(), 'apps/desktop/out/main/index.js');

function createDokuE2EContext() {
  const rootDir = mkdtempSync(join(tmpdir(), 'doku-e2e-'));
  return {
    rootDir,
    dataDir: join(rootDir, 'data'),
    documentsDir: join(rootDir, 'documents'),
  };
}

async function prepareDokuProfile(context, settingsPatch = {}) {
  await fs.mkdir(context.dataDir, { recursive: true });
  await fs.mkdir(context.documentsDir, { recursive: true });
  const settings = {
    ...createDefaultSettings(),
    firstRunCompleted: true,
    theme: 'light',
    ...settingsPatch,
  };
  await fs.writeFile(join(context.dataDir, 'settings.json'), JSON.stringify(settings, null, 2), 'utf-8');
}

async function createMarkdownFile(context, fileName, content) {
  const filePath = join(context.documentsDir, fileName);
  await fs.mkdir(dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, 'utf-8');
  return filePath;
}

async function launchDokuApp(context, filePath) {
  const app = await electron.launch({
    executablePath: electronExecutable,
    args: [mainEntry, ...(filePath ? [filePath] : [])],
    env: buildDokuEnv(context),
  });
  const page = await app.firstWindow();
  await waitForWorkspaceReady(page);
  return { app, page };
}

async function openMarkdownFileInRunningApp(context, filePath) {
  await new Promise((resolvePromise, reject) => {
    const child = spawn(electronExecutable, [mainEntry, filePath], {
      env: buildDokuEnv(context),
      stdio: 'ignore',
    });
    child.once('error', reject);
    child.once('exit', () => resolvePromise());
  });
}

async function closeDokuApp(app) {
  await app.close();
}

/**
 * Replaces the native save dialog in the main process so an export can run
 * unattended and land on a known path.
 */
async function stubSaveDialog(app, filePath) {
  await app.evaluate(async ({ dialog }, target) => {
    dialog.showSaveDialog = async () => ({ canceled: false, filePath: target });
  }, filePath);
}

/** True when the bundled WeasyPrint runtime and Pandoc are both available. */
function hasWeasyExportRuntime() {
  const { spawnSync } = require('node:child_process');
  const { existsSync } = require('node:fs');
  const pythonBin = resolve(
    process.cwd(),
    process.platform === 'win32'
      ? 'build/export-runtime/weasy-python/Scripts/python.exe'
      : 'build/export-runtime/weasy-python/bin/python',
  );

  if (!existsSync(pythonBin)) {
    return false;
  }

  if (spawnSync('which', ['pandoc'], { encoding: 'utf-8' }).status !== 0) {
    return false;
  }

  return spawnSync(pythonBin, ['-c', 'import weasyprint']).status === 0;
}

async function cleanupDokuE2EContext(context) {
  await fs.rm(context.rootDir, { recursive: true, force: true });
}

async function readSettings(context) {
  const raw = await fs.readFile(join(context.dataDir, 'settings.json'), 'utf-8');
  return JSON.parse(raw);
}

async function readLogEntries(context) {
  const logsDir = join(context.dataDir, 'logs');
  let files = [];
  try {
    files = await fs.readdir(logsDir);
  } catch {
    return [];
  }

  const entries = [];
  for (const file of files.filter((name) => name.startsWith('session-') && name.endsWith('.log'))) {
    const raw = await fs.readFile(join(logsDir, file), 'utf-8');
    for (const line of raw.split('\n')) {
      if (!line.trim()) continue;
      entries.push(JSON.parse(line));
    }
  }
  return entries.sort((left, right) => {
    const byTimestamp = String(left.timestamp).localeCompare(String(right.timestamp));
    if (byTimestamp !== 0) return byTimestamp;
    return Number(left.sequence ?? 0) - Number(right.sequence ?? 0);
  });
}

async function waitForWorkspaceReady(page) {
  await page.getByRole('tablist', { name: 'Open documents' }).waitFor({ state: 'visible' });
}

function tabIdForPath(filePath) {
  return `file:${filePath}`;
}

function buildDokuEnv(context) {
  return {
    ...process.env,
    DOKU_DATA_DIR: context.dataDir,
    ELECTRON_DISABLE_SECURITY_WARNINGS: 'true',
  };
}

function createDefaultSettings() {
  return {
    language: 'en',
    theme: 'system',
    appZoom: 100,
    customTheme: {
      mode: 'light',
      base: '#F6F3EE',
      surface: '#FDFBF7',
      elevated: '#FFFFFF',
      accent: '#00A3EE',
      accentSoft: '#EEF8FF',
      textPrimary: '#1A1816',
      textSecondary: '#6B6560',
      border: '#E5E0D8',
      focusRing: '#66CBF5',
    },
    typography: {
      profile: 'professional',
      uiFontFamily: 'Inter',
      pdfFontFamily: 'Inter',
      monospaceFontFamily: 'Inter',
      accessibilityFontFamily: 'Inter',
      accessibilityMode: false,
    },
    writingFontFamily: null,
    workspaceQuickActionsVisible: false,
    defaultMarkdownAppPrompt: {
      dismissed: false,
      shown: false,
    },
    firstRunCompleted: false,
    launcher: {
      recentDocuments: [],
      quickResumeId: null,
    },
    workspace: {
      leftPanelWidth: 280,
      rightPanelWidth: 340,
      leftPanelCollapsed: true,
      rightPanelCollapsed: true,
    },
    workspaceViewMode: 'split',
    sessionTabs: [],
    activeSessionTabId: null,
  };
}

module.exports = {
  cleanupDokuE2EContext,
  closeDokuApp,
  createDokuE2EContext,
  createMarkdownFile,
  hasWeasyExportRuntime,
  stubSaveDialog,
  launchDokuApp,
  openMarkdownFileInRunningApp,
  prepareDokuProfile,
  readLogEntries,
  readSettings,
  tabIdForPath,
};
