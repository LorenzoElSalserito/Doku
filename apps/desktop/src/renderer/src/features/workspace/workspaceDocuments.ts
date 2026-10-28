import type { DocumentSession, DocumentSummary, Settings } from '@doku/application';
import type { SaveState, ViewMode, WorkspaceDocumentTab } from './workspaceTypes.js';

/** Pure helpers on documents, tabs and labels shared by the workspace modules. */

export function logWorkspaceEvent(event: string, context?: Record<string, unknown>): void {
  void (
    window.doku.system as {
      logEvent?: (event: string, context?: Record<string, unknown>) => Promise<void>;
    }
  ).logEvent?.(event, context);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function roundZoom(value: number): number {
  return Math.round(value * 100) / 100;
}

export function countWords(value: string): number {
  const normalized = value.trim();
  return normalized ? normalized.split(/\s+/).length : 0;
}

export function removeSummaryFromLauncher(
  launcher: Settings['launcher'],
  summary: DocumentSummary,
): Settings['launcher'] {
  const recentDocuments = launcher.recentDocuments.filter((document) => document.id !== summary.id);

  return {
    recentDocuments,
    quickResumeId:
      launcher.quickResumeId === summary.id
        ? (recentDocuments[0]?.id ?? null)
        : launcher.quickResumeId,
  };
}

export function toDocumentSummary(document: DocumentSession | null): DocumentSummary | null {
  if (!document) {
    return null;
  }

  return {
    id: document.id,
    kind: document.kind,
    title: document.title,
    path: document.path,
    snippet: document.snippet,
    lastOpenedAt: document.lastOpenedAt,
  };
}

export function dedupeDocumentSummaries(summaries: DocumentSummary[]): DocumentSummary[] {
  const seen = new Set<string>();
  const nextSummaries: DocumentSummary[] = [];

  for (const summary of summaries) {
    const tabId = resolveSummaryTabId(summary);
    if (seen.has(tabId)) {
      continue;
    }

    seen.add(tabId);
    nextSummaries.push(summary);
  }

  return nextSummaries;
}

export function reorderTabs(
  tabs: WorkspaceDocumentTab[],
  fromId: string,
  toId: string,
): WorkspaceDocumentTab[] {
  const fromIndex = tabs.findIndex((tab) => tab.id === fromId);
  const toIndex = tabs.findIndex((tab) => tab.id === toId);

  if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
    return tabs;
  }

  const nextTabs = [...tabs];
  const [movedTab] = nextTabs.splice(fromIndex, 1);
  if (!movedTab) {
    return tabs;
  }

  nextTabs.splice(toIndex, 0, movedTab);
  return nextTabs;
}

export function resolveSummaryTabId(summary: DocumentSummary): string {
  return summary.path ? `file:${summary.path}` : `document:${summary.id}`;
}

export function resolveDocumentTabId(document: DocumentSession): string {
  return document.path ? `file:${document.path}` : `document:${document.id}`;
}

export function resolveDraftTabId(draftId: string): string {
  return `document:${draftId}`;
}

export function createEmptyDraftFromSummary(summary: DocumentSummary): DocumentSession {
  const now = new Date().toISOString();
  return {
    id: summary.id,
    kind: 'draft',
    title: summary.title,
    content: '',
    snippet: '',
    lastOpenedAt: now,
    lastSavedAt: null,
  };
}

export function createDraftDocumentId(): string {
  return `draft:${crypto.randomUUID()}`;
}

export function resolveDocumentTabTitle(document: DocumentSession): string {
  const title = resolveDocumentDisplayTitle(document.content, document.path, document.title);
  return title || document.title;
}

export function resolveDocumentExportTitle(document: DocumentSession | null): string | undefined {
  if (!document) {
    return undefined;
  }

  return extractMarkdownTitle(document.content) ?? undefined;
}

export function resolveDocumentSaveTitle(document: DocumentSession): string {
  const markdownTitle = extractMarkdownTitle(document.content);
  if (markdownTitle) {
    return markdownTitle;
  }

  if (document.path) {
    return fileNameWithoutExtension(document.path);
  }

  return 'document';
}

export function resolveDocumentDisplayTitle(
  content: string,
  filePath: string | undefined,
  fallback: string,
): string {
  const markdownTitle = extractMarkdownTitle(content);
  if (markdownTitle) {
    return markdownTitle;
  }

  if (filePath) {
    return fileNameWithoutExtension(filePath);
  }

  return fallback;
}

export function extractMarkdownTitle(content: string): string | null {
  const normalized = content.replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]?.trim();
    if (!line) {
      continue;
    }

    const atxHeading = line.match(/^#\s+(.+?)\s*#*$/);
    if (atxHeading?.[1]) {
      return atxHeading[1].trim();
    }

    const nextLine = lines[index + 1]?.trim();
    if (nextLine && (/^=+$/.test(nextLine) || /^-+$/.test(nextLine))) {
      return line;
    }

    return null;
  }

  return null;
}

export function fileNameWithoutExtension(filePath: string): string {
  const filename = filePath.split(/[\\/]/).pop();
  return filename?.replace(/\.[^.]+$/, '') || filename || '';
}

export function extractSnippet(value: string): string {
  const normalized = value
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join(' ');

  if (!normalized) {
    return '';
  }

  return normalized.length <= 220 ? normalized : `${normalized.slice(0, 219).trimEnd()}…`;
}

export function dirnameOf(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/');
  const index = normalized.lastIndexOf('/');
  return index <= 0 ? normalized : normalized.slice(0, index);
}

export function basenameOf(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/').replace(/\/+$/, '');
  return normalized.slice(normalized.lastIndexOf('/') + 1);
}

export function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function statusLabel(
  state: SaveState,
  dict: Settings['language'] extends never
    ? never
    : {
        savedStatus: string;
        dirtyStatus: string;
        savingStatus: string;
        errorStatus: string;
      },
): string {
  if (state === 'dirty') return dict.dirtyStatus;
  if (state === 'saving') return dict.savingStatus;
  if (state === 'error') return dict.errorStatus;
  return dict.savedStatus;
}

export function viewModeLabel(
  viewMode: ViewMode,
  dict: Settings['language'] extends never
    ? never
    : {
        writeMode: string;
        previewMode: string;
        splitMode: string;
      },
): string {
  if (viewMode === 'preview') return dict.previewMode;
  if (viewMode === 'split') return dict.splitMode;
  return dict.writeMode;
}
