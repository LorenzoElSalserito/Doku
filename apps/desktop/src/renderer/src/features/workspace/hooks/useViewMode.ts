import { useCallback, useEffect, useState, type MutableRefObject } from 'react';
import type { SettingsPatch } from '@doku/application';
import type { MonacoEditorHandle } from '../MonacoEditor.js';
import type { ViewMode } from '../workspaceTypes.js';
import { logWorkspaceEvent } from '../workspaceDocuments.js';
import {
  scrollPreviewWithKeyboard,
  shouldPreviewHandleKeyboardScroll,
} from '../previewKeyboardScroll.js';

/**
 * Owns: the write / preview / split mode and the editor ↔ preview scrolling.
 * Exposes: the mode, its change handler (persisted), the split-view scroll
 * sync handlers; installs preview focus and keyboard scrolling in preview mode.
 * Does not: render the panes or own the scroller and editor refs.
 */
export function useViewMode(
  persistedViewMode: ViewMode,
  onUpdate: (patch: SettingsPatch) => Promise<void>,
  previewScrollRef: MutableRefObject<HTMLDivElement | null>,
  monacoEditorRef: MutableRefObject<MonacoEditorHandle | null>,
) {
  const [viewMode, setViewMode] = useState<ViewMode>(persistedViewMode);

  useEffect(() => {
    setViewMode(persistedViewMode);
  }, [persistedViewMode]);

  const handleViewModeChange = useCallback(
    (nextMode: ViewMode) => {
      const shouldRestoreEditorScroll = viewMode !== 'write' && nextMode === 'write';
      setViewMode(nextMode);
      if (shouldRestoreEditorScroll) {
        if (previewScrollRef.current) {
          previewScrollRef.current.scrollTop = 0;
        }

        window.requestAnimationFrame(() => {
          monacoEditorRef.current?.layout();
          monacoEditorRef.current?.focus();
        });
      }
      logWorkspaceEvent('workspace-view-mode-changed', { viewMode: nextMode });
      void onUpdate({ workspaceViewMode: nextMode });
    },
    [monacoEditorRef, onUpdate, previewScrollRef, viewMode],
  );

  const handleEditorScrollChange = useCallback(
    (state: { scrollTop: number; scrollHeight: number; viewportHeight: number }) => {
      if (viewMode !== 'split') {
        return;
      }

      const preview = previewScrollRef.current;
      if (!preview) {
        return;
      }

      const editorScrollableHeight = Math.max(state.scrollHeight - state.viewportHeight, 1);
      const previewScrollableHeight = Math.max(preview.scrollHeight - preview.clientHeight, 0);
      preview.scrollTop = (state.scrollTop / editorScrollableHeight) * previewScrollableHeight;
    },
    [previewScrollRef, viewMode],
  );

  const handlePreviewWheel = useCallback(
    (event: React.WheelEvent<HTMLDivElement>) => {
      if (viewMode !== 'split') {
        return;
      }

      event.preventDefault();
      monacoEditorRef.current?.scrollBy(event.deltaY);
    },
    [monacoEditorRef, viewMode],
  );

  // Entering the full preview hands the keyboard focus to the page scroller.
  // Without this the focus stays on the toolbar tab that was just clicked, and
  // arrow keys would switch view mode instead of scrolling the document.
  useEffect(() => {
    if (viewMode !== 'preview') {
      return undefined;
    }

    const frame = window.requestAnimationFrame(() => {
      const preview = previewScrollRef.current;
      if (!preview) {
        return;
      }
      const active = window.document.activeElement;
      const focusInsideTextField =
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement ||
        (active instanceof HTMLElement && active.isContentEditable);
      if (focusInsideTextField) {
        return;
      }
      preview.focus({ preventScroll: true });
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [previewScrollRef, viewMode]);

  // Keyboard scrolling of the full preview must always work, regardless of
  // which element ended up focused (body, a toolbar button, the page itself).
  // Controls that own their arrow keys (inputs, sliders, tab lists, Monaco,
  // dialogs) are left alone.
  useEffect(() => {
    if (viewMode !== 'preview') {
      return undefined;
    }

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.defaultPrevented) {
        return;
      }
      const preview = previewScrollRef.current;
      if (!preview || !shouldPreviewHandleKeyboardScroll(event.target, preview)) {
        return;
      }
      if (scrollPreviewWithKeyboard(preview, event)) {
        event.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [previewScrollRef, viewMode]);

  return { viewMode, handleViewModeChange, handleEditorScrollChange, handlePreviewWheel };
}
