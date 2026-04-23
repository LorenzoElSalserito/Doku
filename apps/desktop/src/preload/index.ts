import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../../../../packages/infrastructure/src/ipc/channels.js';
import type { DokuBridge, Platform } from '@doku/application';

const bridge: DokuBridge = {
  settings: {
    get: () => ipcRenderer.invoke(IPC_CHANNELS.settingsGet),
    set: (patch) => ipcRenderer.invoke(IPC_CHANNELS.settingsSet, patch),
  },
  system: {
    platform: process.platform as Platform,
    appInfo: () => ipcRenderer.invoke(IPC_CHANNELS.systemAppInfo),
    prefersDark: () => ipcRenderer.invoke(IPC_CHANNELS.systemPrefersDark),
    openExternal: (url) => ipcRenderer.invoke(IPC_CHANNELS.systemOpenExternal, url),
    listFonts: () => ipcRenderer.invoke(IPC_CHANNELS.systemListFonts),
    openDefaultAppsPreferences: () =>
      ipcRenderer.invoke(IPC_CHANNELS.systemOpenDefaultAppsPreferences),
    diagnostics: () => ipcRenderer.invoke(IPC_CHANNELS.systemDiagnostics),
    logEvent: (event, context) =>
      ipcRenderer.invoke(IPC_CHANNELS.systemLogEvent, { event, context }),
    prepareForUninstall: () => ipcRenderer.invoke(IPC_CHANNELS.systemPrepareForUninstall),
  },
  documents: {
    openMarkdownFile: () => ipcRenderer.invoke(IPC_CHANNELS.documentsOpenMarkdownFile),
    openDocumentAtPath: (filePath) => ipcRenderer.invoke(IPC_CHANNELS.documentsOpenDocumentAtPath, filePath),
    loadDocument: (summary) => ipcRenderer.invoke(IPC_CHANNELS.documentsLoad, summary),
    saveDocument: (input) => ipcRenderer.invoke(IPC_CHANNELS.documentsSave, input),
    importAsset: (input) => ipcRenderer.invoke(IPC_CHANNELS.documentsImportAsset, input),
    listWorkspaceTree: (documentPath) => ipcRenderer.invoke(IPC_CHANNELS.documentsListWorkspaceTree, documentPath),
    createWorkspaceFile: (documentPath, name) =>
      ipcRenderer.invoke(IPC_CHANNELS.documentsCreateWorkspaceEntry, {
        documentPath,
        name,
        kind: 'markdown',
      }),
    createWorkspaceFolder: (documentPath, name) =>
      ipcRenderer.invoke(IPC_CHANNELS.documentsCreateWorkspaceEntry, {
        documentPath,
        name,
        kind: 'directory',
      }),
    watchWorkspaceTree: (documentPath, onChange) => {
      const watchId = `workspace:${Date.now()}:${Math.random().toString(36).slice(2)}`;
      const handler = (_event: Electron.IpcRendererEvent, payload: { watchId?: string }) => {
        if (payload.watchId === watchId) {
          onChange();
        }
      };

      ipcRenderer.on(IPC_CHANNELS.documentsWorkspaceTreeChanged, handler);
      void ipcRenderer.invoke(IPC_CHANNELS.documentsWatchWorkspaceTree, { watchId, documentPath });

      return () => {
        ipcRenderer.removeListener(IPC_CHANNELS.documentsWorkspaceTreeChanged, handler);
        void ipcRenderer.invoke(IPC_CHANNELS.documentsUnwatchWorkspaceTree, watchId);
      };
    },
  },
  exports: {
    exportPdf: (input) => ipcRenderer.invoke(IPC_CHANNELS.exportsPdf, input),
  },
};

contextBridge.exposeInMainWorld('doku', bridge);
