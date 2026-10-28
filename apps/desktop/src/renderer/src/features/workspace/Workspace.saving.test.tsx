// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeProvider } from '@doku/ui';
import type { DocumentSession, SettingsPatch } from '@doku/application';
import { DEFAULT_SETTINGS } from '@doku/schemas';
import { I18nProvider } from '../../i18n/I18nProvider.js';
import { Workspace } from './Workspace.js';
import {
  initialDocument,
  installDokuWindow,
  loadedDocument,
  renderWorkspace,
} from './workspaceTestHarness.js';

vi.mock('./MonacoEditor.js', () => import('./workspaceTestMocks.js'));

vi.mock('./MarkdownPreview.js', () => ({
  MarkdownPreview: () => <div data-testid="mock-markdown-preview" />,
}));

describe('Workspace saving', () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    installDokuWindow();
  });

  it('keeps a newly created draft in one tab after autosave', async () => {
    const saveDocument = vi.fn(
      async (input: {
        id: string;
        kind: 'draft' | 'file';
        title: string;
        content: string;
        path?: string;
      }) => ({
        document: {
          id: input.id,
          kind: input.kind,
          title: input.title,
          path: input.path,
          content: input.content,
          snippet: input.content,
          lastOpenedAt: '2026-04-23T10:03:00.000Z',
          lastSavedAt: null,
        },
        launcher: DEFAULT_SETTINGS.launcher,
      }),
    );

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

    const view = renderWorkspace({
      settings: {
        ...DEFAULT_SETTINGS,
        firstRunCompleted: true,
      },
    });

    await waitFor(() => {
      expect(window.doku.documents.loadDocument).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole('button', { name: 'File' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'New document' }));

    await screen.findByRole('tab', { name: 'Untitled document' });
    const tablist = screen.getByRole('tablist', { name: 'Open documents' });
    expect(
      within(tablist)
        .getAllByRole('tab')
        .map((tab) => tab.textContent),
    ).toEqual(['chapter-1', 'Untitled document']);

    fireEvent.change(within(view.container).getByLabelText('Markdown editor'), {
      target: { value: 'body without heading' },
    });

    await waitFor(
      () => {
        expect(saveDocument).toHaveBeenCalledWith(
          expect.objectContaining({
            kind: 'draft',
            title: 'Untitled document',
            mode: 'autosave',
          }),
        );
      },
      { timeout: 2000 },
    );
    expect(
      within(tablist)
        .getAllByRole('tab')
        .map((tab) => tab.textContent),
    ).toEqual(['chapter-1', 'Untitled document']);
    expect(screen.queryByRole('tab', { name: 'document' })).not.toBeInTheDocument();
  });

  it('creates a new empty document with the primary-modifier N shortcut', async () => {
    renderWorkspace({
      settings: {
        ...DEFAULT_SETTINGS,
        firstRunCompleted: true,
      },
    });

    await waitFor(() => {
      expect(window.doku.documents.loadDocument).toHaveBeenCalled();
    });

    fireEvent.keyDown(window, { key: 'n', ctrlKey: true });

    await screen.findByRole('tab', { name: 'Untitled document' });
    expect(screen.getByRole('tab', { name: 'Untitled document' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByLabelText('Markdown editor')).toHaveValue('');
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
    expect(within(view.container).getByLabelText('Markdown editor')).toHaveValue(
      'second paragraph',
    );
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
    fireEvent.change(editor as HTMLElement, {
      target: { value: '# Editorial Title\n\nBody copy' },
    });

    await user.click(screen.getAllByRole('button', { name: 'Export' }).at(-1) as HTMLElement);

    expect(onOpenExport).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Editorial Title',
        content: '# Editorial Title\n\nBody copy',
      }),
    );
  });

  it('shows only the full document title in the top navigation', async () => {
    const longTitle =
      'A very long chapter title that should stay readable in the top navigation and wrap before the command area';
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
            initialTabs={[
              {
                ...initialDocument,
                title: longTitle,
              },
            ]}
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

    const activeTab = await screen.findByRole('tab', { name: longTitle });
    // The standalone header heading was removed: the document title now lives
    // only in the active tab box at the top of the editor.
    expect(activeTab).toHaveAttribute('aria-selected', 'true');
    expect(activeTab).toHaveAttribute('title', longTitle);
    expect(view.container.querySelector('.workspace__document-heading')).toBeNull();
    expect(screen.queryByText('Home')).not.toBeInTheDocument();
    expect(screen.queryByText('Workspace')).not.toBeInTheDocument();
    expect(screen.queryByText('Markdown file')).not.toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Saved' })).toHaveClass('workspace__save-indicator');
    expect(screen.queryByLabelText('Document title')).not.toBeInTheDocument();
  });
});
