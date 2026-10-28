import { useEffect, useMemo, useRef } from 'react';
import { useDict } from '../../i18n/I18nProvider.js';
import { DefaultMarkdownAppDialog } from './DefaultMarkdownAppDialog.js';
import { EditorPanes } from './EditorPanes.js';
import type { MonacoEditorHandle } from './MonacoEditor.js';
import { QuickActionsBar } from './QuickActionsBar.js';
import { ResizeHandle } from './ResizeHandle.js';
import { WorkspaceHeader } from './WorkspaceHeader.js';
import { DocumentInfoPanel, ExplorerPanel } from './WorkspaceSidePanels.js';
import { useAutosave } from './hooks/useAutosave.js';
import { useDocumentLoader } from './hooks/useDocumentLoader.js';
import { useDocumentOpening } from './hooks/useDocumentOpening.js';
import { useDocumentTabs } from './hooks/useDocumentTabs.js';
import { useEditorReadiness } from './hooks/useEditorReadiness.js';
import { useImageDrop } from './hooks/useImageDrop.js';
import { useImmersiveMode } from './hooks/useImmersiveMode.js';
import { usePreviewZoom } from './hooks/usePreviewZoom.js';
import { useQuickActions } from './hooks/useQuickActions.js';
import { useResizablePanels } from './hooks/useResizablePanels.js';
import { useSessionRestore } from './hooks/useSessionRestore.js';
import { useViewMode } from './hooks/useViewMode.js';
import { useWorkspaceTree } from './hooks/useWorkspaceTree.js';
import { useWorkspaceStore } from './state/workspaceStore.js';
import type { WorkspaceProps } from './workspaceTypes.js';
import {
  extractSnippet,
  resolveDocumentDisplayTitle,
  resolveDocumentExportTitle,
} from './workspaceDocuments.js';

/**
 * Composes the workspace: wires the hooks to the header, the quick actions
 * bar, the side panels and the editor panes. Holds no state of its own beyond
 * the shared editor and preview refs.
 */
export function WorkspaceShell({
  settings,
  initialTabs,
  initialActiveTabId,
  onUpdate,
  onOpenSettings,
  onOpenInfo,
  onOpenGuide,
  onOpenExport,
  onReady,
}: WorkspaceProps) {
  const dict = useDict();
  const { tabs, activeTabId, sessionRestoreComplete, noticeMessage, setNoticeMessage } =
    useWorkspaceStore();
  const previewScrollRef = useRef<HTMLDivElement | null>(null);
  const monacoEditorRef = useRef<MonacoEditorHandle | null>(null);
  const launcherRef = useRef(settings.launcher);

  const zoom = usePreviewZoom();

  useEffect(() => {
    launcherRef.current = settings.launcher;
  }, [settings.launcher]);

  const panels = useResizablePanels(settings.workspace, onUpdate);
  const { viewMode, handleViewModeChange, handleEditorScrollChange, handlePreviewWheel } =
    useViewMode(settings.workspaceViewMode, onUpdate, previewScrollRef, monacoEditorRef);
  const quickActions = useQuickActions({ settings, viewMode, onUpdate, monacoEditorRef });
  const documentTabs = useDocumentTabs(dict.workspace.tabs);
  const { document, saveState, loadState, errorMessage } = documentTabs;
  const readiness = useEditorReadiness({
    hasDocument: Boolean(document),
    viewMode,
    tabs,
    activeTabId,
    sessionRestoreComplete,
    onReady,
  });
  const opening = useDocumentOpening(onUpdate, documentTabs.activateDocumentTab);
  const tree = useWorkspaceTree({
    documentPath: document?.path,
    lastSavedAt: document?.lastSavedAt,
    explorerLabels: dict.workspace.workspaceExplorer,
    openWorkspaceFile: opening.handleOpenWorkspaceFile,
    setActiveTabErrorMessage: documentTabs.setActiveTabErrorMessage,
    setActiveTabSaveState: documentTabs.setActiveTabSaveState,
  });
  useSessionRestore({
    initialTabs,
    initialActiveTabId,
    persistedSession: { tabs: settings.sessionTabs, active: settings.activeSessionTabId },
    launcherRef,
    onUpdate,
    dict,
  });
  useDocumentLoader(dict, launcherRef, onUpdate);
  const { saveDocument, defaultAppPromptOpen, closeDefaultAppPrompt } = useAutosave({
    document,
    saveState,
    defaultMarkdownAppPrompt: settings.defaultMarkdownAppPrompt,
    dict,
    onUpdate,
    replaceActiveTabWithDocument: documentTabs.replaceActiveTabWithDocument,
    setActiveTabSaveState: documentTabs.setActiveTabSaveState,
    setActiveTabErrorMessage: documentTabs.setActiveTabErrorMessage,
  });
  const imageDrop = useImageDrop({
    documentPath: document?.path,
    workspaceDict: dict.workspace,
    monacoEditorRef,
    setNoticeMessage,
    setActiveTabErrorMessage: documentTabs.setActiveTabErrorMessage,
    setActiveTabSaveState: documentTabs.setActiveTabSaveState,
  });
  const { immersive, toggleImmersive } = useImmersiveMode();

  const layout = panels.layout;
  const recentDocuments = useMemo(
    () =>
      settings.launcher.recentDocuments
        .filter((summary) => summary.id !== document?.id)
        .slice(0, 4),
    [document?.id, settings.launcher.recentDocuments],
  );

  const handleContentChange = (nextValue: string) => {
    documentTabs.setActiveTabDocument((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        title: resolveDocumentDisplayTitle(
          nextValue,
          current.path,
          dict.workspace.untitledDocument,
        ),
        content: nextValue,
        snippet: extractSnippet(nextValue),
        lastOpenedAt: new Date().toISOString(),
      };
    });
    documentTabs.setActiveTabSaveState('dirty');
  };

  return (
    <div className={immersive ? 'workspace workspace--immersive' : 'workspace'}>
      <div className="workspace__topbar">
        <WorkspaceHeader
          recents={settings.launcher.recentDocuments.slice(0, 5)}
          tabs={tabs}
          activeTabId={activeTabId}
          layout={layout}
          quickActionsVisible={quickActions.quickActionsVisible}
          viewMode={viewMode}
          saveState={saveState}
          onNewDocument={opening.handleNewDocument}
          onOpenFile={() => void opening.handleOpenFile()}
          onSelectRecent={opening.handleSelectRecent}
          onActivateTab={documentTabs.handleActivateTab}
          onCloseTab={documentTabs.handleCloseTab}
          onReorderTabs={documentTabs.handleReorderTabs}
          onReopenTabFromDisk={opening.handleReopenTabFromDisk}
          onToggleLeft={panels.toggleLeft}
          onToggleQuickActions={quickActions.toggleQuickActions}
          onToggleRight={panels.toggleRight}
          onViewModeChange={handleViewModeChange}
          onSave={() => void saveDocument('save')}
          onSaveAs={() => void saveDocument('saveAs')}
          onExport={() =>
            onOpenExport({
              title: resolveDocumentExportTitle(document) ?? '',
              content: document?.content ?? '',
              path: document?.path,
            })
          }
          onOpenGuide={onOpenGuide}
          onOpenSettings={onOpenSettings}
          onOpenInfo={onOpenInfo}
        />

        {quickActions.quickActionsVisible ? (
          <QuickActionsBar viewMode={viewMode} controls={quickActions} />
        ) : null}
      </div>

      <div className="workspace__body">
        {!layout.leftPanelCollapsed && (
          <>
            <ExplorerPanel
              style={panels.leftStyle}
              document={document}
              workspaceTree={tree.workspaceTree}
              onOpenFile={(path) => void opening.handleOpenWorkspaceFile(path)}
              onCreateFile={() => void tree.handleCreateWorkspaceFile()}
              onCreateFolder={() => void tree.handleCreateWorkspaceFolder()}
            />

            <ResizeHandle
              side="left"
              onPointerDown={() => panels.startDrag('left')}
              onKeyboardResize={panels.resizeFromKeyboard}
            />
          </>
        )}

        <EditorPanes
          document={document}
          loadState={loadState}
          errorMessage={errorMessage}
          noticeMessage={noticeMessage}
          viewMode={viewMode}
          useTextareaEditor={readiness.safeMode || readiness.plainTextFallbackEnabled}
          monacoEditorRef={monacoEditorRef}
          previewScrollRef={previewScrollRef}
          imageDrop={imageDrop}
          zoom={zoom}
          contentColorStyle={quickActions.contentColorStyle}
          immersive={immersive}
          onToggleImmersive={toggleImmersive}
          onContentChange={handleContentChange}
          onEditorScrollChange={handleEditorScrollChange}
          onPreviewWheel={handlePreviewWheel}
          onMonacoReady={readiness.handleMonacoReady}
          onMonacoError={readiness.handleMonacoError}
        />

        {!layout.rightPanelCollapsed && (
          <>
            <ResizeHandle
              side="right"
              onPointerDown={() => panels.startDrag('right')}
              onKeyboardResize={panels.resizeFromKeyboard}
            />

            <DocumentInfoPanel
              style={panels.rightStyle}
              document={document}
              recentDocuments={recentDocuments}
              saveState={saveState}
              errorMessage={errorMessage}
              viewMode={viewMode}
              onSelectRecent={opening.handleSelectRecent}
            />
          </>
        )}
      </div>

      <DefaultMarkdownAppDialog
        open={defaultAppPromptOpen}
        platform={window.doku.system.platform}
        onClose={(choice) => closeDefaultAppPrompt(choice, false)}
        onOpenPreferences={(choice) => closeDefaultAppPrompt(choice, true)}
      />
    </div>
  );
}
