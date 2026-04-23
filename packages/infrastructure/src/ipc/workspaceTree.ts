import { extname } from 'node:path';

const MARKDOWN_EXTENSIONS = ['md', 'markdown', 'mdown'];
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp']);

export type WorkspaceTreeKind = 'directory' | 'markdown' | 'asset' | 'other';

export function classifyWorkspaceFile(fileName: string): WorkspaceTreeKind {
  const extension = extname(fileName).toLowerCase().replace('.', '');
  if (MARKDOWN_EXTENSIONS.includes(extension)) {
    return 'markdown';
  }
  if (IMAGE_EXTENSIONS.has(`.${extension}`)) {
    return 'asset';
  }
  return 'other';
}

export function compareWorkspaceEntries(
  left: { isDirectory(): boolean; name: string },
  right: { isDirectory(): boolean; name: string },
): number {
  if (left.isDirectory() !== right.isDirectory()) {
    return left.isDirectory() ? -1 : 1;
  }
  return left.name.localeCompare(right.name, undefined, { sensitivity: 'base' });
}
