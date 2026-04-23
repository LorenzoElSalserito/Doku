import { BrowserWindow, shell } from 'electron';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { PRODUCT_NAME } from '@doku/application';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const WINDOW_ICON_PATH = join(__dirname, '../../src/assets/icon.png');

export interface CreateWindowOptions {
  preloadPath: string;
  rendererDevUrl?: string;
  rendererFile: string;
}

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
    },
  });

  window.once('ready-to-show', () => {
    // Maximize instead of setFullScreen: fills the work area on startup while
    // remaining a normal resizable window that the OS can snap to half / top / bottom.
    window.maximize();
    window.show();
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
