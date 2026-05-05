// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeProvider } from '@doku/ui';
import type { DocumentSession, DocumentSummary, SettingsPatch } from '@doku/application';
import { DEFAULT_SETTINGS } from '@doku/schemas';
import { I18nProvider } from '../../i18n/I18nProvider.js';
import { Workspace } from './Workspace.js';

const monacoRefState = {
  surroundSelection: vi.fn(),
  replaceSelection: vi.fn(),
  insertText: vi.fn(),
  focus: vi.fn(),
  layout: vi.fn(),
};

vi.mock('./MonacoEditor.js', async () => {
  const react = await import('react');
  return {
    MonacoEditor: react.forwardRef(function MockMonacoEditor(
      props: { value: string; onChange: (value: string) => void },
      ref,
    ) {
      react.useImperativeHandle(ref, () => monacoRefState);
      return (
        <textarea
          aria-label="Markdown editor"
          data-testid="mock-monaco-editor"
          value={props.value}
          onChange={(event) => props.onChange(event.currentTarget.value)}
        />
      );
    }),
  };
});

vi.mock('./MarkdownPreview.js', () => ({
  MarkdownPreview: () => <div data-testid="mock-markdown-preview" />,
}));

const documents: DocumentSession[] = [
  createDocument('/workspace/chapter-1.md', 'Chapter 1', '# Chapter 1\n\nOne'),
  createDocument('/workspace/chapter-2.md', 'Chapter 2', '# Chapter 2\n\nTwo'),
  createDocument('/workspace/chapter-3.md', 'Chapter 3', '# Chapter 3\n\nThree'),
];

const summaries = documents.map(toSummary);

describe('Workspace tab persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    installDokuMock();
    if (!Element.prototype.scrollIntoView) {
      Element.prototype.scrollIntoView = vi.fn();
    }
  });

  afterEach(() => {
    cleanup();
  });

  it('persists opened tabs and restores them with the saved active tab', async () => {
    const onUpdate = vi.fn<(patch: SettingsPatch) => Promise<void>>().mockResolvedValue(undefined);
    const openFileRequestHandlers: Array<(filePath: string) => void> = [];
    installDokuMock(openFileRequestHandlers);

    const view = renderWorkspace({
      initialTabs: [summaries[0]],
      onUpdate,
    });

    await screen.findByRole('tab', { name: 'Chapter 1' });
    expect(openFileRequestHandlers).toHaveLength(1);

    openFileRequestHandlers[0]?.('/workspace/chapter-2.md');
    openFileRequestHandlers[0]?.('/workspace/chapter-3.md');

    await screen.findByRole('tab', { name: 'Chapter 2' });
    await screen.findByRole('tab', { name: 'Chapter 3' });

    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          activeSessionTabId: 'file:/workspace/chapter-3.md',
          sessionTabs: summaries,
        }),
      );
    });

    view.unmount();
    onUpdate.mockClear();

    renderWorkspace({
      settings: {
        ...DEFAULT_SETTINGS,
        firstRunCompleted: true,
        sessionTabs: summaries,
        activeSessionTabId: 'file:/workspace/chapter-2.md',
      },
      initialTabs: summaries,
      initialActiveTabId: 'file:/workspace/chapter-2.md',
      onUpdate,
    });

    await screen.findByRole('tab', { name: 'Chapter 1' });
    await screen.findByRole('tab', { name: 'Chapter 2' });
    await screen.findByRole('tab', { name: 'Chapter 3' });

    const tablist = screen.getByRole('tablist', { name: 'Open documents' });
    expect(within(tablist).getAllByRole('tab').map((tab) => tab.textContent)).toEqual([
      'Chapter 1',
      'Chapter 2',
      'Chapter 3',
    ]);
    expect(screen.getByRole('tab', { name: 'Chapter 2' })).toHaveAttribute('aria-selected', 'true');
    expect(window.doku.documents.loadDocument).toHaveBeenCalledWith(summaries[0]);
    expect(window.doku.documents.loadDocument).toHaveBeenCalledWith(summaries[1]);
    expect(window.doku.documents.loadDocument).toHaveBeenCalledWith(summaries[2]);
  });

  it('navigates and closes tabs with primary-modifier shortcuts', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    renderWorkspace({
      settings: {
        ...DEFAULT_SETTINGS,
        firstRunCompleted: true,
        sessionTabs: summaries,
        activeSessionTabId: 'file:/workspace/chapter-2.md',
      },
      initialTabs: summaries,
      initialActiveTabId: 'file:/workspace/chapter-2.md',
    });

    await screen.findByRole('tab', { name: 'Chapter 1' });
    await screen.findByRole('tab', { name: 'Chapter 2' });
    await screen.findByRole('tab', { name: 'Chapter 3' });

    expect(screen.getByRole('tab', { name: 'Chapter 2' })).toHaveAttribute('aria-selected', 'true');

    fireEvent.keyDown(window, { key: 'Tab', ctrlKey: true });
    expect(screen.getByRole('tab', { name: 'Chapter 3' })).toHaveAttribute('aria-selected', 'true');

    fireEvent.keyDown(window, { key: 'Tab', ctrlKey: true, shiftKey: true });
    expect(screen.getByRole('tab', { name: 'Chapter 2' })).toHaveAttribute('aria-selected', 'true');

    fireEvent.keyDown(window, { key: '1', ctrlKey: true });
    expect(screen.getByRole('tab', { name: 'Chapter 1' })).toHaveAttribute('aria-selected', 'true');

    fireEvent.keyDown(window, { key: 'w', ctrlKey: true });
    expect(screen.queryByRole('tab', { name: 'Chapter 1' })).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Chapter 3' })).toHaveAttribute('aria-selected', 'true');
    expect(confirmSpy).not.toHaveBeenCalled();

    confirmSpy.mockRestore();
  });

  it('keeps overflowing tabs scrollable and supports drag reorder', async () => {
    const manyDocuments = Array.from({ length: 20 }, (_, index) => {
      const label = String(index + 1).padStart(2, '0');
      return createDocument(
        `/workspace/chapter-${label}.md`,
        `Chapter ${label}`,
        `# Chapter ${label}\n\nBody ${label}`,
      );
    });
    const manySummaries = manyDocuments.map(toSummary);
    const scrollIntoView = vi.spyOn(Element.prototype, 'scrollIntoView').mockImplementation(function (
      this: Element,
    ) {
      const tablist = this.closest('.workspace-tabs') as HTMLElement | null;
      if (tablist) {
        tablist.scrollLeft = 240;
      }
    });
    installDokuMock([], manyDocuments);

    renderWorkspace({
      settings: {
        ...DEFAULT_SETTINGS,
        firstRunCompleted: true,
        sessionTabs: manySummaries,
        activeSessionTabId: 'file:/workspace/chapter-20.md',
      },
      initialTabs: manySummaries,
      initialActiveTabId: 'file:/workspace/chapter-20.md',
    });

    await screen.findByRole('tab', { name: 'Chapter 20' });
    const tablist = screen.getByRole('tablist', { name: 'Open documents' });

    await waitFor(() => {
      expect(tablist.scrollLeft).toBeGreaterThan(0);
    });
    expect(scrollIntoView).toHaveBeenCalled();

    fireEvent.keyDown(window, { key: 'Tab', ctrlKey: true });
    expect(screen.getByRole('tab', { name: 'Chapter 01' })).toHaveAttribute('aria-selected', 'true');

    const tab01Item = screen.getByRole('tab', { name: 'Chapter 01' }).closest('.workspace-tabs__item');
    const tab03Item = screen.getByRole('tab', { name: 'Chapter 03' }).closest('.workspace-tabs__item');
    expect(tab01Item).not.toBeNull();
    expect(tab03Item).not.toBeNull();

    const dataTransfer = createDataTransfer();
    fireEvent.dragStart(tab01Item as HTMLElement, { dataTransfer });
    fireEvent.dragOver(tab03Item as HTMLElement, { dataTransfer });
    fireEvent.drop(tab03Item as HTMLElement, { dataTransfer });

    expect(within(tablist).getAllByRole('tab').slice(0, 3).map((tab) => tab.textContent)).toEqual([
      'Chapter 02',
      'Chapter 03',
      'Chapter 01',
    ]);

    scrollIntoView.mockRestore();
  });
});

function renderWorkspace({
  settings = {
    ...DEFAULT_SETTINGS,
    firstRunCompleted: true,
  },
  initialTabs,
  initialActiveTabId = null,
  onUpdate = vi.fn<(patch: SettingsPatch) => Promise<void>>().mockResolvedValue(undefined),
}: {
  settings?: typeof DEFAULT_SETTINGS;
  initialTabs: DocumentSummary[];
  initialActiveTabId?: string | null;
  onUpdate?: (patch: SettingsPatch) => Promise<void>;
}) {
  return render(
    <I18nProvider language="en">
      <ThemeProvider preference="light">
        <Workspace
          settings={settings}
          initialTabs={initialTabs}
          initialActiveTabId={initialActiveTabId}
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

function installDokuMock(
  openFileRequestHandlers: Array<(filePath: string) => void> = [],
  availableDocuments: DocumentSession[] = documents,
): void {
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
        loadDocument: vi.fn(async (summary: DocumentSummary) =>
          findDocument(summary.path, availableDocuments),
        ),
        saveDocument: vi.fn(),
        openMarkdownFile: vi.fn(),
        openDocumentAtPath: vi.fn(async (filePath: string) => {
          const document = findDocument(filePath, availableDocuments);
          return document
            ? {
                document,
                launcher: DEFAULT_SETTINGS.launcher,
              }
            : null;
        }),
        onOpenFileRequest: vi.fn((handler: (filePath: string) => void) => {
          openFileRequestHandlers.push(handler);
          return vi.fn();
        }),
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

function findDocument(path: string | undefined, availableDocuments: DocumentSession[]): DocumentSession | null {
  return availableDocuments.find((document) => document.path === path) ?? null;
}

function createDataTransfer(): DataTransfer {
  const store = new Map<string, string>();
  return {
    dropEffect: 'move',
    effectAllowed: 'move',
    files: [] as unknown as FileList,
    items: [] as unknown as DataTransferItemList,
    types: [],
    clearData: vi.fn((format?: string) => {
      if (format) {
        store.delete(format);
        return;
      }
      store.clear();
    }),
    getData: vi.fn((format: string) => store.get(format) ?? ''),
    setData: vi.fn((format: string, data: string) => {
      store.set(format, data);
    }),
    setDragImage: vi.fn(),
  };
}

function createDocument(path: string, title: string, content: string): DocumentSession {
  return {
    id: path,
    kind: 'file',
    title,
    path,
    content,
    snippet: content.replace(/^#\s*/, '').split('\n')[0] ?? '',
    lastOpenedAt: `2026-04-23T10:0${path.match(/(\d+)\.md$/)?.[1] ?? '0'}:00.000Z`,
    lastSavedAt: '2026-04-23T10:00:00.000Z',
  };
}

function toSummary(document: DocumentSession): DocumentSummary {
  return {
    id: document.id,
    kind: document.kind,
    title: document.title,
    path: document.path,
    snippet: document.snippet,
    lastOpenedAt: document.lastOpenedAt,
  };
}
