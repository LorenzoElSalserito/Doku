import { useCallback, useEffect, useMemo } from 'react';
import type { DocumentSession } from '@doku/application';
import type { Dictionary } from '../../../i18n/keys.js';
import { useWorkspaceStore } from '../state/workspaceStore.js';
import type { SaveState, WorkspaceDocumentTab } from '../workspaceTypes.js';
import {
  createDraftDocumentId,
  logWorkspaceEvent,
  reorderTabs,
  resolveDocumentTabId,
  toDocumentSummary,
} from '../workspaceDocuments.js';

/**
 * Owns: every change to the tab list (activate, close, reorder, replace) and
 * the tab keyboard shortcuts (Ctrl+Tab, Ctrl+W, Ctrl+1…9).
 * Exposes: the active tab and its document plus setters scoped to it.
 * Does not: load or save documents from disk.
 */
export function useDocumentTabs(tabLabels: Dictionary['workspace']['tabs']) {
  const {
    tabs,
    activeTabId,
    tabsRef,
    setTabs,
    setActiveTabId,
    setActiveSummary,
    setDraftRequestId,
    setNoticeMessage,
  } = useWorkspaceStore();

  const activeTab = useMemo(
    () => tabs.find((tab) => tab.id === activeTabId) ?? null,
    [activeTabId, tabs],
  );

  const updateActiveTab = useCallback(
    (updater: (tab: WorkspaceDocumentTab) => WorkspaceDocumentTab) => {
      setTabs((current) => current.map((tab) => (tab.id === activeTabId ? updater(tab) : tab)));
    },
    [activeTabId, setTabs],
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

  const setActiveTabErrorMessage = useCallback(
    (nextMessage: string | null) => {
      updateActiveTab((tab) => ({ ...tab, errorMessage: nextMessage }));
    },
    [updateActiveTab],
  );

  const activateDocumentTab = useCallback(
    (nextDocument: DocumentSession, nextSaveState: SaveState = 'saved') => {
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
    },
    [setActiveTabId, setTabs],
  );

  const replaceActiveTabWithDocument = useCallback(
    (nextDocument: DocumentSession, nextSaveState: SaveState = 'saved') => {
      const nextTabId = resolveDocumentTabId(nextDocument);
      const nextTab: WorkspaceDocumentTab = {
        id: nextTabId,
        document: nextDocument,
        summary: toDocumentSummary(nextDocument),
        saveState: nextSaveState,
        loadState: 'ready',
        errorMessage: null,
      };

      setTabs((current) => {
        const activeIndex = current.findIndex((tab) => tab.id === activeTabId);
        const existingIndex = current.findIndex((tab) => tab.id === nextTabId);

        if (existingIndex !== -1) {
          return current
            .map((tab, index) => (index === existingIndex ? nextTab : tab))
            .filter((tab, index) => index !== activeIndex || tab.id === nextTabId);
        }

        if (activeIndex !== -1) {
          return current.map((tab, index) => (index === activeIndex ? nextTab : tab));
        }

        return [...current, nextTab];
      });
      setActiveTabId(nextTabId);
    },
    [activeTabId, setActiveTabId, setTabs],
  );

  const handleActivateTab = useCallback(
    (tabId: string) => {
      setActiveTabId(tabId);
      setNoticeMessage(null);
      logWorkspaceEvent('document-tab-activated', { tabId });
    },
    [setActiveTabId, setNoticeMessage],
  );

  const handleCloseTab = useCallback(
    (tabId: string) => {
      const closingTab = tabsRef.current.find((tab) => tab.id === tabId);
      if (!closingTab) {
        return;
      }

      if (closingTab.saveState === 'dirty' && !window.confirm(tabLabels.closeDirtyConfirm)) {
        return;
      }

      const remainingTabs = tabsRef.current.filter((tab) => tab.id !== tabId);
      if (remainingTabs.length === 0) {
        setActiveSummary(null);
        setDraftRequestId(createDraftDocumentId());
      } else if (tabId === activeTabId) {
        setActiveTabId(remainingTabs.at(-1)?.id ?? null);
      }

      setTabs(remainingTabs);
      setNoticeMessage(null);
      logWorkspaceEvent('document-tab-closed', { tabId });
    },
    [
      activeTabId,
      setActiveSummary,
      setActiveTabId,
      setDraftRequestId,
      setNoticeMessage,
      setTabs,
      tabLabels.closeDirtyConfirm,
      tabsRef,
    ],
  );

  const handleReorderTabs = useCallback(
    (fromId: string, toId: string) => {
      if (fromId === toId) {
        return;
      }

      setTabs((current) => reorderTabs(current, fromId, toId));
      logWorkspaceEvent('document-tabs-reordered', { fromId, toId });
    },
    [setTabs],
  );

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
  }, [activeTabId, handleActivateTab, handleCloseTab, tabsRef]);

  return {
    activeTab,
    document: activeTab?.document ?? null,
    saveState: activeTab?.saveState ?? ('saved' as SaveState),
    loadState: activeTab?.loadState ?? 'loading',
    errorMessage: activeTab?.errorMessage ?? null,
    setActiveTabDocument,
    setActiveTabSaveState,
    setActiveTabErrorMessage,
    activateDocumentTab,
    replaceActiveTabWithDocument,
    handleActivateTab,
    handleCloseTab,
    handleReorderTabs,
  };
}

export type DocumentTabsControls = ReturnType<typeof useDocumentTabs>;
