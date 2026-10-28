// @vitest-environment jsdom

import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SettingsPatch } from '@doku/application';
import { DEFAULT_SETTINGS } from '@doku/schemas';
import { installDokuWindow, monacoRefState, renderWorkspace } from './workspaceTestHarness.js';

vi.mock('./MonacoEditor.js', () => import('./workspaceTestMocks.js'));

vi.mock('./MarkdownPreview.js', () => ({
  MarkdownPreview: () => <div data-testid="mock-markdown-preview" />,
}));

describe('Workspace chrome', () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    installDokuWindow();
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

  it('toggles immersive reading mode on the preview pane', async () => {
    const user = userEvent.setup();

    const view = renderWorkspace({
      settings: {
        ...DEFAULT_SETTINGS,
        firstRunCompleted: true,
      },
    });

    await waitFor(() => {
      expect(window.doku.documents.loadDocument).toHaveBeenCalled();
    });

    const root = view.container.querySelector('.workspace');
    expect(root).not.toBeNull();
    expect(root).not.toHaveClass('workspace--immersive');

    await user.click(await screen.findByRole('button', { name: 'Immersive mode' }));

    expect(root).toHaveClass('workspace--immersive');
    expect(screen.getByRole('button', { name: 'Exit immersive mode' })).toBeInTheDocument();

    await user.keyboard('{Escape}');

    expect(root).not.toHaveClass('workspace--immersive');
    expect(screen.getByRole('button', { name: 'Immersive mode' })).toBeInTheDocument();
  });

  it('applies content colors from the quick actions popover', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn<(patch: SettingsPatch) => Promise<void>>().mockResolvedValue(undefined);

    const view = renderWorkspace({
      onUpdate,
      settings: {
        ...DEFAULT_SETTINGS,
        firstRunCompleted: true,
        workspaceQuickActionsVisible: true,
      },
    });

    await waitFor(() => {
      expect(window.doku.documents.loadDocument).toHaveBeenCalled();
    });

    await user.click(screen.getByRole('button', { name: 'Colors' }));

    const popover = screen.getByRole('dialog', { name: 'Content colors' });
    fireEvent.change(within(popover).getByLabelText('Links'), {
      target: { value: '#ff0000' },
    });

    expect(onUpdate).toHaveBeenCalledWith({
      contentColors: { link: '#FF0000', heading: null, code: null, quote: null },
    });

    const previewPane = view.container.querySelector('.workspace__editor-pane--preview');
    expect(previewPane?.getAttribute('style')).toContain('--content-color-link: #FF0000');
  });

  it('separates panel toggles and the view switcher into distinct button groups', async () => {
    const view = renderWorkspace({
      settings: {
        ...DEFAULT_SETTINGS,
        firstRunCompleted: true,
      },
    });

    await waitFor(() => {
      expect(window.doku.documents.loadDocument).toHaveBeenCalled();
    });

    const panelsGroup = view.container.querySelector('.workspace__action-group--panels');
    const viewGroup = view.container.querySelector('.workspace__action-group--view');
    expect(panelsGroup).not.toBeNull();
    expect(viewGroup).not.toBeNull();
    // The old combined layout group (panels + nested view sub-group) is gone.
    expect(view.container.querySelector('.workspace__action-group--layout')).toBeNull();
    // The view switcher lives only in the view group.
    expect(
      (viewGroup as HTMLElement).querySelectorAll('.doku-segmented__option').length,
    ).toBeGreaterThan(0);
    expect((panelsGroup as HTMLElement).querySelectorAll('.doku-segmented__option').length).toBe(0);
  });

  it('renders document tabs in the header with scroll navigation hidden until overflow', async () => {
    const view = renderWorkspace({
      settings: {
        ...DEFAULT_SETTINGS,
        firstRunCompleted: true,
      },
    });

    await waitFor(() => {
      expect(window.doku.documents.loadDocument).toHaveBeenCalled();
    });

    await screen.findByRole('tab', { name: 'chapter-1' });

    const header = view.container.querySelector('.workspace__header');
    const tablist = screen.getByRole('tablist', { name: 'Open documents' });
    expect(header?.contains(tablist)).toBe(true);

    // The editor card no longer hosts the tab strip.
    const editorCard = view.container.querySelector('.workspace__editor-card');
    expect(editorCard?.querySelector('[role="tablist"]')).toBeNull();

    // Scroll arrows exist but stay hidden while the tabs fit.
    const navButtons = view.container.querySelectorAll('.workspace-tabs__nav');
    expect(navButtons.length).toBe(2);
    navButtons.forEach((button) => {
      expect(button).toHaveAttribute('hidden');
    });
  });

  it('offers the immersive toggle in write view without the zoom bar', async () => {
    renderWorkspace({
      settings: {
        ...DEFAULT_SETTINGS,
        firstRunCompleted: true,
        workspaceViewMode: 'write',
      },
    });

    await waitFor(() => {
      expect(window.doku.documents.loadDocument).toHaveBeenCalled();
    });

    expect(await screen.findByRole('button', { name: 'Immersive mode' })).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Preview zoom' })).not.toBeInTheDocument();
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
});
