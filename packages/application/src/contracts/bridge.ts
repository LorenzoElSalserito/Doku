import type {
  DocumentOperationResult,
  DocumentSaveRequest,
  DocumentSession,
  DocumentSummary,
  PdfExportRequest,
  PdfExportResult,
  Settings,
  SettingsPatch,
} from '@doku/schemas';

export type Platform =
  | 'aix'
  | 'android'
  | 'darwin'
  | 'freebsd'
  | 'haiku'
  | 'linux'
  | 'openbsd'
  | 'sunos'
  | 'win32'
  | 'cygwin'
  | 'netbsd';

export interface SettingsBridge {
  get: () => Promise<Settings>;
  set: (patch: SettingsPatch) => Promise<Settings>;
}

export interface SystemBridge {
  platform: Platform;
  appInfo: () => Promise<{
    name: string;
    version: string;
  }>;
  prefersDark: () => Promise<boolean>;
  openExternal: (url: string) => Promise<void>;
  listFonts: () => Promise<string[]>;
  openDefaultAppsPreferences: () => Promise<void>;
}

export interface DocumentsBridge {
  openMarkdownFile: () => Promise<DocumentOperationResult | null>;
  loadDocument: (summary: DocumentSummary) => Promise<DocumentSession | null>;
  saveDocument: (input: DocumentSaveRequest) => Promise<DocumentOperationResult>;
}

export interface ExportsBridge {
  exportPdf: (input: PdfExportRequest) => Promise<PdfExportResult>;
}

export interface DokuBridge {
  settings: SettingsBridge;
  system: SystemBridge;
  documents: DocumentsBridge;
  exports: ExportsBridge;
}

declare global {
  interface Window {
    doku: DokuBridge;
  }
}
