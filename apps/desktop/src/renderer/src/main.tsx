import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import '@doku/ui';
import './styles/app.css';
import { App } from './app/App.js';

if (!window.doku.system.safeMode) {
  (globalThis as typeof globalThis & { MonacoEnvironment?: { getWorker: () => Worker } })
    .MonacoEnvironment = {
    getWorker: () => new EditorWorker(),
  };
}

const container = document.getElementById('root');
if (!container) throw new Error('Root container #root missing in index.html');

const DOKU_FONT_PRELOADS = [
  '1em Inter',
  '1em JetBrains Mono',
  '1em Source Serif 4',
  '1em OpenDyslexic',
  '1em Atkinson Hyperlegible',
];

async function loadDokuFonts(): Promise<void> {
  const fontSet = document.fonts;
  if (!fontSet || window.doku.system.safeMode) {
    return;
  }

  await Promise.all(DOKU_FONT_PRELOADS.map((font) => fontSet.load(font)));
}

async function preloadDokuFontsWithTimeout(timeoutMs = 800): Promise<void> {
  await Promise.race([
    loadDokuFonts(),
    new Promise<void>((resolve) => {
      window.setTimeout(resolve, timeoutMs);
    }),
  ]);
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    void loadDokuFonts();
  }
});

void preloadDokuFontsWithTimeout().finally(() => {
  createRoot(container).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
