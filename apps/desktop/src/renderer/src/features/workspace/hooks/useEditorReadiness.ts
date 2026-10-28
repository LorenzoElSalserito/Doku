import { useCallback, useEffect, useRef, useState } from 'react';
import {
  MONACO_READY_TIMEOUT_MS,
  type EditorReadiness,
  type ViewMode,
  type WorkspaceDocumentTab,
} from '../workspaceTypes.js';
import { logWorkspaceEvent } from '../workspaceDocuments.js';

interface EditorReadinessOptions {
  hasDocument: boolean;
  viewMode: ViewMode;
  tabs: WorkspaceDocumentTab[];
  activeTabId: string | null;
  sessionRestoreComplete: boolean;
  onReady?: (context?: Record<string, unknown>) => void;
}

/**
 * Owns: Monaco start-up tracking, the plain-text fallback switch and the
 * one-shot "workspace ready" signal.
 * Exposes: `safeMode`, `plainTextFallbackEnabled` and the Monaco ready/error
 * callbacks.
 * Does not: render either editor.
 */
export function useEditorReadiness({
  hasDocument,
  viewMode,
  tabs,
  activeTabId,
  sessionRestoreComplete,
  onReady,
}: EditorReadinessOptions) {
  const safeMode = window.doku.system.safeMode;
  const [editorReadiness, setEditorReadiness] = useState<EditorReadiness>(() =>
    window.doku.system.safeMode ? 'fallback' : 'pending',
  );
  const [plainTextFallbackEnabled, setPlainTextFallbackEnabled] = useState(
    window.doku.system.safeMode,
  );
  const readinessLoggedRef = useRef(false);
  const editorReadinessLoggedRef = useRef(false);

  const editorPaneRequiresMonaco =
    !safeMode &&
    !plainTextFallbackEnabled &&
    hasDocument &&
    (viewMode === 'write' || viewMode === 'split');

  useEffect(() => {
    if (!editorPaneRequiresMonaco || editorReadiness !== 'pending') {
      return undefined;
    }

    logWorkspaceEvent('monaco-editor-ready-timeout-armed', {
      timeoutMs: MONACO_READY_TIMEOUT_MS,
      activeTabId,
      viewMode,
    });
    const timeout = window.setTimeout(() => {
      logWorkspaceEvent('monaco-editor-ready-timeout', {
        timeoutMs: MONACO_READY_TIMEOUT_MS,
        activeTabId,
        viewMode,
      });
      setPlainTextFallbackEnabled(true);
      setEditorReadiness('fallback');
    }, MONACO_READY_TIMEOUT_MS);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [activeTabId, editorPaneRequiresMonaco, editorReadiness, viewMode]);

  const handleMonacoReady = useCallback(() => {
    if (editorReadinessLoggedRef.current) {
      return;
    }

    editorReadinessLoggedRef.current = true;
    logWorkspaceEvent('monaco-editor-ready', {
      activeTabId,
      viewMode,
    });
    setEditorReadiness('ready');
  }, [activeTabId, viewMode]);

  const handleMonacoError = useCallback(
    (error: Error) => {
      logWorkspaceEvent('monaco-editor-create-failed', {
        activeTabId,
        viewMode,
        message: error.message,
        stack: error.stack,
      });
      setPlainTextFallbackEnabled(true);
      setEditorReadiness('fallback');
    },
    [activeTabId, viewMode],
  );

  useEffect(() => {
    if (readinessLoggedRef.current || !sessionRestoreComplete || tabs.length === 0) {
      return;
    }

    const loadingTabs = tabs.filter((tab) => tab.loadState === 'loading').length;
    if (loadingTabs > 0) {
      return;
    }

    if (editorPaneRequiresMonaco && editorReadiness !== 'ready') {
      return;
    }

    const readyTabs = tabs.filter((tab) => tab.loadState === 'ready').length;
    const missingTabs = tabs.filter((tab) => tab.loadState === 'missing').length;
    const erroredTabs = tabs.filter((tab) => tab.loadState === 'error').length;
    const activeTabState = tabs.find((tab) => tab.id === activeTabId)?.loadState ?? null;
    readinessLoggedRef.current = true;
    const context = {
      route: 'workspace',
      tabs: tabs.length,
      readyTabs,
      missingTabs,
      erroredTabs,
      activeTabId,
      activeTabState,
      editorReadiness,
      editor: plainTextFallbackEnabled ? 'plain-text' : 'monaco',
      editorGate: editorPaneRequiresMonaco ? 'monaco-ready' : 'not-blocked',
    };
    logWorkspaceEvent('workspace-ready', context);
    onReady?.(context);
  }, [
    activeTabId,
    editorPaneRequiresMonaco,
    editorReadiness,
    onReady,
    plainTextFallbackEnabled,
    sessionRestoreComplete,
    tabs,
  ]);

  return { safeMode, plainTextFallbackEnabled, handleMonacoReady, handleMonacoError };
}
