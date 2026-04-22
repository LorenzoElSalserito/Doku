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
  },
  documents: {
    openMarkdownFile: () => ipcRenderer.invoke(IPC_CHANNELS.documentsOpenMarkdownFile),
    loadDocument: (summary) => ipcRenderer.invoke(IPC_CHANNELS.documentsLoad, summary),
    saveDocument: (input) => ipcRenderer.invoke(IPC_CHANNELS.documentsSave, input),
  },
  exports: {
    exportPdf: (input) => ipcRenderer.invoke(IPC_CHANNELS.exportsPdf, input),
  },
};

contextBridge.exposeInMainWorld('doku', bridge);
