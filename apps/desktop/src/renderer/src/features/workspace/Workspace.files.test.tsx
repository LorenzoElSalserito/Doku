// @vitest-environment jsdom

import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DocumentSession, DocumentSummary, SettingsPatch } from '@doku/application';
import { DEFAULT_SETTINGS } from '@doku/schemas';
import {
  createImageDropData,
  initialDocument,
  installDokuWindow,
  loadedDocument,
  monacoRefState,
  renderWorkspace,
} from './workspaceTestHarness.js';

vi.mock('./MonacoEditor.js', () => import('./workspaceTestMocks.js'));

vi.mock('./MarkdownPreview.js', () => ({
  MarkdownPreview: () => <div data-testid="mock-markdown-preview" />,
}));

describe('Workspace files and tabs', () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    installDokuWindow();
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

    // The editor module is lazy: wait for it, this test may run first in its file.
    const editors = await screen.findAllByTestId('mock-monaco-editor');
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
      expect(within(view.container).getByLabelText('Markdown editor')).toHaveValue(
        '# Opened from OS',
      );
    });
    expect(screen.getByRole('tab', { name: /chapter-1/i })).toHaveAttribute(
      'aria-selected',
      'false',
    );
    expect(screen.getByRole('tab', { name: /Opened from OS/i })).toHaveAttribute(
      'aria-selected',
      'true',
    );

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
    expect(
      screen.getByRole('button', { name: /Reopen from disk: chapter-1/i }),
    ).toBeInTheDocument();
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
    expect(screen.getByRole('tab', { name: /chapter-1/i })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });
});
