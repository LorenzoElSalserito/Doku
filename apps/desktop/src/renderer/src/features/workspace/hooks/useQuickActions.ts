import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type MutableRefObject,
} from 'react';
import type { ContentColors, Settings, SettingsPatch } from '@doku/application';
import type { MonacoEditorHandle } from '../MonacoEditor.js';
import { MARKDOWN_ACTION_SPECS, buildMarkdownTable } from '../markdownActions.js';
import type { ViewMode } from '../workspaceTypes.js';
import { logWorkspaceEvent } from '../workspaceDocuments.js';

interface QuickActionsOptions {
  settings: Settings;
  viewMode: ViewMode;
  onUpdate: (patch: SettingsPatch) => Promise<void>;
  monacoEditorRef: MutableRefObject<MonacoEditorHandle | null>;
}

/**
 * Owns: the quick actions bar (visibility, Markdown actions, table size) and
 * the content colours applied to the preview.
 * Exposes: the bar state, its handlers and the preview colour style.
 * Does not: edit text itself; it goes through the editor imperative handle.
 */
export function useQuickActions({
  settings,
  viewMode,
  onUpdate,
  monacoEditorRef,
}: QuickActionsOptions) {
  const [quickActionsVisible, setQuickActionsVisible] = useState(
    settings.workspaceQuickActionsVisible,
  );
  const [contentColors, setContentColors] = useState<ContentColors>(settings.contentColors);
  const [tableRows, setTableRows] = useState('2');
  const [tableColumns, setTableColumns] = useState('3');

  useEffect(() => {
    setQuickActionsVisible(settings.workspaceQuickActionsVisible);
  }, [settings.workspaceQuickActionsVisible]);

  useEffect(() => {
    setContentColors(settings.contentColors);
  }, [settings.contentColors]);

  const toggleQuickActions = useCallback(() => {
    const nextVisible = !quickActionsVisible;
    setQuickActionsVisible(nextVisible);
    logWorkspaceEvent('workspace-quick-actions-toggled', { visible: nextVisible });
    void onUpdate({ workspaceQuickActionsVisible: nextVisible });
  }, [onUpdate, quickActionsVisible]);

  const handleContentColorsChange = useCallback(
    (next: ContentColors) => {
      setContentColors(next);
      logWorkspaceEvent('workspace-content-colors-changed', {
        link: next.link,
        heading: next.heading,
        code: next.code,
        quote: next.quote,
      });
      void onUpdate({ contentColors: next });
    },
    [onUpdate],
  );

  const contentColorStyle = useMemo<CSSProperties>(() => {
    const style: Record<string, string> = {};
    if (contentColors.link) {
      style['--content-color-link'] = contentColors.link;
    }
    if (contentColors.heading) {
      style['--content-color-heading'] = contentColors.heading;
    }
    if (contentColors.code) {
      style['--content-color-code-bg'] = contentColors.code;
    }
    if (contentColors.quote) {
      style['--content-color-quote-bg'] = contentColors.quote;
    }
    return style as CSSProperties;
  }, [contentColors]);

  const handleMarkdownAction = useCallback(
    (actionId: (typeof MARKDOWN_ACTION_SPECS)[number]['id']) => {
      if (viewMode === 'preview') {
        return;
      }

      const action = MARKDOWN_ACTION_SPECS.find((item) => item.id === actionId);
      if (!action) {
        return;
      }

      if (action.kind === 'surround') {
        logWorkspaceEvent('markdown-action-used', { actionId });
        monacoEditorRef.current?.surroundSelection({
          before: action.before ?? '',
          after: action.after ?? '',
          placeholder: action.placeholder ?? '',
        });
        return;
      }

      logWorkspaceEvent('markdown-action-used', { actionId });
      monacoEditorRef.current?.replaceSelection(action.text ?? '', {
        selectionStartOffset: action.selectionStartOffset,
        selectionEndOffset: action.selectionEndOffset,
      });
    },
    [monacoEditorRef, viewMode],
  );

  const handleInsertTable = useCallback(() => {
    if (viewMode === 'preview') {
      return;
    }

    const rows = Number.parseInt(tableRows, 10);
    const columns = Number.parseInt(tableColumns, 10);
    const snippet = buildMarkdownTable(
      Number.isFinite(rows) ? rows : 2,
      Number.isFinite(columns) ? columns : 3,
    );
    logWorkspaceEvent('markdown-table-inserted', { rows, columns });
    monacoEditorRef.current?.replaceSelection(snippet, {
      selectionStartOffset: 2,
      selectionEndOffset: 10,
    });
  }, [monacoEditorRef, tableColumns, tableRows, viewMode]);

  return {
    quickActionsVisible,
    toggleQuickActions,
    contentColors,
    contentColorStyle,
    handleContentColorsChange,
    handleMarkdownAction,
    handleInsertTable,
    tableRows,
    tableColumns,
    setTableRows,
    setTableColumns,
  };
}

export type QuickActionsControls = ReturnType<typeof useQuickActions>;
