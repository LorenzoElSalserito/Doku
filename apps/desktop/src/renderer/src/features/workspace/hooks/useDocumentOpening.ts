import { useCallback, useEffect } from 'react';
import type { DocumentSession, DocumentSummary, SettingsPatch } from '@doku/application';
import { useWorkspaceStore } from '../state/workspaceStore.js';
import type { SaveState } from '../workspaceTypes.js';
import {
  createDraftDocumentId,
  logWorkspaceEvent,
  resolveDocumentTabId,
  toDocumentSummary,
} from '../workspaceDocuments.js';

/**
 * Owns: the ways a document gets opened: new draft (Ctrl+N), open dialog,
 * recent list, explorer, operating system request, reopen of a missing tab.
 * Exposes: one handler per entry point.
 * Does not: read files itself beyond the preload document API.
 */
export function useDocumentOpening(
  onUpdate: (patch: SettingsPatch) => Promise<void>,
  activateDocumentTab: (document: DocumentSession, saveState?: SaveState) => void,
) {
  const {
    tabsRef,
    setTabs,
    setActiveTabId,
    setActiveSummary,
    setDraftRequestId,
    setNoticeMessage,
  } = useWorkspaceStore();

  const handleNewDocument = useCallback(() => {
    setNoticeMessage(null);
    logWorkspaceEvent('document-new-requested');
    setActiveSummary(null);
    setDraftRequestId(createDraftDocumentId());
  }, [setActiveSummary, setDraftRequestId, setNoticeMessage]);

  useEffect(() => {
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      const usesPrimaryModifier = event.metaKey || event.ctrlKey;
      if (
        !usesPrimaryModifier ||
        event.altKey ||
        event.shiftKey ||
        event.key.toLowerCase() !== 'n'
      ) {
        return;
      }

      event.preventDefault();
      handleNewDocument();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleNewDocument]);

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
  }, [activateDocumentTab, onUpdate, setNoticeMessage]);

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
        const withoutDuplicate = current.filter((tab) => tab.id === tabId || tab.id !== nextTabId);

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
    [onUpdate, setActiveTabId, setNoticeMessage, setTabs],
  );

  const handleSelectRecent = useCallback(
    (summary: DocumentSummary) => {
      setNoticeMessage(null);
      logWorkspaceEvent('document-recent-selected', {
        id: summary.id,
        title: summary.title,
        path: summary.path,
      });
      setActiveSummary(summary);
    },
    [setActiveSummary, setNoticeMessage],
  );

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
    [activateDocumentTab, onUpdate, setActiveTabId, setNoticeMessage, tabsRef],
  );

  useEffect(() => {
    return window.doku.documents.onOpenFileRequest((filePath) => {
      void handleOpenWorkspaceFile(filePath);
    });
  }, [handleOpenWorkspaceFile]);

  return {
    handleNewDocument,
    handleOpenFile,
    handleReopenTabFromDisk,
    handleSelectRecent,
    handleOpenWorkspaceFile,
  };
}
