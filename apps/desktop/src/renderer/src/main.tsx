import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import editorWorkerUrl from 'monaco-editor/esm/vs/editor/editor.worker?worker&url';
import '@doku/ui';
import './styles/app.css';
import { BootstrapRoot } from './app/BootstrapRoot.js';

function logRendererBootstrap(event: string, context?: Record<string, unknown>): void {
  void window.doku.system.logEvent(event, context);
}

window.addEventListener('error', (event) => {
  logRendererBootstrap('renderer-global-error', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error instanceof Error
      ? { name: event.error.name, message: event.error.message, stack: event.error.stack }
      : String(event.error),
  });
});

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  logRendererBootstrap('renderer-unhandled-rejection', {
    reason: reason instanceof Error
      ? { name: reason.name, message: reason.message, stack: reason.stack }
      : String(reason),
  });
});

if (!window.doku.system.safeMode) {
  (globalThis as typeof globalThis & {
    MonacoEnvironment?: {
      getWorker: () => Worker;
      getWorkerUrl: () => string;
    };
  })
    .MonacoEnvironment = {
    getWorker: () => new EditorWorker(),
    getWorkerUrl: () => editorWorkerUrl,
  };
}

const container = document.getElementById('root');
if (!container) throw new Error('Root container #root missing in index.html');

logRendererBootstrap('renderer-entry', { safeMode: window.doku.system.safeMode });

createRoot(container).render(
  <StrictMode>
    <BootstrapRoot />
  </StrictMode>,
);
