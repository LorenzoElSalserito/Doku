// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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
};

vi.mock('./MonacoEditor.js', async () => {
  const react = await import('react');
  return {
    MonacoEditor: react.forwardRef(function MockMonacoEditor(_props, ref) {
      react.useImperativeHandle(ref, () => monacoRefState);
      return <div data-testid="mock-monaco-editor" />;
    }),
  };
});

vi.mock('./MarkdownPreview.js', () => ({
  MarkdownPreview: () => <div data-testid="mock-markdown-preview" />,
}));

const initialDocument: DocumentSummary = {
  id: '/workspace/chapter-1.md',
  kind: 'file',
  title: 'chapter-1',
  path: '/workspace/chapter-1.md',
  snippet: 'Hello world',
  lastOpenedAt: '2026-04-23T10:00:00.000Z',
};

const loadedDocument: DocumentSession = {
  ...initialDocument,
  content: 'Hello world',
  lastSavedAt: '2026-04-23T10:00:00.000Z',
};

describe('Workspace', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
  });

  it('toggles quick actions and persists the preference', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn<(patch: SettingsPatch) => Promise<void>>().mockResolvedValue(undefined);

    renderWorkspace({
      onUpdate,
      settings: {
        ...DEFAULT_SETTINGS,
        firstRunCompleted: true,
      },
    });

    await waitFor(() => {
      expect(window.doku.documents.loadDocument).toHaveBeenCalled();
    });

    expect(screen.queryByRole('button', { name: 'Bold' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Show quick actions' }));

    expect(onUpdate).toHaveBeenCalledWith({ workspaceQuickActionsVisible: true });
    expect(screen.getByRole('button', { name: 'Bold' })).toBeInTheDocument();
  });

  it('routes quick actions through the monaco imperative API', async () => {
    const user = userEvent.setup();

    renderWorkspace({
      settings: {
        ...DEFAULT_SETTINGS,
        firstRunCompleted: true,
        workspaceQuickActionsVisible: true,
      },
    });

    await waitFor(() => {
      expect(window.doku.documents.loadDocument).toHaveBeenCalled();
    });

    await user.click(screen.getAllByRole('button', { name: 'Bold' })[0]);
    expect(monacoRefState.surroundSelection).toHaveBeenCalledWith({
      before: '**',
      after: '**',
      placeholder: 'bold text',
    });

    const rowsInput = screen.getAllByRole('spinbutton', { name: /rows/i })[0];
    const columnsInput = screen.getAllByRole('spinbutton', { name: /columns/i })[0];

    await user.clear(rowsInput);
    await user.type(rowsInput, '4');
    await user.clear(columnsInput);
    await user.type(columnsInput, '2');
    await user.click(screen.getAllByRole('button', { name: 'Insert table' })[0]);

    expect(monacoRefState.replaceSelection).toHaveBeenCalledWith(
      expect.stringContaining('| Column 1 | Column 2 |'),
      expect.objectContaining({
        selectionStartOffset: 2,
        selectionEndOffset: 10,
      }),
    );
  });

  it('imports a dropped image and inserts the markdown snippet', async () => {
    const importAsset = vi.fn().mockResolvedValue({
      fileName: 'hero-cover.png',
      relativePath: './assets/hero-cover.png',
    });

    Object.defineProperty(window, 'doku', {
      configurable: true,
      value: {
        ...window.doku,
        documents: {
          ...window.doku.documents,
          importAsset,
        },
      },
    });

    renderWorkspace({
      settings: {
        ...DEFAULT_SETTINGS,
        firstRunCompleted: true,
      },
    });

    await waitFor(() => {
      expect(window.doku.documents.loadDocument).toHaveBeenCalled();
    });

    const editors = screen.getAllByTestId('mock-monaco-editor');
    const editorPane = editors[editors.length - 1]?.closest('section');
    expect(editorPane).not.toBeNull();

    fireEvent.drop(editorPane as HTMLElement, {
      dataTransfer: createImageDropData('/workspace/assets/raw/hero-cover.png'),
    });

    await waitFor(() => {
      expect(importAsset).toHaveBeenCalledWith({
        documentPath: '/workspace/chapter-1.md',
        sourcePath: '/workspace/assets/raw/hero-cover.png',
        strategy: 'project-assets',
      });
    });

    expect(monacoRefState.insertText).toHaveBeenCalledWith(
      '![hero cover](./assets/hero-cover.png)',
    );
    expect(screen.getByText('Image added: hero-cover.png')).toBeInTheDocument();
  });

  it('creates a markdown file from the workspace explorer and opens it', async () => {
    const user = userEvent.setup();
    const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('chapter-2');
    const createWorkspaceFile = vi.fn().mockResolvedValue({
      path: '/workspace/chapter-2.md',
      kind: 'markdown',
    });
    const openDocumentAtPath = vi.fn().mockResolvedValue({
      document: {
        ...loadedDocument,
        id: '/workspace/chapter-2.md',
        title: 'chapter-2',
        path: '/workspace/chapter-2.md',
        content: '',
      },
      launcher: DEFAULT_SETTINGS.launcher,
    });

    Object.defineProperty(window, 'doku', {
      configurable: true,
      value: {
        ...window.doku,
        documents: {
          ...window.doku.documents,
          createWorkspaceFile,
          openDocumentAtPath,
          listWorkspaceTree: vi.fn().mockResolvedValue([
            {
              name: 'chapter-1.md',
              path: '/workspace/chapter-1.md',
              kind: 'markdown',
            },
          ]),
        },
      },
    });

    renderWorkspace({
      settings: {
        ...DEFAULT_SETTINGS,
        firstRunCompleted: true,
        workspace: {
          ...DEFAULT_SETTINGS.workspace,
          leftPanelCollapsed: false,
        },
      },
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'New file' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'New file' }));

    expect(createWorkspaceFile).toHaveBeenCalledWith('/workspace/chapter-1.md', 'chapter-2');
    await waitFor(() => {
      expect(openDocumentAtPath).toHaveBeenCalledWith('/workspace/chapter-2.md');
    });

    promptSpy.mockRestore();
  });
});

function renderWorkspace({
  settings = DEFAULT_SETTINGS,
  onUpdate = vi.fn<(patch: SettingsPatch) => Promise<void>>().mockResolvedValue(undefined),
}: {
  settings?: typeof DEFAULT_SETTINGS;
  onUpdate?: (patch: SettingsPatch) => Promise<void>;
}) {
  return render(
    <I18nProvider language="en">
      <ThemeProvider preference="light">
        <Workspace
          settings={settings}
          initialDocument={initialDocument}
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

function createImageDropData(path: string) {
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
