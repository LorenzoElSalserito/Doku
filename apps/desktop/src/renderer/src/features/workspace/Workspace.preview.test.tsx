// @vitest-environment jsdom

import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS } from '@doku/schemas';
import {
  installDokuWindow,
  mockScrollMetrics,
  monacoRefState,
  renderWorkspace,
} from './workspaceTestHarness.js';

vi.mock('./MonacoEditor.js', () => import('./workspaceTestMocks.js'));

vi.mock('./MarkdownPreview.js', () => ({
  MarkdownPreview: () => <div data-testid="mock-markdown-preview" />,
}));

describe('Workspace preview', () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    installDokuWindow();
  });

  it('zooms the preview page from the floating zoom bar', async () => {
    const user = userEvent.setup();
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

    const zoomBar = screen.getByRole('group', { name: 'Preview zoom' });
    const valueButton = () => within(zoomBar).getByRole('button', { name: 'Reset zoom' });
    expect(valueButton()).toHaveTextContent('100%');

    await user.click(within(zoomBar).getByRole('button', { name: 'Zoom in' }));

    expect(valueButton()).toHaveTextContent('110%');
    const zoomWrapper = view.container.querySelector('.workspace__preview-zoom');
    expect(zoomWrapper?.getAttribute('style')).toContain('zoom: 1.1');

    // Fixed fit values: width -> 190%, length -> 75%.
    await user.click(within(zoomBar).getByRole('button', { name: 'Fit width' }));
    expect(valueButton()).toHaveTextContent('190%');
    expect(
      view.container.querySelector('.workspace__preview-zoom')?.getAttribute('style'),
    ).toContain('zoom: 1.9');

    await user.click(within(zoomBar).getByRole('button', { name: 'Fit height' }));
    expect(valueButton()).toHaveTextContent('75%');
    expect(
      view.container.querySelector('.workspace__preview-zoom')?.getAttribute('style'),
    ).toContain('zoom: 0.75');
  });

  it('resets zoom on single click and edits it manually on double click', async () => {
    const user = userEvent.setup();
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

    const zoomBar = screen.getByRole('group', { name: 'Preview zoom' });
    await user.click(within(zoomBar).getByRole('button', { name: 'Fit width' }));
    expect(within(zoomBar).getByRole('button', { name: 'Reset zoom' })).toHaveTextContent('190%');

    // Single click restores 100% (after the click-vs-double-click delay).
    await user.click(within(zoomBar).getByRole('button', { name: 'Reset zoom' }));
    await waitFor(() => {
      expect(within(zoomBar).getByRole('button', { name: 'Reset zoom' })).toHaveTextContent('100%');
    });

    // Double click switches to a manual numeric field.
    await user.dblClick(within(zoomBar).getByRole('button', { name: 'Reset zoom' }));
    const field = within(zoomBar).getByRole('spinbutton', { name: 'Preview zoom' });
    await user.clear(field);
    await user.type(field, '150');
    fireEvent.blur(field);

    await waitFor(() => {
      expect(within(zoomBar).getByRole('button', { name: 'Reset zoom' })).toHaveTextContent('150%');
    });
    expect(
      view.container.querySelector('.workspace__preview-zoom')?.getAttribute('style'),
    ).toContain('zoom: 1.5');
  });

  it('inverts the preview colours from the zoom bar and restores them', async () => {
    const user = userEvent.setup();
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

    const zoomBar = screen.getByRole('group', { name: 'Preview zoom' });
    const pane = () => view.container.querySelector('.workspace__editor-pane--preview');
    expect(pane()).not.toHaveClass('workspace__editor-pane--preview-inverted');
    expect(pane()).toHaveAttribute('data-preview-inverted', 'false');

    await user.click(within(zoomBar).getByRole('button', { name: 'Invert preview colours' }));

    expect(pane()).toHaveClass('workspace__editor-pane--preview-inverted');
    expect(pane()).toHaveAttribute('data-preview-inverted', 'true');
    const restoreButton = within(zoomBar).getByRole('button', {
      name: 'Restore preview colours',
    });
    expect(restoreButton).toHaveAttribute('aria-pressed', 'true');

    await user.click(restoreButton);

    expect(pane()).not.toHaveClass('workspace__editor-pane--preview-inverted');
    expect(within(zoomBar).getByRole('button', { name: 'Invert preview colours' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('keeps the invert control out of split view', async () => {
    renderWorkspace({
      settings: {
        ...DEFAULT_SETTINGS,
        firstRunCompleted: true,
        workspaceViewMode: 'split',
      },
    });

    await waitFor(() => {
      expect(window.doku.documents.loadDocument).toHaveBeenCalled();
    });

    expect(
      screen.queryByRole('button', { name: 'Invert preview colours' }),
    ).not.toBeInTheDocument();
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

  it('focuses the preview scroller when entering preview mode so arrow keys scroll the page', async () => {
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

    const splitScroller = view.container.querySelector<HTMLElement>('.workspace__preview-scroll');
    expect(splitScroller).not.toBeNull();
    expect(splitScroller).not.toHaveAttribute('tabindex');

    fireEvent.click(screen.getByRole('tab', { name: 'Preview' }));

    const scroller = view.container.querySelector<HTMLElement>('.workspace__preview-scroll');
    expect(scroller).not.toBeNull();
    expect(scroller).toHaveAttribute('tabindex', '0');
    expect(scroller).toHaveAttribute('role', 'region');
    await waitFor(() => {
      expect(document.activeElement).toBe(scroller);
    });

    // Arrow keys must scroll, not move the view-mode tab selection.
    mockScrollMetrics(scroller!, { clientHeight: 500, scrollHeight: 4000 });
    fireEvent.keyDown(scroller!, { key: 'ArrowDown' });
    expect(scroller!.scrollTop).toBe(48);
    expect(screen.getByRole('tab', { name: 'Preview' })).toHaveAttribute('aria-selected', 'true');

    requestAnimationFrameSpy.mockRestore();
  });

  it('scrolls the preview from the keyboard even when the focus sits on the shell', async () => {
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

    const scroller = view.container.querySelector<HTMLElement>('.workspace__preview-scroll');
    expect(scroller).not.toBeNull();
    mockScrollMetrics(scroller!, { clientHeight: 500, scrollHeight: 4000 });

    // Focus on body: nothing owns the keys, the preview must take them.
    (document.activeElement as HTMLElement | null)?.blur();
    expect(document.activeElement).toBe(document.body);

    const arrowDown = fireEvent.keyDown(document.body, { key: 'ArrowDown' });
    expect(arrowDown).toBe(false); // preventDefault() was called
    expect(scroller!.scrollTop).toBe(48);

    fireEvent.keyDown(document.body, { key: 'PageDown' });
    expect(scroller!.scrollTop).toBe(48 + 450);

    fireEvent.keyDown(document.body, { key: 'End' });
    expect(scroller!.scrollTop).toBe(3500);

    fireEvent.keyDown(document.body, { key: 'ArrowUp' });
    expect(scroller!.scrollTop).toBe(3500 - 48);

    fireEvent.keyDown(document.body, { key: 'Home' });
    expect(scroller!.scrollTop).toBe(0);

    // Focus on a plain toolbar button: still scrolls.
    const saveButton = screen.getByRole('button', { name: 'Save' });
    saveButton.focus();
    fireEvent.keyDown(saveButton, { key: 'ArrowDown' });
    expect(scroller!.scrollTop).toBe(48);
  });

  it('leaves arrow keys to the zoom slider and the zoom input in preview mode', async () => {
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

    const scroller = view.container.querySelector<HTMLElement>('.workspace__preview-scroll');
    expect(scroller).not.toBeNull();
    mockScrollMetrics(scroller!, { clientHeight: 500, scrollHeight: 4000 });

    const slider = view.container.querySelector<HTMLInputElement>(
      '.workspace__preview-zoom-slider',
    );
    expect(slider).not.toBeNull();
    slider!.focus();
    const sliderEvent = fireEvent.keyDown(slider!, { key: 'ArrowDown' });
    expect(sliderEvent).toBe(true); // not prevented: the slider keeps its key
    expect(scroller!.scrollTop).toBe(0);

    fireEvent.doubleClick(screen.getByRole('button', { name: 'Reset zoom' }));
    const zoomInput = await screen.findByRole('spinbutton', { name: 'Preview zoom' });
    zoomInput.focus();
    fireEvent.keyDown(zoomInput, { key: 'ArrowUp' });
    expect(scroller!.scrollTop).toBe(0);

    // The view-mode tab list navigates with arrows too: never hijack it.
    const previewTab = screen.getByRole('tab', { name: 'Preview' });
    previewTab.focus();
    fireEvent.keyDown(previewTab, { key: 'ArrowDown' });
    expect(scroller!.scrollTop).toBe(0);
  });

  it('does not intercept keyboard scrolling outside preview mode', async () => {
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

    const scroller = view.container.querySelector<HTMLElement>('.workspace__preview-scroll');
    expect(scroller).not.toBeNull();
    mockScrollMetrics(scroller!, { clientHeight: 500, scrollHeight: 4000 });

    (document.activeElement as HTMLElement | null)?.blur();
    const result = fireEvent.keyDown(document.body, { key: 'ArrowDown' });
    expect(result).toBe(true);
    expect(scroller!.scrollTop).toBe(0);
  });
});
