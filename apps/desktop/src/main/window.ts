import { BrowserWindow, screen, shell } from 'electron';
import { existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { PRODUCT_NAME } from '@doku/application';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Icon resolution must work in three layouts:
//   1. Dev (electron-vite): src/assets sits two levels above out/main.
//   2. Packaged app.asar: the renderer Vite build emits a hashed copy under
//      out/renderer/assets/ (e.g. icon-BtxUHVFb.png). We glob for it.
//   3. extraResources fallback under process.resourcesPath.
// Pick the first candidate that exists so a missing dev asset doesn't break
// packaged builds and vice versa. Falling through silently is fine — Electron
// just renders a blank icon, no crash.
function resolveWindowIconPath(): string {
  const exact = [
    join(__dirname, '../../src/assets/icon.png'),
    join(__dirname, '../renderer/assets/icon.png'),
    process.resourcesPath ? join(process.resourcesPath, 'icon.png') : '',
  ].filter(Boolean);
  for (const candidate of exact) {
    if (existsSync(candidate)) return candidate;
  }

  // Hashed-name lookup inside the renderer assets directory.
  const rendererAssetsDir = join(__dirname, '../renderer/assets');
  try {
    const hashed = readdirSync(rendererAssetsDir).find(
      (entry) => /^icon-[A-Za-z0-9_-]+\.png$/.test(entry),
    );
    if (hashed) return join(rendererAssetsDir, hashed);
  } catch {
    // ENOENT or perms: fall through to dev-path fallback below.
  }

  return exact[0] ?? '';
}

const WINDOW_ICON_PATH = resolveWindowIconPath();

export interface CreateWindowOptions {
  preloadPath: string;
  rendererDevUrl?: string;
  rendererFile: string;
  safeMode?: boolean;
}

export const SAFE_MODE_ARG_PREFIX = '--doku-safe-mode=';

export function createMainWindow(options: CreateWindowOptions): BrowserWindow {
  const window = new BrowserWindow({
    width: 1200,
    height: 820,
    // Minimums chosen so the window still fits OS snap gestures on common displays:
    // 1440×900 half → 720×450, 1920×1080 top/bottom → 1920×540. Responsive CSS
    // breakpoints at 1080px and 900px keep the UI readable below these sizes.
    minWidth: 720,
    minHeight: 480,
    show: false,
    title: PRODUCT_NAME,
    icon: WINDOW_ICON_PATH,
    backgroundColor: '#121214',
    autoHideMenuBar: true,
    webPreferences: {
      preload: options.preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      additionalArguments: [`${SAFE_MODE_ARG_PREFIX}${options.safeMode ? '1' : '0'}`],
    },
  });

  window.on('enter-full-screen', () => {
    if (process.platform !== 'linux') {
      return;
    }

    window.setFullScreen(false);
    window.maximize();
  });

  window.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });

  if (options.rendererDevUrl) {
    void window.loadURL(options.rendererDevUrl);
  } else {
    void window.loadFile(options.rendererFile);
  }

  return window;
}

export function showMainWindow(window: BrowserWindow): void {
  if (window.isDestroyed()) {
    return;
  }

  // Strategy:
  //   - Linux/X11 (Cinnamon, GNOME/X11, KDE/X11): calling maximize() on a
  //     still-hidden window emits an extra 'show' event and paints two
  //     frames at different geometries (default 1200×820, then maximized).
  //     Worse, the maximize-then-show race triggers SIGSEGV in the browser
  //     process on some WMs. Pre-sizing the window to the work area before
  //     show() avoids the race entirely: one paint, one show event.
  //   - macOS/Windows: maximize() before show() is the well-supported path
  //     and matches user expectation (Windows snap, macOS zoom). Keep it.
  if (process.platform === 'linux') {
    try {
      const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
      const { workArea } = display;
      window.setBounds(workArea);
    } catch {
      // If `screen` is not yet ready (extremely early reveal), fall back to
      // the cross-platform path. Better a double paint than no window.
      if (!window.isMaximized()) {
        window.maximize();
      }
    }
  } else if (!window.isMaximized()) {
    window.maximize();
  }
  window.show();
}
