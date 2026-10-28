import type { DragEvent as ReactDragEvent } from 'react';
import type { Dictionary } from '../../i18n/keys.js';

/** Helpers for images dropped on the editor pane. */

export function hasImageFiles(event: ReactDragEvent<HTMLElement>): boolean {
  const { items, files } = event.dataTransfer;

  if (items.length > 0) {
    return Array.from(items).some(
      (item) => item.kind === 'file' && item.type.toLowerCase().startsWith('image/'),
    );
  }

  return Array.from(files).some((file) => isSupportedImageFile(getFilePath(file)));
}

export function isSupportedImageFile(filePath: string): boolean {
  return /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(filePath);
}

export function getFilePath(file: File): string {
  return typeof (file as File & { path?: string }).path === 'string'
    ? (file as File & { path: string }).path
    : file.name;
}

export function createImageMarkdownSnippet(fileName: string, relativePath: string): string {
  const altText =
    fileName
      .replace(/\.[^.]+$/, '')
      .replace(/[-_]+/g, ' ')
      .trim() || 'Image';
  return `![${altText}](${relativePath})`;
}

export function resolveImageImportErrorMessage(
  message: string,
  workspaceDict: Dictionary['workspace'],
): string {
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
