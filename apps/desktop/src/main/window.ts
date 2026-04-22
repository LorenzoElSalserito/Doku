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
    minWidth: 880,
    minHeight: 600,
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

  window.once('ready-to-show', () => window.show());

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
