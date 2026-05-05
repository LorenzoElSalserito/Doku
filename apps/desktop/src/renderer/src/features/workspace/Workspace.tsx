import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent as ReactDragEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { Button, Card, IconButton, Input, SegmentedControl, type SegmentedOption } from '@doku/ui';
import type {
  DocumentSession,
  DocumentSummary,
  Settings,
  SettingsPatch,
  WorkspaceNode,
} from '@doku/application';
import { useDict } from '../../i18n/I18nProvider.js';
import type { Dictionary } from '../../i18n/keys.js';
import { MarkdownPreview } from './MarkdownPreview.js';
import { MonacoEditor, type MonacoEditorHandle } from './MonacoEditor.js';
import { DefaultMarkdownAppDialog } from './DefaultMarkdownAppDialog.js';
import { MARKDOWN_ACTION_SPECS, buildMarkdownTable, type MarkdownActionId } from './markdownActions.js';
import { WorkspaceExplorer } from './WorkspaceExplorer.js';

interface WorkspaceProps {
  settings: Settings;
  initialTabs: DocumentSummary[];
  initialActiveTabId: string | null;
  onUpdate: (patch: SettingsPatch) => Promise<void>;
  onOpenSettings: () => void;
  onOpenInfo: () => void;
  onOpenGuide: () => void;
  onOpenExport: (document: { title: string; content: string; path?: string }) => void;
}

type ResizeSide = 'left' | 'right';
type ViewMode = Settings['workspaceViewMode'];
type SaveState = 'saved' | 'dirty' | 'saving' | 'error';

interface WorkspaceDocumentTab {
  id: string;
  document: DocumentSession | null;
  summary: DocumentSummary | null;
  saveState: SaveState;
  loadState: 'loading' | 'ready' | 'error';
  errorMessage: string | null;
}

const LEFT_MIN = 220;
const LEFT_MAX = 420;
const RIGHT_MIN = 260;
const RIGHT_MAX = 520;
const RESIZE_KEYBOARD_STEP = 24;

function logWorkspaceEvent(event: string, context?: Record<string, unknown>): void {
  void (window.doku.system as { logEvent?: (event: string, context?: Record<string, unknown>) => Promise<void> })
    .logEvent?.(event, context);
}

export function Workspace({
  settings,
  initialTabs,
  initialActiveTabId,
  onUpdate,
  onOpenSettings,
  onOpenInfo,
  onOpenGuide,
  onOpenExport,
}: WorkspaceProps) {
  const dict = useDict();
  const { workspace: persistedWorkspace, workspaceViewMode: persistedViewMode } = settings;
  const [layout, setLayout] = useState(persistedWorkspace);
  const [dragState, setDragState] = useState<ResizeSide | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(persistedViewMode);
  const [quickActionsVisible, setQuickActionsVisible] = useState(settings.workspaceQuickActionsVisible);
  const [activeSummary, setActiveSummary] = useState<DocumentSummary | null>(null);
  const [draftToken, setDraftToken] = useState(0);
  const [tabs, setTabs] = useState<WorkspaceDocumentTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [sessionRestoreComplete, setSessionRestoreComplete] = useState(initialTabs.length === 0);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const [defaultAppPromptOpen, setDefaultAppPromptOpen] = useState(false);
  const [editorDropActive, setEditorDropActive] = useState(false);
  const [tableRows, setTableRows] = useState('2');
  const [tableColumns, setTableColumns] = useState('3');
  const [workspaceTree, setWorkspaceTree] = useState<WorkspaceNode[]>([]);
  const initialTabsRef = useRef(initialTabs);
  const initialActiveTabIdRef = useRef(initialActiveTabId);
  const restoreMessagesRef = useRef({
    editorErrorBody: dict.workspace.editorErrorBody,
    missingDocumentFile: dict.workspace.tabs.missingDocumentFile,
    missingDocumentNotice: dict.workspace.missingDocumentNotice,
  });
  const initialOnUpdateRef = useRef(onUpdate);
  const draftLayoutRef = useRef(layout);
  const tabsRef = useRef<WorkspaceDocumentTab[]>([]);
  const autosaveTimeoutRef = useRef<number | null>(null);
  const sessionPersistTimeoutRef = useRef<number | null>(null);
  const lastPersistedSessionRef = useRef<string>(
    JSON.stringify({
      tabs: settings.sessionTabs,
      active: settings.activeSessionTabId,
    }),
  );
  const defaultAppPromptRef = useRef(settings.defaultMarkdownAppPrompt);
  const launcherRef = useRef(settings.launcher);
  const previewScrollRef = useRef<HTMLDivElement | null>(null);
  const editorPaneRef = useRef<HTMLElement | null>(null);
  const monacoEditorRef = useRef<MonacoEditorHandle | null>(null);
  const dropDepthRef = useRef(0);

  useEffect(() => {
    launcherRef.current = settings.launcher;
  }, [settings.launcher]);

  useEffect(() => {
    defaultAppPromptRef.current = settings.defaultMarkdownAppPrompt;
  }, [settings.defaultMarkdownAppPrompt]);

  useEffect(() => {
    setLayout(persistedWorkspace);
    draftLayoutRef.current = persistedWorkspace;
  }, [persistedWorkspace]);

  useEffect(() => {
    setViewMode(persistedViewMode);
  }, [persistedViewMode]);

  useEffect(() => {
    setQuickActionsVisible(settings.workspaceQuickActionsVisible);
  }, [settings.workspaceQuickActionsVisible]);

  useEffect(() => {
    tabsRef.current = tabs;
  }, [tabs]);

  const activeTab = useMemo(
    () => tabs.find((tab) => tab.id === activeTabId) ?? null,
    [activeTabId, tabs],
  );
  const document = activeTab?.document ?? null;
  const saveState = activeTab?.saveState ?? 'saved';
  const loadState = activeTab?.loadState ?? 'loading';
  const errorMessage = activeTab?.errorMessage ?? null;

  const updateActiveTab = useCallback(
    (updater: (tab: WorkspaceDocumentTab) => WorkspaceDocumentTab) => {
      setTabs((current) =>
        current.map((tab) => (tab.id === activeTabId ? updater(tab) : tab)),
      );
    },
    [activeTabId],
  );

  const setActiveTabDocument = useCallback(
    (updater: DocumentSession | ((current: DocumentSession | null) => DocumentSession | null)) => {
      updateActiveTab((tab) => {
        const nextDocument = typeof updater === 'function' ? updater(tab.document) : updater;
        return {
          ...tab,
          document: nextDocument,
          summary: toDocumentSummary(nextDocument),
        };
      });
    },
    [updateActiveTab],
  );

  const setActiveTabSaveState = useCallback(
    (nextState: SaveState) => {
      updateActiveTab((tab) => ({ ...tab, saveState: nextState }));
    },
    [updateActiveTab],
  );

  const setActiveTabLoadState = useCallback(
    (nextState: 'loading' | 'ready' | 'error') => {
      updateActiveTab((tab) => ({ ...tab, loadState: nextState }));
    },
    [updateActiveTab],
  );

  const setActiveTabErrorMessage = useCallback(
    (nextMessage: string | null) => {
      updateActiveTab((tab) => ({ ...tab, errorMessage: nextMessage }));
    },
    [updateActiveTab],
  );

  const activateDocumentTab = useCallback((nextDocument: DocumentSession, nextSaveState: SaveState = 'saved') => {
    const tabId = resolveDocumentTabId(nextDocument);
    setTabs((current) => {
      const existingIndex = current.findIndex((tab) => tab.id === tabId);
      const nextTab: WorkspaceDocumentTab = {
        id: tabId,
        document: nextDocument,
        summary: toDocumentSummary(nextDocument),
        saveState: nextSaveState,
        loadState: 'ready',
        errorMessage: null,
      };

      if (existingIndex === -1) {
        return [...current, nextTab];
      }

      return current.map((tab, index) => (index === existingIndex ? nextTab : tab));
    });
    setActiveTabId(tabId);
  }, []);

  const refreshWorkspaceTree = useCallback(async () => {
    if (!document?.path) {
      setWorkspaceTree([]);
      return;
    }

    try {
      const nodes = await window.doku.documents.listWorkspaceTree(document.path);
      setWorkspaceTree(nodes);
    } catch {
      setWorkspaceTree([]);
    }
  }, [document?.path]);

  useEffect(() => {
    void refreshWorkspaceTree();
  }, [document?.lastSavedAt, refreshWorkspaceTree]);

  useEffect(() => {
    if (!document?.path) {
      return undefined;
    }

    return window.doku.documents.watchWorkspaceTree(document.path, () => {
      void refreshWorkspaceTree();
    });
  }, [document?.path, refreshWorkspaceTree]);

  useEffect(() => {
    const initialSessionTabs = initialTabsRef.current;
    const initialSessionActiveTabId = initialActiveTabIdRef.current;
    const restoreMessages = restoreMessagesRef.current;

    if (initialSessionTabs.length === 0) {
      setSessionRestoreComplete(true);
      return undefined;
    }

    let cancelled = false;
    const summaries = dedupeDocumentSummaries(initialSessionTabs).slice(0, 40);
    const tabIds = summaries.map(resolveSummaryTabId);
    const initialActiveId =
      initialSessionActiveTabId && tabIds.includes(initialSessionActiveTabId)
        ? initialSessionActiveTabId
        : tabIds[0] ?? null;

    setSessionRestoreComplete(false);
    setTabs(
      summaries.map((summary) => ({
        id: resolveSummaryTabId(summary),
        document: null,
        summary,
        saveState: 'saved',
        loadState: 'loading',
        errorMessage: null,
      })),
    );
    setActiveTabId(initialActiveId);

    const restore = async () => {
      await Promise.all(
        summaries.map(async (summary) => {
          const tabId = resolveSummaryTabId(summary);
          try {
            const next = await window.doku.documents.loadDocument(summary);
            if (cancelled) {
              return;
            }

            if (!next) {
              const nextLauncher = removeSummaryFromLauncher(launcherRef.current, summary);
              await initialOnUpdateRef.current({ launcher: nextLauncher });
              if (cancelled) {
                return;
              }
              setTabs((current) =>
                current.map((tab) =>
                  tab.id === tabId
                    ? {
                        ...tab,
                        loadState: 'error',
                        errorMessage: restoreMessages.missingDocumentFile,
                      }
                    : tab,
                ),
              );
              logWorkspaceEvent('document-session-tab-missing', {
                id: summary.id,
                path: summary.path,
              });
              return;
            }

            setTabs((current) =>
              current.map((tab) =>
                tab.id === tabId
                  ? {
                      ...tab,
                      document: next,
                      summary: toDocumentSummary(next),
                      saveState: 'saved',
                      loadState: 'ready',
                      errorMessage: null,
                    }
                  : tab,
              ),
            );
            logWorkspaceEvent('document-session-tab-restored', {
              id: next.id,
              kind: next.kind,
              title: next.title,
              path: next.path,
            });
          } catch (error: unknown) {
            if (cancelled) {
              return;
            }
            setTabs((current) =>
              current.map((tab) =>
                tab.id === tabId
                  ? {
                      ...tab,
                      loadState: 'error',
                      errorMessage:
                        error instanceof Error ? error.message : restoreMessages.editorErrorBody,
                    }
                  : tab,
              ),
            );
            logWorkspaceEvent('document-session-tab-restore-failed', {
              message: error instanceof Error ? error.message : restoreMessages.editorErrorBody,
            });
          }
        }),
      );

      if (!cancelled) {
        setNoticeMessage(null);
        setSessionRestoreComplete(true);
      }
    };

    void restore();

    return () => {
      cancelled = true;
    };
  }, []);

  const saveDocument = useCallback(
    async (mode: 'save' | 'saveAs' | 'autosave') => {
      if (!document) {
        return;
      }

      setActiveTabSaveState('saving');
      setActiveTabErrorMessage(null);
      logWorkspaceEvent('document-save-started', {
        mode,
        id: document.id,
        kind: document.kind,
        title: document.title,
        path: document.path,
        contentLength: document.content.length,
      });

      try {
        const result = await window.doku.documents.saveDocument({
          id: document.id,
          kind: document.kind,
          title: resolveDocumentSaveTitle(document),
          path: document.path,
          content: document.content,
          mode,
        });

        activateDocumentTab(result.document, 'saved');
        await onUpdate({ launcher: result.launcher });
        if (
          mode !== 'autosave' &&
          result.document.kind === 'file' &&
          !defaultAppPromptRef.current.shown &&
          !defaultAppPromptRef.current.dismissed
        ) {
          const nextPrompt = {
            ...defaultAppPromptRef.current,
            shown: true,
          };
          defaultAppPromptRef.current = nextPrompt;
          await onUpdate({ defaultMarkdownAppPrompt: nextPrompt });
          setDefaultAppPromptOpen(true);
        }
        logWorkspaceEvent('document-save-completed', {
          mode,
          id: result.document.id,
          kind: result.document.kind,
          path: result.document.path,
        });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : dict.workspace.editorErrorBody;
        if (message === 'Save operation canceled.') {
          setActiveTabSaveState(document.path ? 'saved' : 'dirty');
          return;
        }
        setActiveTabSaveState('error');
        setActiveTabErrorMessage(message);
        logWorkspaceEvent('document-save-failed', { mode, message });
      }
    },
    [
      dict.workspace.editorErrorBody,
      activateDocumentTab,
      document,
      onUpdate,
      setActiveTabErrorMessage,
      setActiveTabSaveState,
    ],
  );

  useEffect(() => {
    if (!sessionRestoreComplete) {
      return undefined;
    }

    if (!activeSummary && tabsRef.current.length > 0 && draftToken === 0) {
      return undefined;
    }

    let cancelled = false;
    const requestedTabId = activeSummary ? resolveSummaryTabId(activeSummary) : `draft:${draftToken}`;

    const existingTab = tabsRef.current.find((tab) => tab.id === requestedTabId);
    if (existingTab?.loadState === 'ready') {
      setActiveTabId(requestedTabId);
      return () => {
        cancelled = true;
      };
    }

    setTabs((current) => {
      if (current.some((tab) => tab.id === requestedTabId)) {
        return current.map((tab) =>
          tab.id === requestedTabId
            ? { ...tab, loadState: 'loading', errorMessage: null }
            : tab,
        );
      }

      return [
        ...current,
        {
          id: requestedTabId,
          document: null,
          summary: activeSummary,
          saveState: 'saved',
          loadState: 'loading',
          errorMessage: null,
        },
      ];
    });
    setActiveTabId(requestedTabId);

    const load = async () => {
      try {
        if (!activeSummary) {
          const now = new Date().toISOString();
          const draftDocument: DocumentSession = {
            id: `draft:${crypto.randomUUID()}`,
            kind: 'draft',
            title: dict.workspace.untitledDocument,
            content: '',
            snippet: '',
            lastOpenedAt: now,
            lastSavedAt: null,
          };
          if (cancelled) {
            return;
          }
          setTabs((current) =>
            current.map((tab) =>
              tab.id === requestedTabId
                ? {
                    ...tab,
                    document: draftDocument,
                    summary: toDocumentSummary(draftDocument),
                    saveState: 'saved',
                    loadState: 'ready',
                    errorMessage: null,
                  }
                : tab,
            ),
          );
          logWorkspaceEvent('document-draft-created');
          return;
        }

        const next = await window.doku.documents.loadDocument(activeSummary);
        if (cancelled) {
          return;
        }
        if (!next) {
          const nextLauncher = removeSummaryFromLauncher(launcherRef.current, activeSummary);
          await onUpdate({ launcher: nextLauncher });
          if (cancelled) {
            return;
          }
          setNoticeMessage(dict.workspace.missingDocumentNotice);
          logWorkspaceEvent('document-recent-missing', {
            id: activeSummary.id,
            path: activeSummary.path,
          });
          setTabs((current) =>
            current.map((tab) =>
              tab.id === requestedTabId
                ? {
                    ...tab,
                    summary: activeSummary,
                    loadState: 'error',
                    errorMessage: dict.workspace.tabs.missingDocumentFile,
                  }
                : tab,
            ),
          );
          return;
        }
        setTabs((current) =>
          current.map((tab) =>
            tab.id === requestedTabId
              ? {
                  ...tab,
                  document: next,
                  summary: toDocumentSummary(next),
                  saveState: 'saved',
                  loadState: 'ready',
                  errorMessage: null,
                }
              : tab,
          ),
        );
        setNoticeMessage(null);
        logWorkspaceEvent('document-loaded', {
          id: next.id,
          kind: next.kind,
          title: next.title,
          path: next.path,
        });
      } catch (error: unknown) {
        if (cancelled) {
          return;
        }
        setTabs((current) =>
          current.map((tab) =>
            tab.id === requestedTabId
              ? {
                  ...tab,
                  loadState: 'error',
                  errorMessage: error instanceof Error ? error.message : dict.workspace.editorErrorBody,
                }
              : tab,
          ),
        );
        logWorkspaceEvent('document-load-failed', {
          message: error instanceof Error ? error.message : dict.workspace.editorErrorBody,
        });
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [
    activeSummary,
    draftToken,
    dict.workspace.editorErrorBody,
    dict.workspace.missingDocumentNotice,
    dict.workspace.tabs.missingDocumentFile,
    dict.workspace.untitledDocument,
    onUpdate,
    sessionRestoreComplete,
  ]);

  useEffect(() => {
    if (!document || saveState !== 'dirty') {
      return;
    }

    if (autosaveTimeoutRef.current) {
      window.clearTimeout(autosaveTimeoutRef.current);
    }

    autosaveTimeoutRef.current = window.setTimeout(() => {
      void saveDocument('autosave');
    }, 900);

    return () => {
      if (autosaveTimeoutRef.current) {
        window.clearTimeout(autosaveTimeoutRef.current);
      }
    };
  }, [document, saveDocument, saveState]);

  useEffect(() => {
    if (!sessionRestoreComplete) {
      return;
    }

    const summaries: DocumentSummary[] = tabs
      .filter(
        (tab): tab is WorkspaceDocumentTab & { document: DocumentSession } =>
          tab.loadState === 'ready' &&
          tab.document !== null &&
          tab.document.kind === 'file' &&
          typeof tab.document.path === 'string' &&
          tab.document.path.length > 0,
      )
      .map((tab) => ({
        id: tab.document.id,
        kind: tab.document.kind,
        title: tab.document.title,
        path: tab.document.path,
        snippet: tab.document.snippet,
        lastOpenedAt: tab.document.lastOpenedAt,
      }));

    const signature = JSON.stringify({
      tabs: summaries,
      active: activeTabId,
    });

    if (signature === lastPersistedSessionRef.current) {
      return;
    }

    if (sessionPersistTimeoutRef.current) {
      window.clearTimeout(sessionPersistTimeoutRef.current);
    }

    sessionPersistTimeoutRef.current = window.setTimeout(() => {
      lastPersistedSessionRef.current = signature;
      void onUpdate({ sessionTabs: summaries, activeSessionTabId: activeTabId });
    }, 500);

    return () => {
      if (sessionPersistTimeoutRef.current) {
        window.clearTimeout(sessionPersistTimeoutRef.current);
      }
    };
  }, [activeTabId, onUpdate, sessionRestoreComplete, tabs]);

  useEffect(() => {
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      const usesPrimaryModifier = event.metaKey || event.ctrlKey;
      if (!usesPrimaryModifier || event.altKey || event.key.toLowerCase() !== 's') {
        return;
      }

      event.preventDefault();
      void saveDocument(event.shiftKey ? 'saveAs' : 'save');
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [saveDocument]);

  useEffect(() => {
    if (!dragState) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const currentLayout = draftLayoutRef.current;

      if (dragState === 'left') {
        const nextWidth = clamp(event.clientX - 24, LEFT_MIN, LEFT_MAX);
        const nextLayout = {
          ...currentLayout,
          leftPanelWidth: nextWidth,
          leftPanelCollapsed: false,
        };
        draftLayoutRef.current = nextLayout;
        setLayout(nextLayout);
      }

      if (dragState === 'right') {
        const nextWidth = clamp(window.innerWidth - event.clientX - 24, RIGHT_MIN, RIGHT_MAX);
        const nextLayout = {
          ...currentLayout,
          rightPanelWidth: nextWidth,
          rightPanelCollapsed: false,
        };
        draftLayoutRef.current = nextLayout;
        setLayout(nextLayout);
      }
    };

    const handlePointerUp = () => {
      const nextLayout = draftLayoutRef.current;
      setDragState(null);
      void onUpdate({ workspace: nextLayout });
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp, { once: true });

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [dragState, onUpdate]);

  const workspace = layout;
  const leftStyle = workspace.leftPanelCollapsed ? undefined : { width: `${workspace.leftPanelWidth}px` };
  const rightStyle = workspace.rightPanelCollapsed ? undefined : { width: `${workspace.rightPanelWidth}px` };
  const previewContent = document?.content ?? '';
  const words = useMemo(() => countWords(previewContent), [previewContent]);
  const characters = previewContent.length;
  const exportTitle = resolveDocumentExportTitle(document);
  const documentTitleValue = exportTitle ?? '';
  const documentHeaderTitle = documentTitleValue || dict.workspace.documentTitlePlaceholder;
  const recentDocuments = useMemo(
    () => settings.launcher.recentDocuments.filter((summary) => summary.id !== document?.id).slice(0, 4),
    [document?.id, settings.launcher.recentDocuments],
  );

  const viewOptions: SegmentedOption<ViewMode>[] = [
    {
      value: 'write',
      label: <WriteModeIcon />,
      ariaLabel: dict.workspace.writeMode,
      title: dict.workspace.writeMode,
    },
    {
      value: 'preview',
      label: <PreviewModeIcon />,
      ariaLabel: dict.workspace.previewMode,
      title: dict.workspace.previewMode,
    },
    {
      value: 'split',
      label: <SplitModeIcon />,
      ariaLabel: dict.workspace.splitMode,
      title: dict.workspace.splitMode,
    },
  ];

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
    [onUpdate, viewMode],
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
    [viewMode],
  );

  const handlePreviewWheel = useCallback(
    (event: React.WheelEvent<HTMLDivElement>) => {
      if (viewMode !== 'split') {
        return;
      }

      event.preventDefault();
      monacoEditorRef.current?.scrollBy(event.deltaY);
    },
    [viewMode],
  );

  const toggleQuickActions = useCallback(() => {
    const nextVisible = !quickActionsVisible;
    setQuickActionsVisible(nextVisible);
    logWorkspaceEvent('workspace-quick-actions-toggled', { visible: nextVisible });
    void onUpdate({ workspaceQuickActionsVisible: nextVisible });
  }, [onUpdate, quickActionsVisible]);

  const handleActivateTab = useCallback((tabId: string) => {
    setActiveTabId(tabId);
    setNoticeMessage(null);
    logWorkspaceEvent('document-tab-activated', { tabId });
  }, []);

  const handleCloseTab = useCallback(
    (tabId: string) => {
      const closingTab = tabsRef.current.find((tab) => tab.id === tabId);
      if (!closingTab) {
        return;
      }

      if (
        closingTab.saveState === 'dirty' &&
        !window.confirm(dict.workspace.tabs.closeDirtyConfirm)
      ) {
        return;
      }

      const remainingTabs = tabsRef.current.filter((tab) => tab.id !== tabId);
      if (remainingTabs.length === 0) {
        setActiveSummary(null);
        setDraftToken((token) => token + 1);
      } else if (tabId === activeTabId) {
        setActiveTabId(remainingTabs.at(-1)?.id ?? null);
      }

      setTabs(remainingTabs);
      setNoticeMessage(null);
      logWorkspaceEvent('document-tab-closed', { tabId });
    },
    [activeTabId, dict.workspace.tabs.closeDirtyConfirm],
  );

  const handleReorderTabs = useCallback((fromId: string, toId: string) => {
    if (fromId === toId) {
      return;
    }

    setTabs((current) => reorderTabs(current, fromId, toId));
    logWorkspaceEvent('document-tabs-reordered', { fromId, toId });
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      const usesPrimaryModifier = event.metaKey || event.ctrlKey;
      if (!usesPrimaryModifier || event.altKey || tabsRef.current.length === 0) {
        return;
      }

      const currentTabs = tabsRef.current;
      const activeIndex = currentTabs.findIndex((tab) => tab.id === activeTabId);
      const normalizedKey = event.key.toLowerCase();

      if (normalizedKey === 'tab') {
        event.preventDefault();
        const direction = event.shiftKey ? -1 : 1;
        const baseIndex = activeIndex === -1 ? 0 : activeIndex;
        const nextIndex = (baseIndex + direction + currentTabs.length) % currentTabs.length;
        const nextTab = currentTabs[nextIndex];
        if (nextTab) {
          handleActivateTab(nextTab.id);
        }
        return;
      }

      if (normalizedKey === 'w') {
        if (!activeTabId) {
          return;
        }

        event.preventDefault();
        handleCloseTab(activeTabId);
        return;
      }

      if (!event.shiftKey && /^[1-9]$/.test(event.key)) {
        const tabIndex = Number.parseInt(event.key, 10) - 1;
        const nextTab = currentTabs[tabIndex];
        if (!nextTab) {
          return;
        }

        event.preventDefault();
        handleActivateTab(nextTab.id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeTabId, handleActivateTab, handleCloseTab]);

  const handleContentChange = (nextValue: string) => {
    setActiveTabDocument((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        title: resolveDocumentDisplayTitle(nextValue, current.path, dict.workspace.untitledDocument),
        content: nextValue,
        snippet: extractSnippet(nextValue),
        lastOpenedAt: new Date().toISOString(),
      };
    });
    setActiveTabSaveState('dirty');
  };

  const toggleLeft = () => {
    const nextLayout = {
      ...workspace,
      leftPanelCollapsed: !workspace.leftPanelCollapsed,
    };
    setLayout(nextLayout);
    draftLayoutRef.current = nextLayout;
    void onUpdate({ workspace: nextLayout });
  };

  const toggleRight = () => {
    const nextLayout = {
      ...workspace,
      rightPanelCollapsed: !workspace.rightPanelCollapsed,
    };
    setLayout(nextLayout);
    draftLayoutRef.current = nextLayout;
    void onUpdate({ workspace: nextLayout });
  };

  const resizeFromKeyboard = useCallback(
    (side: ResizeSide, direction: 'decrease' | 'increase' | 'min' | 'max') => {
      const currentLayout = draftLayoutRef.current;
      const nextLayout = { ...currentLayout };

      if (side === 'left') {
        if (direction === 'min') {
          nextLayout.leftPanelWidth = LEFT_MIN;
        } else if (direction === 'max') {
          nextLayout.leftPanelWidth = LEFT_MAX;
        } else {
          const delta = direction === 'increase' ? RESIZE_KEYBOARD_STEP : -RESIZE_KEYBOARD_STEP;
          nextLayout.leftPanelWidth = clamp(currentLayout.leftPanelWidth + delta, LEFT_MIN, LEFT_MAX);
        }
        nextLayout.leftPanelCollapsed = false;
      }

      if (side === 'right') {
        if (direction === 'min') {
          nextLayout.rightPanelWidth = RIGHT_MIN;
        } else if (direction === 'max') {
          nextLayout.rightPanelWidth = RIGHT_MAX;
        } else {
          const delta = direction === 'increase' ? RESIZE_KEYBOARD_STEP : -RESIZE_KEYBOARD_STEP;
          nextLayout.rightPanelWidth = clamp(currentLayout.rightPanelWidth + delta, RIGHT_MIN, RIGHT_MAX);
        }
        nextLayout.rightPanelCollapsed = false;
      }

      draftLayoutRef.current = nextLayout;
      setLayout(nextLayout);
      void onUpdate({ workspace: nextLayout });
    },
    [onUpdate],
  );

  const handleNewDocument = useCallback(() => {
    setNoticeMessage(null);
    logWorkspaceEvent('document-new-requested');
    setActiveSummary(null);
    setDraftToken((token) => token + 1);
  }, []);

  const handleOpenFile = useCallback(async () => {
    setNoticeMessage(null);
    logWorkspaceEvent('document-open-dialog-requested');
    const result = await window.doku.documents.openMarkdownFile();
    if (!result) {
      return;
    }
    await onUpdate({ launcher: result.launcher });
    logWorkspaceEvent('document-opened-from-dialog', {
      id: result.document.id,
      title: result.document.title,
      path: result.document.path,
    });
    activateDocumentTab(result.document);
  }, [activateDocumentTab, onUpdate]);

  const handleReopenTabFromDisk = useCallback(
    async (tabId: string) => {
      setActiveTabId(tabId);
      setNoticeMessage(null);
      logWorkspaceEvent('document-tab-reopen-dialog-requested', { tabId });
      const result = await window.doku.documents.openMarkdownFile();
      if (!result) {
        return;
      }

      await onUpdate({ launcher: result.launcher });
      const nextTabId = resolveDocumentTabId(result.document);
      setTabs((current) => {
        const withoutDuplicate = current.filter(
          (tab) => tab.id === tabId || tab.id !== nextTabId,
        );

        return withoutDuplicate.map((tab) =>
          tab.id === tabId
            ? {
                id: nextTabId,
                document: result.document,
                summary: toDocumentSummary(result.document),
                saveState: 'saved',
                loadState: 'ready',
                errorMessage: null,
              }
            : tab,
        );
      });
      setActiveTabId(nextTabId);
      logWorkspaceEvent('document-tab-reopened-from-disk', {
        previousTabId: tabId,
        nextTabId,
        path: result.document.path,
      });
    },
    [onUpdate],
  );

  const handleSelectRecent = useCallback((summary: DocumentSummary) => {
    setNoticeMessage(null);
    logWorkspaceEvent('document-recent-selected', {
      id: summary.id,
      title: summary.title,
      path: summary.path,
    });
    setActiveSummary(summary);
  }, []);

  const handleOpenWorkspaceFile = useCallback(
    async (filePath: string) => {
      setNoticeMessage(null);
      logWorkspaceEvent('workspace-file-open-requested', { filePath });
      const existingTab = tabsRef.current.find((tab) => tab.document?.path === filePath);
      if (existingTab) {
        setActiveTabId(existingTab.id);
        logWorkspaceEvent('workspace-file-tab-activated', { filePath });
        return;
      }
      const result = await window.doku.documents.openDocumentAtPath(filePath);
      if (!result) {
        return;
      }
      await onUpdate({ launcher: result.launcher });
      logWorkspaceEvent('workspace-file-opened', {
        id: result.document.id,
        title: result.document.title,
        path: result.document.path,
      });
      activateDocumentTab(result.document);
    },
    [activateDocumentTab, onUpdate],
  );

  useEffect(() => {
    return window.doku.documents.onOpenFileRequest((filePath) => {
      void handleOpenWorkspaceFile(filePath);
    });
  }, [handleOpenWorkspaceFile]);

  const handleCreateWorkspaceFile = useCallback(async () => {
    if (!document?.path) {
      return;
    }

    const name = window.prompt(dict.workspace.workspaceExplorer.newFilePrompt);
    if (!name?.trim()) {
      return;
    }

    try {
      const result = await window.doku.documents.createWorkspaceFile(document.path, name);
      await refreshWorkspaceTree();
      await handleOpenWorkspaceFile(result.path);
      logWorkspaceEvent('workspace-file-created', { path: result.path });
    } catch {
      setActiveTabErrorMessage(dict.workspace.workspaceExplorer.createFileError);
      setActiveTabSaveState('error');
      logWorkspaceEvent('workspace-file-create-failed', { name });
    }
  }, [dict.workspace.workspaceExplorer, document?.path, handleOpenWorkspaceFile, refreshWorkspaceTree, setActiveTabErrorMessage, setActiveTabSaveState]);

  const handleCreateWorkspaceFolder = useCallback(async () => {
    if (!document?.path) {
      return;
    }

    const name = window.prompt(dict.workspace.workspaceExplorer.newFolderPrompt);
    if (!name?.trim()) {
      return;
    }

    try {
      await window.doku.documents.createWorkspaceFolder(document.path, name);
      await refreshWorkspaceTree();
      logWorkspaceEvent('workspace-folder-created', { documentPath: document.path, name });
    } catch {
      setActiveTabErrorMessage(dict.workspace.workspaceExplorer.createFolderError);
      setActiveTabSaveState('error');
      logWorkspaceEvent('workspace-folder-create-failed', { documentPath: document.path, name });
    }
  }, [dict.workspace.workspaceExplorer, document?.path, refreshWorkspaceTree, setActiveTabErrorMessage, setActiveTabSaveState]);

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
    [viewMode],
  );

  const handleInsertTable = useCallback(() => {
    if (viewMode === 'preview') {
      return;
    }

    const rows = Number.parseInt(tableRows, 10);
    const columns = Number.parseInt(tableColumns, 10);
    const snippet = buildMarkdownTable(Number.isFinite(rows) ? rows : 2, Number.isFinite(columns) ? columns : 3);
    logWorkspaceEvent('markdown-table-inserted', { rows, columns });
    monacoEditorRef.current?.replaceSelection(snippet, {
      selectionStartOffset: 2,
      selectionEndOffset: 10,
    });
  }, [tableColumns, tableRows, viewMode]);

  const handleEditorDragEnter = useCallback((event: ReactDragEvent<HTMLElement>) => {
    if (!hasImageFiles(event)) {
      return;
    }
    event.preventDefault();
    dropDepthRef.current += 1;
    setEditorDropActive(true);
  }, []);

  const handleEditorDragOver = useCallback((event: ReactDragEvent<HTMLElement>) => {
    if (!hasImageFiles(event)) {
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    setEditorDropActive(true);
  }, []);

  const handleEditorDragLeave = useCallback((event: ReactDragEvent<HTMLElement>) => {
    if (!hasImageFiles(event)) {
      return;
    }
    event.preventDefault();
    dropDepthRef.current = Math.max(0, dropDepthRef.current - 1);
    if (dropDepthRef.current === 0) {
      setEditorDropActive(false);
    }
  }, []);

  const handleEditorDrop = useCallback(
    async (event: ReactDragEvent<HTMLElement>) => {
      if (!hasImageFiles(event)) {
        return;
      }

      event.preventDefault();
      dropDepthRef.current = 0;
      setEditorDropActive(false);
      setNoticeMessage(null);

      if (!document?.path) {
        setActiveTabErrorMessage(dict.workspace.imageImportSaveFirst);
        setActiveTabSaveState('error');
        logWorkspaceEvent('image-import-failed', { reason: 'document-not-saved' });
        return;
      }

      const imageFile = Array.from(event.dataTransfer.files).find((file) =>
        isSupportedImageFile(getFilePath(file)),
      );

      const sourcePath = imageFile ? getFilePath(imageFile) : null;
      if (!sourcePath) {
        setActiveTabErrorMessage(dict.workspace.editorErrorBody);
        setActiveTabSaveState('error');
        logWorkspaceEvent('image-import-failed', { reason: 'unsupported-source' });
        return;
      }

      try {
        logWorkspaceEvent('image-import-started', {
          documentPath: document.path,
          sourcePath,
        });
        const imported = await window.doku.documents.importAsset({
          documentPath: document.path,
          sourcePath,
          strategy: 'project-assets',
        });

        const markdownToInsert = createImageMarkdownSnippet(imported.fileName, imported.relativePath);
        monacoEditorRef.current?.insertText(markdownToInsert);
        setNoticeMessage(
          dict.workspace.imageImportSuccess.replace('{{fileName}}', imported.fileName),
        );
        setActiveTabErrorMessage(null);
        setActiveTabSaveState('dirty');
        logWorkspaceEvent('image-import-completed', {
          fileName: imported.fileName,
          assetPath: imported.assetPath,
        });
      } catch (error: unknown) {
        const message =
          error instanceof Error
            ? resolveImageImportErrorMessage(error.message, dict.workspace)
            : dict.workspace.editorErrorBody;
        setActiveTabErrorMessage(message);
        setActiveTabSaveState('error');
        logWorkspaceEvent('image-import-failed', { message });
      }
    },
    [dict.workspace, document?.path, setActiveTabErrorMessage, setActiveTabSaveState],
  );

  return (
    <div className="workspace">
      <div className="workspace__topbar">
        <header className="workspace__header">
          <FileMenu
            labels={dict.workspace.fileMenu}
            recents={settings.launcher.recentDocuments.slice(0, 5)}
            onNew={handleNewDocument}
            onOpen={() => void handleOpenFile()}
            onSelectRecent={handleSelectRecent}
          />

          <div className="workspace__header-main">
            <h1 className="workspace__document-heading" title={documentHeaderTitle}>
              {documentHeaderTitle}
            </h1>
          </div>

          <div className="workspace__header-side">
            <div className="workspace__header-actions">
              <div className="workspace__action-group workspace__action-group--layout">
                <IconButton
                  label={
                    workspace.leftPanelCollapsed
                      ? dict.workspace.leftPanelToggleExpand
                      : dict.workspace.leftPanelToggleCollapse
                  }
                  onClick={toggleLeft}
                >
                  <PanelLeftIcon />
                </IconButton>
                <IconButton
                  label={
                    quickActionsVisible
                      ? dict.workspace.quickActions.toggleHide
                      : dict.workspace.quickActions.toggleShow
                  }
                  aria-pressed={quickActionsVisible}
                  className={
                    quickActionsVisible
                      ? 'workspace__quick-toggle workspace__quick-toggle--active'
                      : 'workspace__quick-toggle'
                  }
                  onClick={toggleQuickActions}
                >
                  <QuickActionsIcon />
                </IconButton>
                <IconButton
                  label={
                    workspace.rightPanelCollapsed
                      ? dict.workspace.rightPanelToggleExpand
                      : dict.workspace.rightPanelToggleCollapse
                  }
                  onClick={toggleRight}
                >
                  <PanelRightIcon />
                </IconButton>
                <SegmentedControl
                  value={viewMode}
                  options={viewOptions}
                  onChange={handleViewModeChange}
                  ariaLabel={dict.workspace.previewEyebrow}
                  idPrefix="workspace-mode"
                />
              </div>

              <div className="workspace__action-group workspace__action-group--primary">
                <IconButton label={dict.workspace.save} onClick={() => void saveDocument('save')}>
                  <SaveIcon />
                </IconButton>
                <IconButton label={dict.workspace.saveAs} onClick={() => void saveDocument('saveAs')}>
                  <SaveAsIcon />
                </IconButton>
                <IconButton
                  label={dict.workspace.export}
                  onClick={() =>
                    onOpenExport({
                      title: documentTitleValue,
                      content: document?.content ?? '',
                      path: document?.path,
                    })
                  }
                >
                  <ExportIcon />
                </IconButton>
              </div>

              <div className="workspace__action-group workspace__action-group--secondary">
                <IconButton label={dict.workspace.guide} onClick={onOpenGuide}>
                  <GuideIcon />
                </IconButton>
                <IconButton label={dict.workspace.settings} onClick={onOpenSettings}>
                  <SettingsIcon />
                </IconButton>
                <IconButton label={dict.workspace.info} onClick={onOpenInfo}>
                  <InfoIcon />
                </IconButton>
              </div>
            </div>

            <span
              className={`workspace__save-indicator workspace__save-indicator--${saveState}`}
              role="status"
              aria-live="polite"
              aria-label={statusLabel(saveState, dict.workspace)}
              title={statusLabel(saveState, dict.workspace)}
            >
              <SaveStateIcon state={saveState} />
            </span>
          </div>
        </header>

        {quickActionsVisible ? (
          <div className="workspace__quick-actions" aria-label={dict.workspace.quickActions.barLabel}>
            <div className="workspace__quick-actions-list">
              {MARKDOWN_ACTION_SPECS.map((action) => (
                <Button
                  key={action.id}
                  variant="ghost"
                  size="sm"
                  className="workspace__quick-action-button"
                  onClick={() => handleMarkdownAction(action.id)}
                  disabled={viewMode === 'preview'}
                  aria-label={action.label(dict.workspace.quickActions)}
                  title={action.label(dict.workspace.quickActions)}
                >
                  <MarkdownActionIcon actionId={action.id} />
                </Button>
              ))}
            </div>

            <div className="workspace__quick-actions-table">
              <span className="workspace__quick-actions-table-label">
                <TableIcon />
                {dict.workspace.quickActions.tableButton}
              </span>
              <label className="workspace__quick-actions-field">
                <span>{dict.workspace.quickActions.tableRows}</span>
                <Input
                  type="number"
                  min={1}
                  max={12}
                  value={tableRows}
                  onChange={(event) => setTableRows(event.target.value)}
                />
              </label>
              <label className="workspace__quick-actions-field">
                <span>{dict.workspace.quickActions.tableColumns}</span>
                <Input
                  type="number"
                  min={1}
                  max={8}
                  value={tableColumns}
                  onChange={(event) => setTableColumns(event.target.value)}
                />
              </label>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleInsertTable}
                disabled={viewMode === 'preview'}
              >
                {dict.workspace.quickActions.tableInsert}
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="workspace__body">
        {!workspace.leftPanelCollapsed && (
          <>
            <aside
              className="workspace__panel workspace__panel--left"
              style={leftStyle}
              aria-label={dict.workspace.leftPanelLabel}
            >
              <Card className="workspace__panel-card workspace__panel-card--feature">
                <span className="workspace__panel-eyebrow">
                  {dict.workspace.workspaceExplorer.openFolder}
                </span>
                <h2 className="workspace__panel-title">{dict.workspace.workspaceExplorer.title}</h2>
                <p className="workspace__panel-body">{dict.workspace.workspaceExplorer.body}</p>
                {document?.path ? (
                  <WorkspaceExplorer
                    nodes={workspaceTree}
                    activePath={document.path}
                    onOpenFile={(path) => void handleOpenWorkspaceFile(path)}
                    onCreateFile={() => void handleCreateWorkspaceFile()}
                    onCreateFolder={() => void handleCreateWorkspaceFolder()}
                  />
                ) : (
                  <p className="workspace__panel-meta">{dict.workspace.workspaceExplorer.draftHint}</p>
                )}
              </Card>
            </aside>

            <ResizeHandle
              side="left"
              onPointerDown={() => setDragState('left')}
              onKeyboardResize={resizeFromKeyboard}
            />
          </>
        )}

        <main className="workspace__editor" id="workspace-editor" tabIndex={-1}>
          <Card elevated className="workspace__editor-card">
            <DocumentTabs
              tabs={tabs}
              activeTabId={activeTabId}
              labels={dict.workspace.tabs}
              onActivate={handleActivateTab}
              onClose={handleCloseTab}
              onReorder={handleReorderTabs}
              onReopenFromDisk={handleReopenTabFromDisk}
            />
            {loadState === 'loading' ? (
              <div className="workspace__editor-loading">{dict.workspace.editorLoading}</div>
            ) : loadState === 'error' ? (
              <div className="workspace__editor-error" role="alert">
                <h2 className="workspace__editor-title">{dict.workspace.editorErrorTitle}</h2>
                <p className="workspace__editor-body">{errorMessage ?? dict.workspace.editorErrorBody}</p>
              </div>
            ) : (
              <div className={`workspace__editor-shell workspace__editor-shell--${viewMode}`}>
                {noticeMessage ? <div className="workspace__editor-notice">{noticeMessage}</div> : null}
                <div className={`workspace__editor-panels workspace__editor-panels--${viewMode}`}>
                  {(viewMode === 'write' || viewMode === 'split') && (
                    <section
                      ref={editorPaneRef}
                      className={`workspace__editor-pane workspace__editor-pane--write${
                        editorDropActive ? ' workspace__editor-pane--drop-active' : ''
                      }`}
                      onDragEnter={handleEditorDragEnter}
                      onDragOver={handleEditorDragOver}
                      onDragLeave={handleEditorDragLeave}
                      onDrop={handleEditorDrop}
                    >
                      {editorDropActive ? (
                        <div className="workspace__editor-dropzone">
                          <span className="workspace__editor-dropzone-eyebrow">
                            {dict.workspace.imageDropzoneEyebrow}
                          </span>
                          <strong className="workspace__editor-dropzone-title">
                            {dict.workspace.imageDropzoneTitle}
                          </strong>
                        </div>
                      ) : null}
                      <MonacoEditor
                        ref={monacoEditorRef}
                        value={document?.content ?? ''}
                        onChange={handleContentChange}
                        onScrollChange={handleEditorScrollChange}
                      />
                    </section>
                  )}

                  {(viewMode === 'preview' || viewMode === 'split') && (
                    <section
                      className={`workspace__editor-pane workspace__editor-pane--preview${
                        viewMode === 'preview' ? ' workspace__editor-pane--preview-page' : ''
                      }`}
                    >
                      <div
                        ref={previewScrollRef}
                        className="workspace__preview-scroll"
                        onWheel={handlePreviewWheel}
                      >
                        <MarkdownPreview
                          content={previewContent}
                          sourcePath={document?.path}
                          emptyLabel={dict.workspace.previewEmpty}
                        />
                      </div>
                    </section>
                  )}
                </div>
              </div>
            )}
          </Card>
        </main>

        {!workspace.rightPanelCollapsed && (
          <>
            <ResizeHandle
              side="right"
              onPointerDown={() => setDragState('right')}
              onKeyboardResize={resizeFromKeyboard}
            />

            <aside
              className="workspace__panel workspace__panel--right"
              style={rightStyle}
              aria-label={dict.workspace.rightPanelLabel}
            >
              <Card className="workspace__panel-card workspace__panel-card--feature">
                <span className="workspace__panel-eyebrow">{dict.workspace.projectPanelEyebrow}</span>
                <h2 className="workspace__panel-title">{dict.workspace.projectPanelTitle}</h2>
                <p className="workspace__panel-body">{dict.workspace.projectPanelBody}</p>
                <dl className="workspace__metrics">
                  <div>
                    <dt>{dict.workspace.wordCountLabel}</dt>
                    <dd>{words}</dd>
                  </div>
                  <div>
                    <dt>{dict.workspace.charCountLabel}</dt>
                    <dd>{characters}</dd>
                  </div>
                </dl>
              </Card>

              <Card className="workspace__panel-card workspace__panel-card--secondary">
                <span className="workspace__panel-eyebrow">{dict.workspace.recentDocumentsTitle}</span>
                <h3 className="workspace__panel-subtitle">{dict.workspace.recentDocumentsTitle}</h3>
                <p className="workspace__panel-body">{dict.workspace.recentDocumentsBody}</p>
                {recentDocuments.length > 0 ? (
                  <div className="workspace__recent-list">
                    {recentDocuments.map((summary) => (
                      <button
                        key={summary.id}
                        type="button"
                        className="workspace__recent-item"
                        onClick={() => handleSelectRecent(summary)}
                        title={summary.path ?? summary.title}
                      >
                        <span className="workspace__recent-title">{summary.title}</span>
                        <span className="workspace__recent-meta">
                          {summary.snippet || formatTimestamp(summary.lastOpenedAt)}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="workspace__panel-meta">{dict.workspace.fileMenu.recentEmpty}</p>
                )}
              </Card>

              <Card className="workspace__panel-card workspace__panel-card--secondary">
                <span className="workspace__panel-eyebrow">{dict.workspace.sessionTitle}</span>
                <h3 className="workspace__panel-subtitle">{dict.workspace.sessionTitle}</h3>
                <p className="workspace__panel-body">{dict.workspace.sessionBody}</p>
                <dl className="workspace__session-list">
                  <div>
                    <dt>{dict.workspace.savedAtLabel}</dt>
                    <dd>
                      {document?.lastSavedAt
                        ? formatTimestamp(document.lastSavedAt)
                        : dict.workspace.autosaveLabel}
                    </dd>
                  </div>
                  <div>
                    <dt>{dict.workspace.sessionUpdatedLabel}</dt>
                    <dd>
                      {document?.lastOpenedAt
                        ? formatTimestamp(document.lastOpenedAt)
                        : dict.workspace.autosaveLabel}
                    </dd>
                  </div>
                  <div>
                    <dt>{dict.workspace.sessionViewModeLabel}</dt>
                    <dd>{viewModeLabel(viewMode, dict.workspace)}</dd>
                  </div>
                  <div>
                    <dt>{dict.workspace.sessionStorageLabel}</dt>
                    <dd>
                      {document?.kind === 'file'
                        ? dict.workspace.sessionStorageFile
                        : dict.workspace.sessionStorageDraft}
                    </dd>
                  </div>
                </dl>
                <p className="workspace__panel-meta">{errorMessage ?? statusLabel(saveState, dict.workspace)}</p>
              </Card>
            </aside>
          </>
        )}
      </div>

      <DefaultMarkdownAppDialog
        open={defaultAppPromptOpen}
        platform={window.doku.system.platform}
        onClose={({ dontAskAgain }) => {
          const nextPrompt = {
            ...defaultAppPromptRef.current,
            dismissed: dontAskAgain,
            shown: true,
          };
          defaultAppPromptRef.current = nextPrompt;
          void onUpdate({ defaultMarkdownAppPrompt: nextPrompt });
          setDefaultAppPromptOpen(false);
        }}
        onOpenPreferences={({ dontAskAgain }) => {
          const nextPrompt = {
            ...defaultAppPromptRef.current,
            dismissed: dontAskAgain,
            shown: true,
          };
          defaultAppPromptRef.current = nextPrompt;
          void onUpdate({ defaultMarkdownAppPrompt: nextPrompt });
          void window.doku.system.openDefaultAppsPreferences();
          setDefaultAppPromptOpen(false);
        }}
      />
    </div>
  );
}

function hasImageFiles(event: ReactDragEvent<HTMLElement>): boolean {
  const { items, files } = event.dataTransfer;

  if (items.length > 0) {
    return Array.from(items).some(
      (item) => item.kind === 'file' && item.type.toLowerCase().startsWith('image/'),
    );
  }

  return Array.from(files).some((file) => isSupportedImageFile(getFilePath(file)));
}

function isSupportedImageFile(filePath: string): boolean {
  return /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(filePath);
}

function getFilePath(file: File): string {
  return typeof (file as File & { path?: string }).path === 'string'
    ? (file as File & { path: string }).path
    : file.name;
}

function createImageMarkdownSnippet(fileName: string, relativePath: string): string {
  const altText = fileName.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim() || 'Image';
  return `![${altText}](${relativePath})`;
}

function resolveImageImportErrorMessage(message: string, workspaceDict: Dictionary['workspace']): string {
  switch (message) {
    case 'documents:image-import:unsupported-format':
      return workspaceDict.imageImportUnsupported;
    case 'documents:image-import:document-missing':
      return workspaceDict.imageImportSaveFirst;
    case 'documents:image-import:source-missing':
      return workspaceDict.imageImportMissingSource;
    case 'documents:image-import:allocation-failed':
      return workspaceDict.imageImportAllocationFailed;
    default:
      return message;
  }
}

interface DocumentTabsProps {
  tabs: WorkspaceDocumentTab[];
  activeTabId: string | null;
  labels: Dictionary['workspace']['tabs'];
  onActivate: (tabId: string) => void;
  onClose: (tabId: string) => void;
  onReorder: (fromId: string, toId: string) => void;
  onReopenFromDisk: (tabId: string) => void;
}

function DocumentTabs({
  tabs,
  activeTabId,
  labels,
  onActivate,
  onClose,
  onReorder,
  onReopenFromDisk,
}: DocumentTabsProps) {
  const [draggingTabId, setDraggingTabId] = useState<string | null>(null);
  const [dropTargetTabId, setDropTargetTabId] = useState<string | null>(null);
  const tabRefs = useRef(new Map<string, HTMLDivElement>());

  useEffect(() => {
    if (!activeTabId) {
      return;
    }

    const activeTabElement = tabRefs.current.get(activeTabId);
    if (typeof activeTabElement?.scrollIntoView !== 'function') {
      return;
    }

    activeTabElement.scrollIntoView({
      block: 'nearest',
      inline: 'nearest',
      behavior: 'smooth',
    });
  }, [activeTabId]);

  if (tabs.length === 0) {
    return null;
  }

  return (
    <div className="workspace-tabs" role="tablist" aria-label={labels.label}>
      {tabs.map((tab) => {
        const title = tab.document
          ? resolveDocumentTabTitle(tab.document)
          : tab.summary?.title ?? '...';
        const isActive = tab.id === activeTabId;
        const isDragging = tab.id === draggingTabId;
        const isDropTarget = tab.id === dropTargetTabId && tab.id !== draggingTabId;
        const isErrored = tab.loadState === 'error';
        const errorLabel = tab.errorMessage ?? labels.missingDocumentFile;

        return (
          <div
            key={tab.id}
            ref={(element) => {
              if (element) {
                tabRefs.current.set(tab.id, element);
              } else {
                tabRefs.current.delete(tab.id);
              }
            }}
            className={[
              'workspace-tabs__item',
              isActive ? 'workspace-tabs__item--active' : '',
              isDragging ? 'workspace-tabs__item--dragging' : '',
              isDropTarget ? 'workspace-tabs__item--drop-target' : '',
            ].filter(Boolean).join(' ')}
            draggable
            onDragStart={(event) => {
              event.dataTransfer.effectAllowed = 'move';
              event.dataTransfer.setData('text/x-doku-tab-id', tab.id);
              setDraggingTabId(tab.id);
            }}
            onDragOver={(event) => {
              if (!draggingTabId || draggingTabId === tab.id) {
                return;
              }
              event.preventDefault();
              event.dataTransfer.dropEffect = 'move';
              setDropTargetTabId(tab.id);
            }}
            onDragLeave={() => {
              setDropTargetTabId((current) => (current === tab.id ? null : current));
            }}
            onDrop={(event) => {
              event.preventDefault();
              const fromId = event.dataTransfer.getData('text/x-doku-tab-id') || draggingTabId;
              setDraggingTabId(null);
              setDropTargetTabId(null);
              if (fromId) {
                onReorder(fromId, tab.id);
              }
            }}
            onDragEnd={() => {
              setDraggingTabId(null);
              setDropTargetTabId(null);
            }}
          >
            <button
              type="button"
              className="workspace-tabs__button"
              role="tab"
              aria-selected={isActive}
              title={title}
              onClick={() => onActivate(tab.id)}
            >
              <span
                className={`workspace-tabs__state workspace-tabs__state--${tab.saveState}`}
                aria-hidden="true"
              />
              {isErrored ? (
                <span className="workspace-tabs__warning" title={errorLabel} aria-label={errorLabel}>
                  <WarningIcon />
                </span>
              ) : null}
              <span className="workspace-tabs__title">{title}</span>
            </button>
            {isErrored ? (
              <button
                type="button"
                className="workspace-tabs__reopen"
                aria-label={`${labels.reopenFromDisk}: ${title}`}
                title={labels.reopenFromDisk}
                onClick={(event) => {
                  event.stopPropagation();
                  onReopenFromDisk(tab.id);
                }}
              >
                <ReopenIcon />
              </button>
            ) : null}
            <button
              type="button"
              className="workspace-tabs__close"
              aria-label={`${labels.close}: ${title}`}
              onClick={(event) => {
                event.stopPropagation();
                onClose(tab.id);
              }}
            >
              <CloseTabIcon />
            </button>
          </div>
        );
      })}
    </div>
  );
}

interface ResizeHandleProps {
  side: ResizeSide;
  onPointerDown: () => void;
  onKeyboardResize: (
    side: ResizeSide,
    direction: 'decrease' | 'increase' | 'min' | 'max',
  ) => void;
}

function ResizeHandle({ side, onPointerDown, onKeyboardResize }: ResizeHandleProps) {
  const dict = useDict();

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Home') {
      event.preventDefault();
      onKeyboardResize(side, 'min');
      return;
    }

    if (event.key === 'End') {
      event.preventDefault();
      onKeyboardResize(side, 'max');
      return;
    }

    if (side === 'left' && event.key === 'ArrowLeft') {
      event.preventDefault();
      onKeyboardResize(side, 'decrease');
      return;
    }

    if (side === 'left' && event.key === 'ArrowRight') {
      event.preventDefault();
      onKeyboardResize(side, 'increase');
      return;
    }

    if (side === 'right' && event.key === 'ArrowLeft') {
      event.preventDefault();
      onKeyboardResize(side, 'increase');
      return;
    }

    if (side === 'right' && event.key === 'ArrowRight') {
      event.preventDefault();
      onKeyboardResize(side, 'decrease');
    }
  };

  return (
    <button
      type="button"
      className={`workspace__resize workspace__resize--${side}`}
      aria-label={side === 'left' ? dict.workspace.resizeLeftPanel : dict.workspace.resizeRightPanel}
      onPointerDown={onPointerDown}
      onKeyDown={handleKeyDown}
    >
      <span className="workspace__resize-grip" />
    </button>
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function countWords(value: string): number {
  const normalized = value.trim();
  return normalized ? normalized.split(/\s+/).length : 0;
}

function removeSummaryFromLauncher(
  launcher: Settings['launcher'],
  summary: DocumentSummary,
): Settings['launcher'] {
  const recentDocuments = launcher.recentDocuments.filter((document) => document.id !== summary.id);

  return {
    recentDocuments,
    quickResumeId:
      launcher.quickResumeId === summary.id ? (recentDocuments[0]?.id ?? null) : launcher.quickResumeId,
  };
}

function toDocumentSummary(document: DocumentSession | null): DocumentSummary | null {
  if (!document) {
    return null;
  }

  return {
    id: document.id,
    kind: document.kind,
    title: document.title,
    path: document.path,
    snippet: document.snippet,
    lastOpenedAt: document.lastOpenedAt,
  };
}

function dedupeDocumentSummaries(summaries: DocumentSummary[]): DocumentSummary[] {
  const seen = new Set<string>();
  const nextSummaries: DocumentSummary[] = [];

  for (const summary of summaries) {
    const tabId = resolveSummaryTabId(summary);
    if (seen.has(tabId)) {
      continue;
    }

    seen.add(tabId);
    nextSummaries.push(summary);
  }

  return nextSummaries;
}

function reorderTabs(
  tabs: WorkspaceDocumentTab[],
  fromId: string,
  toId: string,
): WorkspaceDocumentTab[] {
  const fromIndex = tabs.findIndex((tab) => tab.id === fromId);
  const toIndex = tabs.findIndex((tab) => tab.id === toId);

  if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
    return tabs;
  }

  const nextTabs = [...tabs];
  const [movedTab] = nextTabs.splice(fromIndex, 1);
  if (!movedTab) {
    return tabs;
  }

  nextTabs.splice(toIndex, 0, movedTab);
  return nextTabs;
}

function resolveSummaryTabId(summary: DocumentSummary): string {
  return summary.path ? `file:${summary.path}` : `document:${summary.id}`;
}

function resolveDocumentTabId(document: DocumentSession): string {
  return document.path ? `file:${document.path}` : `document:${document.id}`;
}

function resolveDocumentTabTitle(document: DocumentSession): string {
  const title = resolveDocumentDisplayTitle(document.content, document.path, document.title);
  return title || document.title;
}

function resolveDocumentExportTitle(
  document: DocumentSession | null,
): string | undefined {
  if (!document) {
    return undefined;
  }

  return extractMarkdownTitle(document.content) ?? undefined;
}

function resolveDocumentSaveTitle(document: DocumentSession): string {
  const markdownTitle = extractMarkdownTitle(document.content);
  if (markdownTitle) {
    return markdownTitle;
  }

  if (document.path) {
    return fileNameWithoutExtension(document.path);
  }

  return 'document';
}

function resolveDocumentDisplayTitle(content: string, filePath: string | undefined, fallback: string): string {
  const markdownTitle = extractMarkdownTitle(content);
  if (markdownTitle) {
    return markdownTitle;
  }

  if (filePath) {
    return fileNameWithoutExtension(filePath);
  }

  return fallback;
}

function extractMarkdownTitle(content: string): string | null {
  const normalized = content.replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]?.trim();
    if (!line) {
      continue;
    }

    const atxHeading = line.match(/^#\s+(.+?)\s*#*$/);
    if (atxHeading?.[1]) {
      return atxHeading[1].trim();
    }

    const nextLine = lines[index + 1]?.trim();
    if (nextLine && (/^=+$/.test(nextLine) || /^-+$/.test(nextLine))) {
      return line;
    }

    return null;
  }

  return null;
}

function fileNameWithoutExtension(filePath: string): string {
  const filename = filePath.split(/[\\/]/).pop();
  return filename?.replace(/\.[^.]+$/, '') || filename || '';
}

function extractSnippet(value: string): string {
  const normalized = value
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join(' ');

  if (!normalized) {
    return '';
  }

  return normalized.length <= 220 ? normalized : `${normalized.slice(0, 219).trimEnd()}…`;
}

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function statusLabel(
  state: SaveState,
  dict: Settings['language'] extends never
    ? never
    : {
        savedStatus: string;
        dirtyStatus: string;
        savingStatus: string;
        errorStatus: string;
      },
): string {
  if (state === 'dirty') return dict.dirtyStatus;
  if (state === 'saving') return dict.savingStatus;
  if (state === 'error') return dict.errorStatus;
  return dict.savedStatus;
}

function viewModeLabel(
  viewMode: ViewMode,
  dict: Settings['language'] extends never
    ? never
    : {
        writeMode: string;
        previewMode: string;
        splitMode: string;
      },
): string {
  if (viewMode === 'preview') return dict.previewMode;
  if (viewMode === 'split') return dict.splitMode;
  return dict.writeMode;
}

interface FileMenuLabels {
  trigger: string;
  newDocument: string;
  openFile: string;
  recentHeading: string;
  recentEmpty: string;
}

interface FileMenuProps {
  labels: FileMenuLabels;
  recents: DocumentSummary[];
  onNew: () => void;
  onOpen: () => void;
  onSelectRecent: (summary: DocumentSummary) => void;
}

function FileMenu({ labels, recents, onNew, onOpen, onSelectRecent }: FileMenuProps) {
  const [open, setOpen] = useState(false);
  const [focusIndex, setFocusIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const menuId = 'workspace-file-menu';

  const items = useMemo<FileMenuItem[]>(() => {
    const base: FileMenuItem[] = [
      { key: 'new', label: labels.newDocument, action: onNew },
      { key: 'open', label: labels.openFile, action: onOpen },
    ];
    recents.forEach((summary) => {
      base.push({
        key: `recent:${summary.id}`,
        label: summary.title,
        action: () => onSelectRecent(summary),
      });
    });
    return base;
  }, [labels.newDocument, labels.openFile, onNew, onOpen, onSelectRecent, recents]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const node = containerRef.current;
      if (node && event.target instanceof Node && !node.contains(event.target)) {
        setOpen(false);
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleWindowKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }

      event.preventDefault();
      closeAndRestore();
    };

    window.addEventListener('keydown', handleWindowKeyDown);
    return () => {
      window.removeEventListener('keydown', handleWindowKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const target = itemRefs.current[focusIndex];
    target?.focus();
  }, [focusIndex, open]);

  const closeAndRestore = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  const handleTriggerKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setFocusIndex(0);
      setOpen(true);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setFocusIndex(items.length - 1);
      setOpen(true);
    }
  };

  const handleItemKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setFocusIndex((index + 1) % items.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setFocusIndex((index - 1 + items.length) % items.length);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      closeAndRestore();
    } else if (event.key === 'Home') {
      event.preventDefault();
      setFocusIndex(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      setFocusIndex(items.length - 1);
    } else if (event.key === 'Tab') {
      setOpen(false);
    }
  };

  const runAction = (item: FileMenuItem) => {
    setOpen(false);
    item.action();
  };

  return (
    <div className="file-menu" ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        className="file-menu__trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => {
          setFocusIndex(0);
          setOpen((value) => !value);
        }}
        onKeyDown={handleTriggerKeyDown}
      >
        <span>{labels.trigger}</span>
        <span className={`file-menu__chevron${open ? ' file-menu__chevron--open' : ''}`} aria-hidden>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M7 10l5 5 5-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
        </span>
      </button>

      {open && (
        <div id={menuId} role="menu" aria-label={labels.trigger} className="file-menu__popover">
          <div className="file-menu__section">
            <button
              type="button"
              role="menuitem"
              className="file-menu__item file-menu__item--action"
              ref={(node) => {
                itemRefs.current[0] = node;
              }}
              onClick={() => runAction(items[0]!)}
              onKeyDown={(event) => handleItemKeyDown(event, 0)}
            >
              <span className="file-menu__item-icon" aria-hidden>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                </svg>
              </span>
              <span className="file-menu__item-copy">
                <span className="file-menu__item-label">{labels.newDocument}</span>
              </span>
            </button>
            <button
              type="button"
              role="menuitem"
              className="file-menu__item file-menu__item--action"
              ref={(node) => {
                itemRefs.current[1] = node;
              }}
              onClick={() => runAction(items[1]!)}
              onKeyDown={(event) => handleItemKeyDown(event, 1)}
            >
              <span className="file-menu__item-icon" aria-hidden>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <path d="M5 8h5l2 2h7v8H5z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="file-menu__item-copy">
                <span className="file-menu__item-label">{labels.openFile}</span>
              </span>
            </button>
          </div>
          <div className="file-menu__separator" role="presentation" />
          <div className="file-menu__section">
            <div className="file-menu__heading" role="presentation">
              {labels.recentHeading}
            </div>
            {recents.length === 0 ? (
              <div className="file-menu__empty" role="presentation">
                {labels.recentEmpty}
              </div>
            ) : (
              recents.map((summary, recentIndex) => {
                const index = recentIndex + 2;
                return (
                  <button
                    key={summary.id}
                    type="button"
                    role="menuitem"
                    className="file-menu__item file-menu__item--recent"
                    ref={(node) => {
                      itemRefs.current[index] = node;
                    }}
                    onClick={() => runAction(items[index]!)}
                    onKeyDown={(event) => handleItemKeyDown(event, index)}
                    title={summary.path ?? summary.title}
                  >
                    <span className="file-menu__item-copy">
                      <span className="file-menu__item-label">{summary.title}</span>
                      <span className="file-menu__item-meta">{describeRecent(summary)}</span>
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface FileMenuItem {
  key: string;
  label: string;
  action: () => void;
}

function describeRecent(summary: DocumentSummary): string {
  if (summary.snippet.trim()) {
    return summary.snippet;
  }

  if (summary.path) {
    const filename = summary.path.split(/[\\/]/).pop();
    return filename ?? summary.path;
  }

  return summary.lastOpenedAt;
}

function PanelLeftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 5h16v14H4z" stroke="currentColor" strokeWidth="1.6" />
      <path d="M9 5v14" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function PanelRightIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 5h16v14H4z" stroke="currentColor" strokeWidth="1.6" />
      <path d="M15 5v14" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function QuickActionsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 7.5h12M6 12h7M6 16.5h9M17.5 10.5l2 2 3-4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function WriteModeIcon() {
  return (
    <svg className="workspace__mode-icon" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M6 18l3.4-.7L18 8.7 15.3 6 6.7 14.6z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M13.8 7.5l2.7 2.7M5 20h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function PreviewModeIcon() {
  return (
    <svg className="workspace__mode-icon" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4.5 12s2.8-5 7.5-5 7.5 5 7.5 5-2.8 5-7.5 5-7.5-5-7.5-5z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="2.2" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function SplitModeIcon() {
  return (
    <svg className="workspace__mode-icon" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 6h14v12H5zM12 6v12" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M7.5 9h2.2M7.5 12h2.8M14.5 10.2c.6-.7 1.3-1 2-1s1.4.3 2 1M14.5 13.8c.6.7 1.3 1 2 1s1.4-.3 2-1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function SaveIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M6 4h10l2 2v14H6z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M9 4v5h6V4M9 17h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SaveAsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 5h9l2 2v5.5" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M7 5v5h6V5M7 19h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 18.5l4.6-4.6 1.5 1.5-4.6 4.6H14z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function SaveStateIcon({ state }: { state: SaveState }) {
  if (state === 'dirty') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="1.7" />
        <path d="M12 7.5v5.2" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
        <circle cx="12" cy="16.2" r="1" fill="currentColor" />
      </svg>
    );
  }

  if (state === 'saving') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M12 5a7 7 0 017 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M19 12a7 7 0 01-7 7 7 7 0 01-7-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" opacity="0.42" />
      </svg>
    );
  }

  if (state === 'error') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M12 5l7.5 13H4.5z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
        <path d="M12 10v3.4M12 16.4v.1" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8.4 12.2l2.2 2.2 5-5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ExportIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M6 5h8l4 4v10H6z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M14 5v4h4M12 12v5M9.5 14.5L12 17l2.5-2.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function GuideIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5.5 5.5h6.2c1.3 0 2.3 1 2.3 2.3v10.7c0-1.2-1-2.2-2.2-2.2H5.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M18.5 5.5H14v13c0-1.2 1-2.2 2.2-2.2h2.3zM8 8.5h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 8.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M18.2 13.3l1.3 1-.8 1.5-1.6-.4a6.6 6.6 0 01-1.2 1l-.2 1.7h-1.7l-.2-1.7a6.4 6.4 0 01-1.5-.2l-1.2 1.2-1.5-.9.4-1.6a6.4 6.4 0 01-1-1.2l-1.7-.2v-1.7l1.7-.2c.1-.5.2-1 .4-1.4L6.8 8.8l.9-1.5 1.6.4a6.6 6.6 0 011.2-1l.2-1.7h1.7l.2 1.7c.5.1 1 .2 1.4.4l1.3-1.1 1.5.9-.4 1.6c.4.4.7.8 1 1.2l1.7.2v1.7l-1.7.2c-.1.5-.2 1-.4 1.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 11v4M12 8.2v.1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function CloseTabIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M7 7l10 10M17 7L7 17" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 4l8 15H4L12 4z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M12 9v4M12 16.5v.1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function ReopenIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M8 7h8a4 4 0 010 8h-5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M11 11l-4 4 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MarkdownActionIcon({ actionId }: { actionId: MarkdownActionId }) {
  switch (actionId) {
    case 'h1':
      return <TextHeadingIcon level="1" />;
    case 'h2':
      return <TextHeadingIcon level="2" />;
    case 'bold':
      return <TextMarkIcon mark="B" />;
    case 'italic':
      return <TextMarkIcon mark="I" italic />;
    case 'link':
      return <LinkIcon />;
    case 'image':
      return <ImageIcon />;
    case 'bullet-list':
      return <ListIcon ordered={false} />;
    case 'ordered-list':
      return <ListIcon ordered />;
    case 'checklist':
      return <ChecklistIcon />;
    case 'quote':
      return <QuoteIcon />;
    case 'inline-code':
      return <InlineCodeIcon />;
    case 'code-block':
      return <CodeBlockIcon />;
    case 'divider':
      return <DividerIcon />;
  }
}

function TextHeadingIcon({ level }: { level: '1' | '2' }) {
  return (
    <svg className="workspace__quick-action-icon" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 6v12M14 6v12M5 12h9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <text x="16" y="18" fill="currentColor" fontSize="8" fontWeight="700">
        {level}
      </text>
    </svg>
  );
}

function TextMarkIcon({ mark, italic = false }: { mark: 'B' | 'I'; italic?: boolean }) {
  return (
    <svg className="workspace__quick-action-icon" viewBox="0 0 24 24" fill="none" aria-hidden>
      <text
        x="7"
        y="17"
        fill="currentColor"
        fontFamily="Georgia, serif"
        fontSize="15"
        fontStyle={italic ? 'italic' : 'normal'}
        fontWeight={italic ? '700' : '800'}
      >
        {mark}
      </text>
      <path d="M5 20h14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.42" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg className="workspace__quick-action-icon" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M9.5 14.5l5-5M10 7.5l1.2-1.2a4 4 0 015.7 5.7L15.6 13.3M14 16.5l-1.2 1.2a4 4 0 01-5.7-5.7L8.4 10.7"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ImageIcon() {
  return (
    <svg className="workspace__quick-action-icon" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 7.5h14v9H5z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M7.5 15l3.3-3.2 2.5 2.4 1.5-1.5L18 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="15.8" cy="9.8" r="1" fill="currentColor" />
    </svg>
  );
}

function ListIcon({ ordered }: { ordered: boolean }) {
  return (
    <svg className="workspace__quick-action-icon" viewBox="0 0 24 24" fill="none" aria-hidden>
      {ordered ? (
        <>
          <text x="5" y="9" fill="currentColor" fontSize="5.5" fontWeight="700">1</text>
          <text x="5" y="14" fill="currentColor" fontSize="5.5" fontWeight="700">2</text>
          <text x="5" y="19" fill="currentColor" fontSize="5.5" fontWeight="700">3</text>
        </>
      ) : (
        <>
          <circle cx="7" cy="7.5" r="1.1" fill="currentColor" />
          <circle cx="7" cy="12" r="1.1" fill="currentColor" />
          <circle cx="7" cy="16.5" r="1.1" fill="currentColor" />
        </>
      )}
      <path d="M11 7.5h8M11 12h8M11 16.5h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function ChecklistIcon() {
  return (
    <svg className="workspace__quick-action-icon" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5.5 7.5l1.3 1.3 2.4-2.8M5.5 12l1.3 1.3 2.4-2.8M5.5 16.5l1.3 1.3 2.4-2.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 7.5h7M12 12h7M12 16.5h7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function QuoteIcon() {
  return (
    <svg className="workspace__quick-action-icon" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M8 8.5h3v3.2c0 2.4-1.1 4-3.2 4.8M15 8.5h3v3.2c0 2.4-1.1 4-3.2 4.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function InlineCodeIcon() {
  return (
    <svg className="workspace__quick-action-icon" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M9 8l-4 4 4 4M15 8l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CodeBlockIcon() {
  return (
    <svg className="workspace__quick-action-icon" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 6.5h14v11H5z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M9.5 10l-2 2 2 2M14.5 10l2 2-2 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DividerIcon() {
  return (
    <svg className="workspace__quick-action-icon" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="7" cy="12" r="1.2" fill="currentColor" opacity="0.42" />
      <circle cx="17" cy="12" r="1.2" fill="currentColor" opacity="0.42" />
    </svg>
  );
}

function TableIcon() {
  return (
    <svg className="workspace__quick-actions-table-icon" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 6h14v12H5zM5 10h14M9.5 6v12M14.5 6v12" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}
