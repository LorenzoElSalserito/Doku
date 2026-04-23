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
  initialDocument: DocumentSummary | null;
  onUpdate: (patch: SettingsPatch) => Promise<void>;
  onOpenSettings: () => void;
  onOpenInfo: () => void;
  onOpenGuide: () => void;
  onOpenExport: (document: { title: string; content: string; path?: string }) => void;
}

type ResizeSide = 'left' | 'right';
type ViewMode = Settings['workspaceViewMode'];
type SaveState = 'saved' | 'dirty' | 'saving' | 'error';

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
  initialDocument,
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
  const [activeSummary, setActiveSummary] = useState<DocumentSummary | null>(initialDocument);
  const [draftToken, setDraftToken] = useState(0);
  const [document, setDocument] = useState<DocumentSession | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const [defaultAppPromptOpen, setDefaultAppPromptOpen] = useState(false);
  const [editorDropActive, setEditorDropActive] = useState(false);
  const [tableRows, setTableRows] = useState('2');
  const [tableColumns, setTableColumns] = useState('3');
  const [workspaceTree, setWorkspaceTree] = useState<WorkspaceNode[]>([]);
  const draftLayoutRef = useRef(layout);
  const autosaveTimeoutRef = useRef<number | null>(null);
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

  const saveDocument = useCallback(
    async (mode: 'save' | 'saveAs' | 'autosave') => {
      if (!document) {
        return;
      }

      setSaveState('saving');
      setErrorMessage(null);
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
          title: document.title || dict.workspace.untitledDocument,
          path: document.path,
          content: document.content,
          mode,
        });

        setDocument(result.document);
        await onUpdate({ launcher: result.launcher });
        if (
          mode !== 'autosave' &&
          result.document.kind === 'file' &&
          !defaultAppPromptRef.current.shown
        ) {
          const nextPrompt = {
            ...defaultAppPromptRef.current,
            shown: true,
          };
          defaultAppPromptRef.current = nextPrompt;
          await onUpdate({ defaultMarkdownAppPrompt: nextPrompt });
          setDefaultAppPromptOpen(true);
        }
        setSaveState('saved');
        logWorkspaceEvent('document-save-completed', {
          mode,
          id: result.document.id,
          kind: result.document.kind,
          path: result.document.path,
        });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : dict.workspace.editorErrorBody;
        if (message === 'Save operation canceled.') {
          setSaveState(document.path ? 'saved' : 'dirty');
          return;
        }
        setSaveState('error');
        setErrorMessage(message);
        logWorkspaceEvent('document-save-failed', { mode, message });
      }
    },
    [
      dict.workspace.editorErrorBody,
      dict.workspace.untitledDocument,
      document,
      onUpdate,
    ],
  );

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoadState('loading');
      setErrorMessage(null);

      try {
        if (!activeSummary) {
          const now = new Date().toISOString();
          if (cancelled) {
            return;
          }
          setDocument({
            id: `draft:${crypto.randomUUID()}`,
            kind: 'draft',
            title: dict.workspace.untitledDocument,
            content: '',
            snippet: '',
            lastOpenedAt: now,
            lastSavedAt: null,
          });
          setSaveState('saved');
          setLoadState('ready');
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
          setActiveSummary(null);
          setDraftToken((token) => token + 1);
          return;
        }
        setDocument(next);
        setSaveState('saved');
        setLoadState('ready');
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
        setLoadState('error');
        setErrorMessage(error instanceof Error ? error.message : dict.workspace.editorErrorBody);
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
    dict.workspace.untitledDocument,
    onUpdate,
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
  const breadcrumbs = useMemo(
    () => [dict.workspace.breadcrumbHome, dict.workspace.breadcrumbWorkspace],
    [dict.workspace],
  );
  const previewContent = document?.content ?? '';
  const words = useMemo(() => countWords(previewContent), [previewContent]);
  const characters = previewContent.length;
  const exportTitle = resolveDocumentExportTitle(document, dict.workspace.untitledDocument);
  const recentDocuments = useMemo(
    () => settings.launcher.recentDocuments.filter((summary) => summary.id !== document?.id).slice(0, 4),
    [document?.id, settings.launcher.recentDocuments],
  );

  const viewOptions: SegmentedOption<ViewMode>[] = [
    { value: 'write', label: dict.workspace.writeMode },
    { value: 'preview', label: dict.workspace.previewMode },
    { value: 'split', label: dict.workspace.splitMode },
  ];

  const handleViewModeChange = useCallback(
    (nextMode: ViewMode) => {
      setViewMode(nextMode);
      logWorkspaceEvent('workspace-view-mode-changed', { viewMode: nextMode });
      void onUpdate({ workspaceViewMode: nextMode });
    },
    [onUpdate],
  );

  const toggleQuickActions = useCallback(() => {
    const nextVisible = !quickActionsVisible;
    setQuickActionsVisible(nextVisible);
    logWorkspaceEvent('workspace-quick-actions-toggled', { visible: nextVisible });
    void onUpdate({ workspaceQuickActionsVisible: nextVisible });
  }, [onUpdate, quickActionsVisible]);

  const handleContentChange = (nextValue: string) => {
    setDocument((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        content: nextValue,
        snippet: extractSnippet(nextValue),
        lastOpenedAt: new Date().toISOString(),
      };
    });
    setSaveState('dirty');
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
    setActiveSummary({
      id: result.document.id,
      kind: result.document.kind,
      title: result.document.title,
      path: result.document.path,
      snippet: result.document.snippet,
      lastOpenedAt: result.document.lastOpenedAt,
    });
  }, [onUpdate]);

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
      setActiveSummary({
        id: result.document.id,
        kind: result.document.kind,
        title: result.document.title,
        path: result.document.path,
        snippet: result.document.snippet,
        lastOpenedAt: result.document.lastOpenedAt,
      });
    },
    [onUpdate],
  );

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
      setErrorMessage(dict.workspace.workspaceExplorer.createFileError);
      setSaveState('error');
      logWorkspaceEvent('workspace-file-create-failed', { name });
    }
  }, [dict.workspace.workspaceExplorer, document?.path, handleOpenWorkspaceFile, refreshWorkspaceTree]);

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
      setErrorMessage(dict.workspace.workspaceExplorer.createFolderError);
      setSaveState('error');
      logWorkspaceEvent('workspace-folder-create-failed', { documentPath: document.path, name });
    }
  }, [dict.workspace.workspaceExplorer, document?.path, refreshWorkspaceTree]);

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
        setErrorMessage(dict.workspace.imageImportSaveFirst);
        setSaveState('error');
        logWorkspaceEvent('image-import-failed', { reason: 'document-not-saved' });
        return;
      }

      const imageFile = Array.from(event.dataTransfer.files).find((file) =>
        isSupportedImageFile(getFilePath(file)),
      );

      const sourcePath = imageFile ? getFilePath(imageFile) : null;
      if (!sourcePath) {
        setErrorMessage(dict.workspace.editorErrorBody);
        setSaveState('error');
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
        setErrorMessage(null);
        setSaveState('dirty');
        logWorkspaceEvent('image-import-completed', {
          fileName: imported.fileName,
          assetPath: imported.assetPath,
        });
      } catch (error: unknown) {
        const message =
          error instanceof Error
            ? resolveImageImportErrorMessage(error.message, dict.workspace)
            : dict.workspace.editorErrorBody;
        setErrorMessage(message);
        setSaveState('error');
        logWorkspaceEvent('image-import-failed', { message });
      }
    },
    [dict.workspace, document?.path],
  );

  useEffect(() => {
    if (viewMode !== 'split') {
      return;
    }

    const pane = editorPaneRef.current;
    if (!pane) {
      return;
    }

    const handleWheel = (event: WheelEvent) => {
      if (event.defaultPrevented) {
        return;
      }
      const preview = previewScrollRef.current;
      if (!preview) {
        return;
      }
      preview.scrollTop += event.deltaY;
    };

    pane.addEventListener('wheel', handleWheel, { passive: true });
    return () => {
      pane.removeEventListener('wheel', handleWheel);
    };
  }, [viewMode, loadState]);

  return (
    <div className="workspace">
      <div className="workspace__topbar">
        <header className="workspace__header">
          <div className="workspace__header-main">
            <FileMenu
              labels={dict.workspace.fileMenu}
              recents={settings.launcher.recentDocuments.slice(0, 5)}
              onNew={handleNewDocument}
              onOpen={() => void handleOpenFile()}
              onSelectRecent={handleSelectRecent}
            />
            <nav className="workspace__breadcrumbs" aria-label={dict.workspace.breadcrumbWorkspace}>
              {breadcrumbs.map((item, index) => (
                <span key={`${item}-${index}`} className="workspace__crumb">
                  {item}
                </span>
              ))}
            </nav>
          </div>

          <div className="workspace__header-side">
            <div className="workspace__status">
              <span className="workspace__status-pill" role="status" aria-live="polite">
                {statusLabel(saveState, dict.workspace)}
              </span>
              <span className="workspace__status-pill workspace__status-pill--quiet">
                {document?.kind === 'file' ? dict.workspace.fileLabel : dict.workspace.draftLabel}
              </span>
            </div>

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
                <Button variant="secondary" size="sm" onClick={() => void saveDocument('save')}>
                  {dict.workspace.save}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => void saveDocument('saveAs')}>
                  {dict.workspace.saveAs}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    onOpenExport({
                      title: exportTitle,
                      content: document?.content ?? '',
                      path: document?.path,
                    })
                  }
                >
                  {dict.workspace.export}
                </Button>
              </div>

              <div className="workspace__action-group workspace__action-group--secondary">
                <Button variant="ghost" size="sm" onClick={onOpenGuide}>
                  {dict.workspace.guide}
                </Button>
                <Button variant="secondary" size="sm" onClick={onOpenSettings}>
                  {dict.workspace.settings}
                </Button>
                <Button variant="ghost" size="sm" onClick={onOpenInfo}>
                  {dict.workspace.info}
                </Button>
              </div>
            </div>
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
                      />
                    </section>
                  )}

                  {(viewMode === 'preview' || viewMode === 'split') && (
                    <section className="workspace__editor-pane workspace__editor-pane--preview">
                      <div className="workspace__preview-head">
                        <span className="workspace__panel-eyebrow">{dict.workspace.previewEyebrow}</span>
                      </div>
                      <div ref={previewScrollRef} className="workspace__preview-scroll">
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
        onClose={() => {
          const nextPrompt = {
            ...defaultAppPromptRef.current,
            dismissed: true,
          };
          defaultAppPromptRef.current = nextPrompt;
          void onUpdate({ defaultMarkdownAppPrompt: nextPrompt });
          setDefaultAppPromptOpen(false);
        }}
        onOpenPreferences={() => {
          const nextPrompt = {
            ...defaultAppPromptRef.current,
            dismissed: true,
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

function resolveDocumentExportTitle(
  document: DocumentSession | null,
  fallback: string,
): string {
  if (!document?.path) {
    return fallback;
  }

  const filename = document.path.split(/[\\/]/).pop();
  return filename?.replace(/\.[^.]+$/, '') || fallback;
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
