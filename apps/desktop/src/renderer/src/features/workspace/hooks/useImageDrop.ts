import {
  useCallback,
  useRef,
  useState,
  type DragEvent as ReactDragEvent,
  type MutableRefObject,
} from 'react';
import type { Dictionary } from '../../../i18n/keys.js';
import type { MonacoEditorHandle } from '../MonacoEditor.js';
import type { SaveState } from '../workspaceTypes.js';
import { logWorkspaceEvent } from '../workspaceDocuments.js';
import {
  createImageMarkdownSnippet,
  getFilePath,
  hasImageFiles,
  isSupportedImageFile,
  resolveImageImportErrorMessage,
} from '../imageImport.js';

interface ImageDropOptions {
  documentPath: string | undefined;
  workspaceDict: Dictionary['workspace'];
  monacoEditorRef: MutableRefObject<MonacoEditorHandle | null>;
  setNoticeMessage: (message: string | null) => void;
  setActiveTabErrorMessage: (message: string | null) => void;
  setActiveTabSaveState: (state: SaveState) => void;
}

/**
 * Owns: dragging image files onto the editor pane and importing them next to
 * the document, then inserting the Markdown image snippet.
 * Exposes: the drop-zone flag and the four drag handlers.
 * Does not: accept drops on unsaved drafts (they have no folder yet).
 */
export function useImageDrop({
  documentPath,
  workspaceDict,
  monacoEditorRef,
  setNoticeMessage,
  setActiveTabErrorMessage,
  setActiveTabSaveState,
}: ImageDropOptions) {
  const [editorDropActive, setEditorDropActive] = useState(false);
  const dropDepthRef = useRef(0);

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

      if (!documentPath) {
        setActiveTabErrorMessage(workspaceDict.imageImportSaveFirst);
        setActiveTabSaveState('error');
        logWorkspaceEvent('image-import-failed', { reason: 'document-not-saved' });
        return;
      }

      const imageFile = Array.from(event.dataTransfer.files).find((file) =>
        isSupportedImageFile(getFilePath(file)),
      );

      const sourcePath = imageFile ? getFilePath(imageFile) : null;
      if (!sourcePath) {
        setActiveTabErrorMessage(workspaceDict.editorErrorBody);
        setActiveTabSaveState('error');
        logWorkspaceEvent('image-import-failed', { reason: 'unsupported-source' });
        return;
      }

      try {
        logWorkspaceEvent('image-import-started', {
          documentPath,
          sourcePath,
        });
        const imported = await window.doku.documents.importAsset({
          documentPath,
          sourcePath,
          strategy: 'project-assets',
        });

        const markdownToInsert = createImageMarkdownSnippet(
          imported.fileName,
          imported.relativePath,
        );
        monacoEditorRef.current?.insertText(markdownToInsert);
        setNoticeMessage(
          workspaceDict.imageImportSuccess.replace('{{fileName}}', imported.fileName),
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
            ? resolveImageImportErrorMessage(error.message, workspaceDict)
            : workspaceDict.editorErrorBody;
        setActiveTabErrorMessage(message);
        setActiveTabSaveState('error');
        logWorkspaceEvent('image-import-failed', { message });
      }
    },
    [
      workspaceDict,
      documentPath,
      monacoEditorRef,
      setActiveTabErrorMessage,
      setActiveTabSaveState,
      setNoticeMessage,
    ],
  );

  return {
    editorDropActive,
    handleEditorDragEnter,
    handleEditorDragOver,
    handleEditorDragLeave,
    handleEditorDrop,
  };
}

export type ImageDropControls = ReturnType<typeof useImageDrop>;
