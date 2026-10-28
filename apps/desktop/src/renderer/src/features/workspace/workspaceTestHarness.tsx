// Test-only module: shared fixtures and helpers of the Workspace test files.
import { render } from '@testing-library/react';
import { vi } from 'vitest';
import { ThemeProvider } from '@doku/ui';
import type { DocumentSession, DocumentSummary, SettingsPatch } from '@doku/application';
import { DEFAULT_SETTINGS } from '@doku/schemas';
import { I18nProvider } from '../../i18n/I18nProvider.js';
import { Workspace } from './Workspace.js';

export { monacoRefState } from './workspaceTestMocks.js';

export const initialDocument: DocumentSummary = {
  id: '/workspace/chapter-1.md',
  kind: 'file',
  title: 'chapter-1',
  path: '/workspace/chapter-1.md',
  snippet: 'Hello world',
  lastOpenedAt: '2026-04-23T10:00:00.000Z',
};

export const loadedDocument: DocumentSession = {
  ...initialDocument,
  content: 'Hello world',
  lastSavedAt: '2026-04-23T10:00:00.000Z',
};

/** Installs the dialog polyfills and a fresh `window.doku` preload mock. */
export function installDokuWindow() {
  HTMLDialogElement.prototype.showModal = vi.fn(function showModal(this: HTMLDialogElement) {
    this.open = true;
  });
  HTMLDialogElement.prototype.close = vi.fn(function close(this: HTMLDialogElement) {
    this.open = false;
  });
  Object.defineProperty(window, 'doku', {
    configurable: true,
    value: {
      system: {
        platform: 'linux',
        appInfo: vi.fn(),
        prefersDark: vi.fn(),
        openExternal: vi.fn(),
        listFonts: vi.fn(),
        openDefaultAppsPreferences: vi.fn(),
      },
      documents: {
        loadDocument: vi.fn().mockResolvedValue(loadedDocument),
        saveDocument: vi.fn(),
        openMarkdownFile: vi.fn(),
        openDocumentAtPath: vi.fn(),
        onOpenFileRequest: vi.fn().mockReturnValue(vi.fn()),
        importAsset: vi.fn(),
        listWorkspaceTree: vi.fn().mockResolvedValue([]),
        createWorkspaceFile: vi.fn(),
        createWorkspaceFolder: vi.fn(),
        watchWorkspaceTree: vi.fn().mockReturnValue(vi.fn()),
      },
      exports: {
        exportPdf: vi.fn(),
      },
    },
  });
}

export function mockScrollMetrics(
  element: HTMLElement,
  metrics: {
    clientHeight: number;
    scrollHeight: number;
    clientWidth?: number;
    scrollWidth?: number;
  },
) {
  Object.defineProperty(element, 'clientHeight', {
    configurable: true,
    value: metrics.clientHeight,
  });
  Object.defineProperty(element, 'scrollHeight', {
    configurable: true,
    value: metrics.scrollHeight,
  });
  Object.defineProperty(element, 'clientWidth', {
    configurable: true,
    value: metrics.clientWidth ?? 800,
  });
  Object.defineProperty(element, 'scrollWidth', {
    configurable: true,
    value: metrics.scrollWidth ?? 800,
  });
}

export function renderWorkspace({
  settings = DEFAULT_SETTINGS,
  onUpdate = vi.fn<(patch: SettingsPatch) => Promise<void>>().mockResolvedValue(undefined),
  initialDocument: initialDocumentOverride = initialDocument,
}: {
  settings?: typeof DEFAULT_SETTINGS;
  onUpdate?: (patch: SettingsPatch) => Promise<void>;
  initialDocument?: DocumentSummary | null;
}) {
  return render(
    <I18nProvider language="en">
      <ThemeProvider preference="light">
        <Workspace
          settings={settings}
          initialTabs={initialDocumentOverride ? [initialDocumentOverride] : []}
          initialActiveTabId={null}
          onUpdate={onUpdate}
          onOpenSettings={vi.fn()}
          onOpenInfo={vi.fn()}
          onOpenGuide={vi.fn()}
          onOpenExport={vi.fn()}
        />
      </ThemeProvider>
    </I18nProvider>,
  );
}

export function createImageDropData(path: string) {
  const file = new File(['image'], path.split('/').at(-1) ?? 'image.png', { type: 'image/png' });
  Object.defineProperty(file, 'path', {
    value: path,
  });

  return {
    dropEffect: 'copy',
    files: [file],
    items: [
      {
        kind: 'file',
        type: 'image/png',
      },
    ],
  };
}
