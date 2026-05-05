// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  beforeEach(() => {
    vi.clearAllMocks();
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

  it('uses the print-page preview layout without rendering Monaco in preview mode', async () => {
    const view = renderWorkspace({
      settings: {
        ...DEFAULT_SETTINGS,
        firstRunCompleted: true,
        workspaceViewMode: 'preview',
      },
    });

    await waitFor(() => {
      expect(window.doku.documents.loadDocument).toHaveBeenCalled();
    });

    expect(within(view.container).queryByLabelText('Markdown editor')).not.toBeInTheDocument();
    const previewPane = view.container.querySelector('.workspace__editor-pane--preview');
    expect(previewPane).toHaveClass('workspace__editor-pane--preview-page');
  });

  it('resets preview scroll and relayouts Monaco when switching from split to write mode', async () => {
    const requestAnimationFrameSpy = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((callback) => {
        callback(0);
        return 1;
      });

    const view = renderWorkspace({
      settings: {
        ...DEFAULT_SETTINGS,
        firstRunCompleted: true,
        workspaceViewMode: 'split',
      },
    });

    await waitFor(() => {
      expect(window.doku.documents.loadDocument).toHaveBeenCalled();
    });

    const previewScroll = view.container.querySelector<HTMLElement>('.workspace__preview-scroll');
    expect(previewScroll).not.toBeNull();
    if (previewScroll) {
      previewScroll.scrollTop = 120;
    }

    fireEvent.click(screen.getByRole('tab', { name: 'Write' }));

    expect(previewScroll?.scrollTop).toBe(0);
    expect(monacoRefState.layout).toHaveBeenCalled();
    expect(monacoRefState.focus).toHaveBeenCalled();

    requestAnimationFrameSpy.mockRestore();
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

  it('opens a markdown file requested by the operating system in a new tab', async () => {
    const onUpdate = vi.fn<(patch: SettingsPatch) => Promise<void>>().mockResolvedValue(undefined);
    const openFileRequestHandlers: Array<(filePath: string) => void> = [];
    const openedDocument: DocumentSession = {
      id: '/workspace/from-double-click.md',
      kind: 'file',
      title: 'from-double-click',
      path: '/workspace/from-double-click.md',
      content: '# Opened from OS',
      snippet: 'Opened from OS',
      lastOpenedAt: '2026-04-23T10:02:00.000Z',
      lastSavedAt: '2026-04-23T10:02:00.000Z',
    };
    const openDocumentAtPath = vi.fn().mockResolvedValue({
      document: openedDocument,
      launcher: {
        recentDocuments: [
          {
            id: openedDocument.id,
            kind: openedDocument.kind,
            title: openedDocument.title,
            path: openedDocument.path,
            snippet: openedDocument.snippet,
            lastOpenedAt: openedDocument.lastOpenedAt,
          },
        ],
        quickResumeId: openedDocument.id,
      },
    });
    const loadDocument = vi.fn(async (summary: DocumentSummary) =>
      summary.path === openedDocument.path ? openedDocument : loadedDocument,
    );

    Object.defineProperty(window, 'doku', {
      configurable: true,
      value: {
        ...window.doku,
        documents: {
          ...window.doku.documents,
          loadDocument,
          openDocumentAtPath,
          onOpenFileRequest: vi.fn((handler: (filePath: string) => void) => {
            openFileRequestHandlers.push(handler);
            return vi.fn();
          }),
        },
      },
    });

    const view = renderWorkspace({
      onUpdate,
      settings: {
        ...DEFAULT_SETTINGS,
        firstRunCompleted: true,
      },
    });

    await waitFor(() => {
      expect(window.doku.documents.loadDocument).toHaveBeenCalled();
    });

    expect(openFileRequestHandlers).toHaveLength(1);
    openFileRequestHandlers[0]?.('/workspace/from-double-click.md');

    await waitFor(() => {
      expect(openDocumentAtPath).toHaveBeenCalledWith('/workspace/from-double-click.md');
    });
    await waitFor(() => {
      expect(within(view.container).getByLabelText('Markdown editor')).toHaveValue('# Opened from OS');
    });
    expect(screen.getByRole('tab', { name: /chapter-1/i })).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('tab', { name: /Opened from OS/i })).toHaveAttribute('aria-selected', 'true');

    await userEvent.click(screen.getByRole('tab', { name: /chapter-1/i }));

    expect(within(view.container).getByLabelText('Markdown editor')).toHaveValue('Hello world');
    expect(onUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        launcher: expect.objectContaining({
          quickResumeId: '/workspace/from-double-click.md',
        }),
      }),
    );
  });

  it('focuses an already open markdown tab instead of reopening or overwriting it', async () => {
    const openFileRequestHandlers: Array<(filePath: string) => void> = [];
    const openedDocument: DocumentSession = {
      id: '/workspace/reused.md',
      kind: 'file',
      title: 'reused',
      path: '/workspace/reused.md',
      content: '# Reused',
      snippet: 'Reused',
      lastOpenedAt: '2026-04-23T10:02:00.000Z',
      lastSavedAt: '2026-04-23T10:02:00.000Z',
    };
    const openDocumentAtPath = vi.fn().mockResolvedValue({
      document: openedDocument,
      launcher: DEFAULT_SETTINGS.launcher,
    });

    Object.defineProperty(window, 'doku', {
      configurable: true,
      value: {
        ...window.doku,
        documents: {
          ...window.doku.documents,
          openDocumentAtPath,
          onOpenFileRequest: vi.fn((handler: (filePath: string) => void) => {
            openFileRequestHandlers.push(handler);
            return vi.fn();
          }),
        },
      },
    });

    const view = renderWorkspace({
      settings: {
        ...DEFAULT_SETTINGS,
        firstRunCompleted: true,
      },
    });

    await waitFor(() => {
      expect(window.doku.documents.loadDocument).toHaveBeenCalled();
    });

    openFileRequestHandlers[0]?.('/workspace/reused.md');
    await waitFor(() => {
      expect(within(view.container).getByLabelText('Markdown editor')).toHaveValue('# Reused');
    });

    await userEvent.click(screen.getByRole('tab', { name: /chapter-1/i }));
    expect(within(view.container).getByLabelText('Markdown editor')).toHaveValue('Hello world');

    openFileRequestHandlers[0]?.('/workspace/reused.md');

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /Reused/i })).toHaveAttribute('aria-selected', 'true');
    });
    expect(openDocumentAtPath).toHaveBeenCalledTimes(1);
    expect(within(view.container).getByLabelText('Markdown editor')).toHaveValue('# Reused');
  });

  it('keeps a missing document as an errored tab until it is reopened or closed', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn<(patch: SettingsPatch) => Promise<void>>().mockResolvedValue(undefined);
    const loadDocument = vi.fn().mockResolvedValue(null);
    const openMarkdownFile = vi.fn().mockResolvedValue({
      document: loadedDocument,
      launcher: DEFAULT_SETTINGS.launcher,
    });

    Object.defineProperty(window, 'doku', {
      configurable: true,
      value: {
        ...window.doku,
        documents: {
          ...window.doku.documents,
          loadDocument,
          openMarkdownFile,
        },
      },
    });

    renderWorkspace({
      onUpdate,
      settings: {
        ...DEFAULT_SETTINGS,
        firstRunCompleted: true,
        launcher: {
          recentDocuments: [initialDocument],
          quickResumeId: initialDocument.id,
        },
      },
      initialDocument,
    });

    await screen.findByRole('tab', { name: /chapter-1/i });
    expect(screen.getByRole('alert')).toHaveTextContent('The file is no longer available on disk.');
    expect(screen.queryByLabelText('Markdown editor')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Reopen from disk: chapter-1/i })).toBeInTheDocument();
    expect(onUpdate).toHaveBeenCalledWith({
      launcher: {
        recentDocuments: [],
        quickResumeId: null,
      },
    });

    await user.click(screen.getByRole('button', { name: /Reopen from disk: chapter-1/i }));

    await waitFor(() => {
      expect(openMarkdownFile).toHaveBeenCalled();
    });
    expect(await screen.findByLabelText('Markdown editor')).toHaveValue('Hello world');
    expect(screen.getByRole('tab', { name: /chapter-1/i })).toHaveAttribute('aria-selected', 'true');
  });

  it('shows the default-app prompt once with do-not-ask-again enabled by default', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn<(patch: SettingsPatch) => Promise<void>>().mockResolvedValue(undefined);
    const saveDocument = vi.fn().mockResolvedValue({
      document: loadedDocument,
      launcher: DEFAULT_SETTINGS.launcher,
    });

    Object.defineProperty(window, 'doku', {
      configurable: true,
      value: {
        ...window.doku,
        documents: {
          ...window.doku.documents,
          saveDocument,
        },
      },
    });

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

    await user.click(screen.getAllByRole('button', { name: 'Save' }).at(-1) as HTMLElement);

    const dontAskAgain = await screen.findByRole('checkbox', { name: 'Do not ask again' });
    expect(dontAskAgain).toBeChecked();

    await user.click(screen.getByRole('button', { name: 'Not now' }));

    expect(onUpdate).toHaveBeenCalledWith({
      defaultMarkdownAppPrompt: {
        shown: true,
        dismissed: true,
      },
    });
  });

  it('does not show the default-app prompt after it has been dismissed', async () => {
    const user = userEvent.setup();
    const saveDocument = vi.fn().mockResolvedValue({
      document: loadedDocument,
      launcher: DEFAULT_SETTINGS.launcher,
    });

    Object.defineProperty(window, 'doku', {
      configurable: true,
      value: {
        ...window.doku,
        documents: {
          ...window.doku.documents,
          saveDocument,
        },
      },
    });

    renderWorkspace({
      settings: {
        ...DEFAULT_SETTINGS,
        firstRunCompleted: true,
        defaultMarkdownAppPrompt: {
          shown: true,
          dismissed: true,
        },
      },
    });

    await waitFor(() => {
      expect(window.doku.documents.loadDocument).toHaveBeenCalled();
    });

    await user.click(screen.getAllByRole('button', { name: 'Save' }).at(-1) as HTMLElement);

    await waitFor(() => {
      expect(saveDocument).toHaveBeenCalled();
    });
    expect(
      screen.queryByRole('dialog', { name: 'Set Doku as the default app for .md files' }),
    ).not.toBeInTheDocument();
  });

  it('keeps editing the same local draft after autosave updates launcher state', async () => {
    const onUpdate = vi.fn<(patch: SettingsPatch) => Promise<void>>().mockResolvedValue(undefined);
    const saveDocument = vi.fn().mockImplementation(async (input) => {
      const now = '2026-04-23T10:01:00.000Z';
      return {
        document: {
          id: input.id,
          kind: input.kind,
          title: input.title,
          path: input.path,
          content: input.content,
          snippet: input.content,
          lastOpenedAt: now,
          lastSavedAt: null,
        },
        launcher: {
          recentDocuments: [
            {
              id: input.id,
              kind: input.kind,
              title: input.title,
              path: input.path,
              snippet: input.content,
              lastOpenedAt: now,
            },
          ],
          quickResumeId: input.id,
        },
      };
    });

    Object.defineProperty(window, 'doku', {
      configurable: true,
      value: {
        ...window.doku,
        documents: {
          ...window.doku.documents,
          saveDocument,
        },
      },
    });

    const settings = {
      ...DEFAULT_SETTINGS,
      firstRunCompleted: true,
    };
    const view = renderWorkspace({
      initialDocument: null,
      onUpdate,
      settings,
    });

    const editor = await within(view.container).findByLabelText('Markdown editor');
    vi.useFakeTimers();
    fireEvent.change(editor, { target: { value: 'first paragraph' } });

    await vi.advanceTimersByTimeAsync(950);

    expect(saveDocument).toHaveBeenCalledTimes(1);

    const firstAutosaveInput = saveDocument.mock.calls[0]?.[0];
    expect(firstAutosaveInput).toEqual(
      expect.objectContaining({
        id: expect.stringMatching(/^draft:/),
        kind: 'draft',
        content: 'first paragraph',
        mode: 'autosave',
      }),
    );

    view.rerender(
      <I18nProvider language="en">
        <ThemeProvider preference="light">
          <Workspace
            settings={{
              ...settings,
              launcher: {
                recentDocuments: [
                  {
                    id: firstAutosaveInput.id,
                    kind: 'draft',
                    title: 'Untitled document',
                    snippet: 'first paragraph',
                    lastOpenedAt: '2026-04-23T10:01:00.000Z',
                  },
                ],
                quickResumeId: firstAutosaveInput.id,
              },
            }}
            initialTabs={[]}
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

    expect(within(view.container).getByLabelText('Markdown editor')).toHaveValue('first paragraph');

    fireEvent.change(within(view.container).getByLabelText('Markdown editor'), {
      target: { value: 'second paragraph' },
    });
    await vi.advanceTimersByTimeAsync(950);

    expect(saveDocument).toHaveBeenCalledTimes(2);

    expect(saveDocument.mock.calls[1]?.[0]).toEqual(
      expect.objectContaining({
        id: firstAutosaveInput.id,
        kind: 'draft',
        content: 'second paragraph',
        mode: 'autosave',
      }),
    );
    expect(within(view.container).getByLabelText('Markdown editor')).toHaveValue('second paragraph');
  });

  it('exports using the markdown heading instead of the untitled placeholder', async () => {
    const user = userEvent.setup();
    const onOpenExport = vi.fn();

    const view = render(
      <I18nProvider language="en">
        <ThemeProvider preference="light">
          <Workspace
            settings={{
              ...DEFAULT_SETTINGS,
              firstRunCompleted: true,
            }}
            initialTabs={[]}
            initialActiveTabId={null}
            onUpdate={vi.fn().mockResolvedValue(undefined)}
            onOpenSettings={vi.fn()}
            onOpenInfo={vi.fn()}
            onOpenGuide={vi.fn()}
            onOpenExport={onOpenExport}
          />
        </ThemeProvider>
      </I18nProvider>,
    );

    const editor = (await screen.findAllByLabelText('Markdown editor')).at(-1);
    expect(editor).toBeTruthy();
    fireEvent.change(editor as HTMLElement, { target: { value: '# Editorial Title\n\nBody copy' } });

    await user.click(screen.getAllByRole('button', { name: 'Export' }).at(-1) as HTMLElement);

    expect(onOpenExport).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Editorial Title',
        content: '# Editorial Title\n\nBody copy',
      }),
    );
  });

  it('shows only the full document title in the top navigation', async () => {
    const longTitle = 'A very long chapter title that should stay readable in the top navigation and wrap before the command area';
    const longDocument: DocumentSession = {
      ...loadedDocument,
      title: longTitle,
      content: `# ${longTitle}\n\nBody copy`,
    };

    Object.defineProperty(window, 'doku', {
      configurable: true,
      value: {
        ...window.doku,
        documents: {
          ...window.doku.documents,
          loadDocument: vi.fn().mockResolvedValue(longDocument),
        },
      },
    });

    const view = render(
      <I18nProvider language="en">
        <ThemeProvider preference="light">
          <Workspace
            settings={{
              ...DEFAULT_SETTINGS,
              firstRunCompleted: true,
            }}
            initialTabs={[{
              ...initialDocument,
              title: longTitle,
            }]}
            initialActiveTabId={null}
            onUpdate={vi.fn().mockResolvedValue(undefined)}
            onOpenSettings={vi.fn()}
            onOpenInfo={vi.fn()}
            onOpenGuide={vi.fn()}
            onOpenExport={vi.fn()}
          />
        </ThemeProvider>
      </I18nProvider>,
    );

    await screen.findByRole('tab', { name: longTitle });
    const titleLabel = view.container.querySelector('.workspace__document-heading');
    expect(titleLabel).not.toBeNull();
    expect(titleLabel).toHaveClass('workspace__document-heading');
    expect(titleLabel).toHaveAttribute('title', longTitle);
    expect(screen.queryByText('Home')).not.toBeInTheDocument();
    expect(screen.queryByText('Workspace')).not.toBeInTheDocument();
    expect(screen.queryByText('Markdown file')).not.toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Saved' })).toHaveClass('workspace__save-indicator');
    expect(screen.queryByLabelText('Document title')).not.toBeInTheDocument();
  });
});

function renderWorkspace({
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
