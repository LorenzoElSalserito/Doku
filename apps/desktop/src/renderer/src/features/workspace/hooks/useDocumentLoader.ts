import { useEffect, type MutableRefObject } from 'react';
import type { DocumentSession, Settings, SettingsPatch } from '@doku/application';
import type { Dictionary } from '../../../i18n/keys.js';
import { useWorkspaceStore } from '../state/workspaceStore.js';
import {
  createDraftDocumentId,
  logWorkspaceEvent,
  removeSummaryFromLauncher,
  resolveDraftTabId,
  resolveSummaryTabId,
  toDocumentSummary,
} from '../workspaceDocuments.js';

/**
 * Owns: turning an open request (a recent summary or a new draft id in the
 * store) into a loaded tab, once the session restore has finished.
 * Exposes: nothing; it writes tabs, the active tab and the notice to the store.
 * Does not: decide what to open (useDocumentOpening sets the request).
 */
export function useDocumentLoader(
  dict: Dictionary,
  launcherRef: MutableRefObject<Settings['launcher']>,
  onUpdate: (patch: SettingsPatch) => Promise<void>,
) {
  const {
    activeSummary,
    draftRequestId,
    sessionRestoreComplete,
    tabsRef,
    setTabs,
    setActiveTabId,
    setNoticeMessage,
  } = useWorkspaceStore();

  useEffect(() => {
    if (!sessionRestoreComplete) {
      return undefined;
    }

    if (!activeSummary && tabsRef.current.length > 0 && !draftRequestId) {
      return undefined;
    }

    let cancelled = false;
    const requestedDraftId = draftRequestId ?? createDraftDocumentId();
    const requestedTabId = activeSummary
      ? resolveSummaryTabId(activeSummary)
      : resolveDraftTabId(requestedDraftId);

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
          tab.id === requestedTabId ? { ...tab, loadState: 'loading', errorMessage: null } : tab,
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
            id: requestedDraftId,
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
          logWorkspaceEvent('workspace-load-tab-missing', {
            tabId: requestedTabId,
            id: activeSummary.id,
            kind: activeSummary.kind,
            path: activeSummary.path,
          });
          setTabs((current) =>
            current.map((tab) =>
              tab.id === requestedTabId
                ? {
                    ...tab,
                    summary: activeSummary,
                    loadState: 'missing',
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
                  errorMessage:
                    error instanceof Error ? error.message : dict.workspace.editorErrorBody,
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
    draftRequestId,
    dict.workspace.editorErrorBody,
    dict.workspace.missingDocumentNotice,
    dict.workspace.tabs.missingDocumentFile,
    dict.workspace.untitledDocument,
    launcherRef,
    onUpdate,
    sessionRestoreComplete,
    setActiveTabId,
    setNoticeMessage,
    setTabs,
    tabsRef,
  ]);
}
