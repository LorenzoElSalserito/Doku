import { BrowserWindow } from 'electron';
import { PRODUCT_NAME } from '@doku/application';

const SPLASH_LOGO_DATA_URL = `data:image/png;base64,${__DOKU_SPLASH_ICON_BASE64__}`;

const SPLASH_WIDTH = 420;
const SPLASH_HEIGHT = 340;
const SPLASH_MIN_VISIBLE_MS = 1000;

const splashShownAt = new WeakMap<BrowserWindow, number>();

export function createSplashWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: SPLASH_WIDTH,
    height: SPLASH_HEIGHT,
    minWidth: SPLASH_WIDTH,
    minHeight: SPLASH_HEIGHT,
    maxWidth: SPLASH_WIDTH,
    maxHeight: SPLASH_HEIGHT,
    show: false,
    frame: false,
    resizable: false,
    movable: true,
    center: true,
    title: `${PRODUCT_NAME} Loading`,
    backgroundColor: '#121214',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  const showOnce = () => {
    if (window.isDestroyed() || window.isVisible()) {
      return;
    }
    window.show();
    splashShownAt.set(window, Date.now());
  };
  window.once('ready-to-show', showOnce);
  window.webContents.once('did-finish-load', showOnce);

  void window.loadURL(buildSplashDataUrl());
  return window;
}

export function closeSplashWindow(window: BrowserWindow | null): void {
  if (!window || window.isDestroyed()) {
    return;
  }
  const shownAt = splashShownAt.get(window);
  const remaining = shownAt ? Math.max(0, SPLASH_MIN_VISIBLE_MS - (Date.now() - shownAt)) : 0;
  if (remaining === 0) {
    window.close();
    return;
  }
  setTimeout(() => {
    if (!window.isDestroyed()) {
      window.close();
    }
  }, remaining);
}

function buildSplashDataUrl(): string {
  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:">
  <style>
    * { box-sizing: border-box; }
    html, body {
      width: 100%;
      height: 100%;
      margin: 0;
      overflow: hidden;
      background: #121214;
      color: #e8e6e2;
      font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    body {
      display: grid;
      place-items: center;
      padding: 18px;
    }
    .splash {
      width: 100%;
      height: 100%;
      display: grid;
      grid-template-rows: 1fr auto auto;
      justify-items: center;
      align-items: center;
      gap: 24px;
      padding: 36px 40px 40px;
      border-radius: 20px;
      border: 1px solid #2e2e34;
      background: radial-gradient(120% 80% at 50% 0%, #242428 0%, #1a1a1e 60%, #18181c 100%);
      box-shadow: 0 24px 60px rgba(0, 0, 0, 0.55), inset 0 0 0 1px rgba(255, 255, 255, 0.04);
    }
    .logo {
      width: 112px;
      height: 112px;
      display: grid;
      place-items: center;
      align-self: end;
    }
    .logo img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      display: block;
      filter: drop-shadow(0 6px 18px rgba(0, 163, 238, 0.25));
    }
    .status {
      color: #9a9590;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.18em;
      text-transform: uppercase;
    }
    .bar {
      width: 220px;
      height: 6px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.08);
      overflow: hidden;
      position: relative;
    }
    .bar::after {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      width: 45%;
      height: 100%;
      border-radius: inherit;
      background: linear-gradient(90deg, rgba(0, 163, 238, 0) 0%, #00a3ee 45%, #66cfff 100%);
      box-shadow: 0 0 12px rgba(0, 163, 238, 0.45);
      animation: loading 1.4s cubic-bezier(0.2, 0.8, 0.2, 1) infinite;
    }
    @keyframes loading {
      from { transform: translateX(-120%); }
      to { transform: translateX(260%); }
    }
    @media (prefers-reduced-motion: reduce) {
      .bar::after { width: 100%; animation: none; transform: none; }
    }
  </style>
</head>
<body>
  <main class="splash" role="status" aria-live="polite">
    <div class="logo" aria-hidden="true"><img src="${SPLASH_LOGO_DATA_URL}" alt=""></div>
    <span class="status">Now Loading</span>
    <div class="bar" aria-hidden="true"></div>
  </main>
</body>
</html>`;
  return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
}
