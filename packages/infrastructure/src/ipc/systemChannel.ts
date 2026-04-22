import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { app, ipcMain, nativeTheme, shell } from 'electron';
import { IPC_CHANNELS } from './channels.js';

const ALLOWED_EXTERNAL_PROTOCOLS = new Set(['http:', 'https:', 'mailto:']);
const execFileAsync = promisify(execFile);

export function registerSystemChannel(): () => void {
  const appInfo = async () => ({
    name: app.getName(),
    version: app.getVersion(),
  });
  const prefersDark = async () => nativeTheme.shouldUseDarkColors;
  const openExternal = async (_event: unknown, rawUrl: unknown) => {
    if (typeof rawUrl !== 'string') {
      throw new Error('system:open-external expects a string URL');
    }
    let parsed: URL;
    try {
      parsed = new URL(rawUrl);
    } catch {
      throw new Error(`system:open-external received an invalid URL: ${rawUrl}`);
    }
    if (!ALLOWED_EXTERNAL_PROTOCOLS.has(parsed.protocol)) {
      throw new Error(`system:open-external blocks protocol ${parsed.protocol}`);
    }
    await shell.openExternal(parsed.toString());
  };
  const listFonts = async () => listInstalledFonts(process.platform);
  const openDefaultAppsPreferences = async () => {
    const target = defaultAppsPreferencesTarget(process.platform);
    if (!target) {
      return;
    }
    await shell.openExternal(target);
  };

  ipcMain.handle(IPC_CHANNELS.systemAppInfo, appInfo);
  ipcMain.handle(IPC_CHANNELS.systemPrefersDark, prefersDark);
  ipcMain.handle(IPC_CHANNELS.systemOpenExternal, openExternal);
  ipcMain.handle(IPC_CHANNELS.systemListFonts, listFonts);
  ipcMain.handle(IPC_CHANNELS.systemOpenDefaultAppsPreferences, openDefaultAppsPreferences);

  return () => {
    ipcMain.removeHandler(IPC_CHANNELS.systemAppInfo);
    ipcMain.removeHandler(IPC_CHANNELS.systemPrefersDark);
    ipcMain.removeHandler(IPC_CHANNELS.systemOpenExternal);
    ipcMain.removeHandler(IPC_CHANNELS.systemListFonts);
    ipcMain.removeHandler(IPC_CHANNELS.systemOpenDefaultAppsPreferences);
  };
}

async function listInstalledFonts(platform: NodeJS.Platform): Promise<string[]> {
  try {
    if (platform === 'win32') {
      const { stdout } = await execFileAsync('powershell', [
        '-NoProfile',
        '-Command',
        "Get-ItemProperty 'HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Fonts' | Select-Object -Property * | ConvertTo-Json -Compress",
      ]);
      return normalizeWindowsFonts(stdout);
    }

    if (platform === 'darwin') {
      try {
        const { stdout } = await execFileAsync('system_profiler', ['SPFontsDataType', '-json']);
        return normalizeMacFonts(stdout);
      } catch {
        const { stdout } = await execFileAsync('fc-list', [':', 'family']);
        return normalizeFcListFonts(stdout);
      }
    }

    const { stdout } = await execFileAsync('fc-list', [':', 'family']);
    return normalizeFcListFonts(stdout);
  } catch {
    return [];
  }
}

function normalizeFcListFonts(stdout: string): string[] {
  return Array.from(
    new Set(
      stdout
        .split('\n')
        .flatMap((line) => line.split(':').slice(1).join(':').split(','))
        .map((font) => font.trim())
        .filter(Boolean),
    ),
  ).sort((left, right) => left.localeCompare(right));
}

function normalizeWindowsFonts(stdout: string): string[] {
  const parsed = JSON.parse(stdout) as Record<string, unknown>;
  return Array.from(
    new Set(
      Object.keys(parsed)
        .filter((key) => key !== 'PSPath' && key !== 'PSParentPath' && key !== 'PSChildName' && key !== 'PSDrive' && key !== 'PSProvider')
        .map((name) => name.replace(/\s*\((TrueType|OpenType)\)\s*$/i, '').trim())
        .filter(Boolean),
    ),
  ).sort((left, right) => left.localeCompare(right));
}

function normalizeMacFonts(stdout: string): string[] {
  const parsed = JSON.parse(stdout) as {
    SPFontsDataType?: Array<Record<string, unknown>>;
  };
  return Array.from(
    new Set(
      (parsed.SPFontsDataType ?? [])
        .map((entry) => {
          const family = entry.family;
          return typeof family === 'string' ? family.trim() : '';
        })
        .filter(Boolean),
    ),
  ).sort((left, right) => left.localeCompare(right));
}

function defaultAppsPreferencesTarget(platform: NodeJS.Platform): string | null {
  if (platform === 'win32') {
    return 'ms-settings:defaultapps';
  }

  if (platform === 'darwin') {
    return 'x-apple.systempreferences:com.apple.preference.extensions';
  }

  if (platform === 'linux') {
    const home = process.env.HOME;
    return home ? `file://${home}/.local/share/applications` : null;
  }

  return null;
}
