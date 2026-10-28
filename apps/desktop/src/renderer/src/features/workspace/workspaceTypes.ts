import type { DocumentSession, DocumentSummary, Settings, SettingsPatch } from '@doku/application';

/** Types and limits shared by the workspace components, hooks and store. */

export interface WorkspaceProps {
  settings: Settings;
  initialTabs: DocumentSummary[];
  initialActiveTabId: string | null;
  onUpdate: (patch: SettingsPatch) => Promise<void>;
  onOpenSettings: () => void;
  onOpenInfo: () => void;
  onOpenGuide: () => void;
  onOpenExport: (document: { title: string; content: string; path?: string }) => void;
  onReady?: (context?: Record<string, unknown>) => void;
}

export type ResizeSide = 'left' | 'right';
export type ResizeDirection = 'decrease' | 'increase' | 'min' | 'max';
export type ViewMode = Settings['workspaceViewMode'];
export type SaveState = 'saved' | 'dirty' | 'saving' | 'error';
export type LoadState = 'loading' | 'ready' | 'missing' | 'error';
export type EditorReadiness = 'pending' | 'ready' | 'fallback';
export type SaveMode = 'save' | 'saveAs' | 'autosave';

export interface WorkspaceDocumentTab {
  id: string;
  document: DocumentSession | null;
  summary: DocumentSummary | null;
  saveState: SaveState;
  loadState: LoadState;
  errorMessage: string | null;
}

export const LEFT_MIN = 220;
export const LEFT_MAX = 420;
export const RIGHT_MIN = 260;
export const RIGHT_MAX = 520;
export const PREVIEW_ZOOM_MIN = 0.5;
export const PREVIEW_ZOOM_MAX = 3;
export const PREVIEW_ZOOM_STEP = 0.1;
export const PREVIEW_FIT_WIDTH_ZOOM = 1.9;
export const PREVIEW_FIT_LENGTH_ZOOM = 0.75;
export const RESIZE_KEYBOARD_STEP = 24;
export const MONACO_READY_TIMEOUT_MS = 10000;
