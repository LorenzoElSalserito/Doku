import { useEffect, useRef, type MutableRefObject } from 'react';
import type { DocumentSummary, Settings, SettingsPatch } from '@doku/application';
import type { Dictionary } from '../../../i18n/keys.js';
import { useWorkspaceStore } from '../state/workspaceStore.js';
import type { LoadState } from '../workspaceTypes.js';
import {
  createEmptyDraftFromSummary,
  dedupeDocumentSummaries,
  logWorkspaceEvent,
  removeSummaryFromLauncher,
  resolveSummaryTabId,
  toDocumentSummary,
} from '../workspaceDocuments.js';

interface SessionRestoreOptions {
  initialTabs: DocumentSummary[];
  initialActiveTabId: string | null;
  persistedSession: { tabs: Settings['sessionTabs']; active: Settings['activeSessionTabId'] };
  launcherRef: MutableRefObject<Settings['launcher']>;
  onUpdate: (patch: SettingsPatch) => Promise<void>;
  dict: Dictionary;
}

/**
 * Owns: reopening the tabs of the previous session at mount and persisting
 * the open tabs (debounced) whenever they change afterwards.
 * Exposes: nothing; it writes to the workspace store and to settings.
 * Does not: open new documents on request (see useDocumentLoader).
 */
export function useSessionRestore({
  initialTabs,
  initialActiveTabId,
  persistedSession,
  launcherRef,
  onUpdate,
  dict,
}: SessionRestoreOptions) {
  const {
    tabs,
    activeTabId,
    sessionRestoreComplete,
    setTabs,
    setActiveTabId,
    setSessionRestoreComplete,
    setNoticeMessage,
  } = useWorkspaceStore();
  const initialTabsRef = useRef(initialTabs);
  const initialActiveTabIdRef = useRef(initialActiveTabId);
  const restoreMessagesRef = useRef({
    editorErrorBody: dict.workspace.editorErrorBody,
    missingDocumentFile: dict.workspace.tabs.missingDocumentFile,
    missingDocumentNotice: dict.workspace.missingDocumentNotice,
  });
  const initialOnUpdateRef = useRef(onUpdate);
  const sessionPersistTimeoutRef = useRef<number | null>(null);
  const lastPersistedSessionRef = useRef<string>(JSON.stringify(persistedSession));

  useEffect(() => {
    const initialSessionTabs = initialTabsRef.current;
    const initialSessionActiveTabId = initialActiveTabIdRef.current;
    const restoreMessages = restoreMessagesRef.current;

    if (initialSessionTabs.length === 0) {
      logWorkspaceEvent('workspace-restore-skipped', { reason: 'no-session-tabs' });
      setSessionRestoreComplete(true);
      return undefined;
    }

    let cancelled = false;
    const summaries = dedupeDocumentSummaries(initialSessionTabs).slice(0, 40);
    const tabIds = summaries.map(resolveSummaryTabId);
    const initialActiveId =
      initialSessionActiveTabId && tabIds.includes(initialSessionActiveTabId)
        ? initialSessionActiveTabId
        : (tabIds[0] ?? null);

    setSessionRestoreComplete(false);
    logWorkspaceEvent('workspace-restore-started', {
      tabs: summaries.length,
      requestedActiveTabId: initialSessionActiveTabId,
      resolvedActiveTabId: initialActiveId,
    });
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
      const restoreResults = await Promise.all(
        summaries.map(async (summary) => {
          const tabId = resolveSummaryTabId(summary);
          logWorkspaceEvent('workspace-restore-tab-started', {
            tabId,
            id: summary.id,
            kind: summary.kind,
            path: summary.path,
          });
          try {
            const next = await window.doku.documents.loadDocument(summary);
            if (cancelled) {
              return null;
            }

            if (!next) {
              if (summary.kind === 'draft') {
                const restoredDraft = createEmptyDraftFromSummary(summary);
                setTabs((current) =>
                  current.map((tab) =>
                    tab.id === tabId
                      ? {
                          ...tab,
                          document: restoredDraft,
                          summary: toDocumentSummary(restoredDraft),
                          saveState: 'saved',
                          loadState: 'ready',
                          errorMessage: null,
                        }
                      : tab,
                  ),
                );
                logWorkspaceEvent('workspace-restore-draft-empty', {
                  tabId,
                  id: summary.id,
                  title: summary.title,
                });
                logWorkspaceEvent('workspace-restore-tab-ready', {
                  tabId,
                  id: restoredDraft.id,
                  kind: restoredDraft.kind,
                });
                return { tabId, loadState: 'ready' as LoadState };
              }

              const nextLauncher = removeSummaryFromLauncher(launcherRef.current, summary);
              await initialOnUpdateRef.current({ launcher: nextLauncher });
              if (cancelled) {
                return null;
              }
              setTabs((current) =>
                current.map((tab) =>
                  tab.id === tabId
                    ? {
                        ...tab,
                        summary,
                        loadState: 'missing',
                        errorMessage: restoreMessages.missingDocumentFile,
                      }
                    : tab,
                ),
              );
              logWorkspaceEvent('workspace-restore-tab-missing', {
                tabId,
                id: summary.id,
                kind: summary.kind,
                path: summary.path,
              });
              logWorkspaceEvent('document-session-tab-missing', {
                id: summary.id,
                path: summary.path,
              });
              return { tabId, loadState: 'missing' as LoadState };
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
            logWorkspaceEvent('workspace-restore-tab-ready', {
              tabId,
              id: next.id,
              kind: next.kind,
              path: next.path,
            });
            return { tabId, loadState: 'ready' as LoadState };
          } catch (error: unknown) {
            if (cancelled) {
              return null;
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
              tabId,
              id: summary.id,
              kind: summary.kind,
              path: summary.path,
              message: error instanceof Error ? error.message : restoreMessages.editorErrorBody,
            });
            logWorkspaceEvent('workspace-restore-tab-failed', {
              tabId,
              id: summary.id,
              kind: summary.kind,
              path: summary.path,
              message: error instanceof Error ? error.message : restoreMessages.editorErrorBody,
            });
            return { tabId, loadState: 'error' as LoadState };
          }
        }),
      );

      if (!cancelled) {
        setNoticeMessage(null);
        setSessionRestoreComplete(true);
        const completedRestoreResults = restoreResults.filter((result) => result !== null);
        const readyTabs = completedRestoreResults.filter(
          (result) => result.loadState === 'ready',
        ).length;
        const missingTabs = completedRestoreResults.filter(
          (result) => result.loadState === 'missing',
        ).length;
        const erroredTabs = completedRestoreResults.filter(
          (result) => result.loadState === 'error',
        ).length;
        const activeTabState =
          completedRestoreResults.find((result) => result.tabId === initialActiveId)?.loadState ??
          null;
        logWorkspaceEvent('workspace-restore-completed', {
          tabs: summaries.length,
          readyTabs,
          missingTabs,
          erroredTabs,
          activeTabId: initialActiveId,
          activeTabState,
        });
        if (activeTabState === 'missing') {
          logWorkspaceEvent('active-tab-missing', { activeTabId: initialActiveId });
        }
      }
    };

    void restore();

    return () => {
      cancelled = true;
    };
    // Mount only: the setters and refs below are stable.
  }, [launcherRef, setActiveTabId, setNoticeMessage, setSessionRestoreComplete, setTabs]);

  useEffect(() => {
    if (!sessionRestoreComplete) {
      return;
    }

    const summaries: DocumentSummary[] = tabs.flatMap((tab) => {
      if (
        tab.loadState === 'ready' &&
        tab.document !== null &&
        ((tab.document.kind === 'file' &&
          typeof tab.document.path === 'string' &&
          tab.document.path.length > 0) ||
          (tab.document.kind === 'draft' &&
            (tab.id === activeTabId || tab.document.content.trim().length > 0)))
      ) {
        return [
          {
            id: tab.document.id,
            kind: tab.document.kind,
            title: tab.document.title,
            path: tab.document.path,
            snippet: tab.document.snippet,
            lastOpenedAt: tab.document.lastOpenedAt,
          },
        ];
      }

      if (
        tab.loadState === 'missing' &&
        tab.summary !== null &&
        tab.summary.kind === 'file' &&
        typeof tab.summary.path === 'string' &&
        tab.summary.path.length > 0
      ) {
        return [tab.summary];
      }

      return [];
    });

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
}
