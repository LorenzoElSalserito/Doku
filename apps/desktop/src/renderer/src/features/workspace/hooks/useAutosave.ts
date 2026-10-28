import { useCallback, useEffect, useRef, useState } from 'react';
import type { DocumentSession, Settings, SettingsPatch } from '@doku/application';
import type { Dictionary } from '../../../i18n/keys.js';
import type { SaveMode, SaveState } from '../workspaceTypes.js';
import { logWorkspaceEvent, resolveDocumentSaveTitle } from '../workspaceDocuments.js';

interface AutosaveOptions {
  document: DocumentSession | null;
  saveState: SaveState;
  defaultMarkdownAppPrompt: Settings['defaultMarkdownAppPrompt'];
  dict: Dictionary;
  onUpdate: (patch: SettingsPatch) => Promise<void>;
  replaceActiveTabWithDocument: (document: DocumentSession, saveState?: SaveState) => void;
  setActiveTabSaveState: (state: SaveState) => void;
  setActiveTabErrorMessage: (message: string | null) => void;
}

/**
 * Owns: saving the active document (save, save as, 900 ms autosave, Ctrl+S /
 * Ctrl+Shift+S) and the one-time "default Markdown app" prompt after a save.
 * Exposes: `saveDocument` and the prompt state with its close handler.
 * Does not: track dirty state; the editor marks the tab dirty.
 */
export function useAutosave({
  document,
  saveState,
  defaultMarkdownAppPrompt,
  dict,
  onUpdate,
  replaceActiveTabWithDocument,
  setActiveTabSaveState,
  setActiveTabErrorMessage,
}: AutosaveOptions) {
  const [defaultAppPromptOpen, setDefaultAppPromptOpen] = useState(false);
  const defaultAppPromptRef = useRef(defaultMarkdownAppPrompt);
  const autosaveTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    defaultAppPromptRef.current = defaultMarkdownAppPrompt;
  }, [defaultMarkdownAppPrompt]);

  const saveDocument = useCallback(
    async (mode: SaveMode) => {
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
          title: mode === 'autosave' ? document.title : resolveDocumentSaveTitle(document),
          path: document.path,
          content: document.content,
          mode,
        });

        replaceActiveTabWithDocument(result.document, 'saved');
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
      document,
      onUpdate,
      replaceActiveTabWithDocument,
      setActiveTabErrorMessage,
      setActiveTabSaveState,
    ],
  );

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

  const closeDefaultAppPrompt = useCallback(
    ({ dontAskAgain }: { dontAskAgain: boolean }, openPreferences: boolean) => {
      const nextPrompt = {
        ...defaultAppPromptRef.current,
        dismissed: dontAskAgain,
        shown: true,
      };
      defaultAppPromptRef.current = nextPrompt;
      void onUpdate({ defaultMarkdownAppPrompt: nextPrompt });
      if (openPreferences) {
        void window.doku.system.openDefaultAppsPreferences();
      }
      setDefaultAppPromptOpen(false);
    },
    [onUpdate],
  );

  return { saveDocument, defaultAppPromptOpen, closeDefaultAppPrompt };
}
