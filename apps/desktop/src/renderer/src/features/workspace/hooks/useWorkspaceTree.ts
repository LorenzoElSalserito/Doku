import { useCallback, useEffect, useState } from 'react';
import type { WorkspaceNode } from '@doku/application';
import type { Dictionary } from '../../../i18n/keys.js';
import type { SaveState } from '../workspaceTypes.js';
import { logWorkspaceEvent } from '../workspaceDocuments.js';

interface WorkspaceTreeOptions {
  documentPath: string | undefined;
  lastSavedAt: string | null | undefined;
  explorerLabels: Dictionary['workspace']['workspaceExplorer'];
  openWorkspaceFile: (filePath: string) => Promise<void>;
  setActiveTabErrorMessage: (message: string | null) => void;
  setActiveTabSaveState: (state: SaveState) => void;
}

/**
 * Owns: the folder tree around the active file (refreshed on save and on
 * file-system changes) and creating files and folders in it.
 * Exposes: the tree and the create handlers.
 * Does not: render the explorer.
 */
export function useWorkspaceTree({
  documentPath,
  lastSavedAt,
  explorerLabels,
  openWorkspaceFile,
  setActiveTabErrorMessage,
  setActiveTabSaveState,
}: WorkspaceTreeOptions) {
  const [workspaceTree, setWorkspaceTree] = useState<WorkspaceNode[]>([]);

  const refreshWorkspaceTree = useCallback(async () => {
    if (!documentPath) {
      setWorkspaceTree([]);
      return;
    }

    try {
      const nodes = await window.doku.documents.listWorkspaceTree(documentPath);
      setWorkspaceTree(nodes);
    } catch {
      setWorkspaceTree([]);
    }
  }, [documentPath]);

  useEffect(() => {
    void refreshWorkspaceTree();
  }, [lastSavedAt, refreshWorkspaceTree]);

  useEffect(() => {
    if (!documentPath) {
      return undefined;
    }

    return window.doku.documents.watchWorkspaceTree(documentPath, () => {
      void refreshWorkspaceTree();
    });
  }, [documentPath, refreshWorkspaceTree]);

  const handleCreateWorkspaceFile = useCallback(async () => {
    if (!documentPath) {
      return;
    }

    const name = window.prompt(explorerLabels.newFilePrompt);
    if (!name?.trim()) {
      return;
    }

    try {
      const result = await window.doku.documents.createWorkspaceFile(documentPath, name);
      await refreshWorkspaceTree();
      await openWorkspaceFile(result.path);
      logWorkspaceEvent('workspace-file-created', { path: result.path });
    } catch {
      setActiveTabErrorMessage(explorerLabels.createFileError);
      setActiveTabSaveState('error');
      logWorkspaceEvent('workspace-file-create-failed', { name });
    }
  }, [
    explorerLabels,
    documentPath,
    openWorkspaceFile,
    refreshWorkspaceTree,
    setActiveTabErrorMessage,
    setActiveTabSaveState,
  ]);

  const handleCreateWorkspaceFolder = useCallback(async () => {
    if (!documentPath) {
      return;
    }

    const name = window.prompt(explorerLabels.newFolderPrompt);
    if (!name?.trim()) {
      return;
    }

    try {
      await window.doku.documents.createWorkspaceFolder(documentPath, name);
      await refreshWorkspaceTree();
      logWorkspaceEvent('workspace-folder-created', { documentPath, name });
    } catch {
      setActiveTabErrorMessage(explorerLabels.createFolderError);
      setActiveTabSaveState('error');
      logWorkspaceEvent('workspace-folder-create-failed', { documentPath, name });
    }
  }, [
    explorerLabels,
    documentPath,
    refreshWorkspaceTree,
    setActiveTabErrorMessage,
    setActiveTabSaveState,
  ]);

  return { workspaceTree, handleCreateWorkspaceFile, handleCreateWorkspaceFolder };
}
