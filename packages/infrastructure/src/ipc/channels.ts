export const IPC_CHANNELS = {
  settingsGet: 'settings:get',
  settingsSet: 'settings:set',
  systemAppInfo: 'system:app-info',
  systemPrefersDark: 'system:prefersDark',
  systemOpenExternal: 'system:open-external',
  systemListFonts: 'system:list-fonts',
  systemOpenDefaultAppsPreferences: 'system:open-default-apps-preferences',
  documentsOpenMarkdownFile: 'documents:open-markdown-file',
  documentsLoad: 'documents:load',
  documentsSave: 'documents:save',
  exportsPdf: 'exports:pdf',
} as const;

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS];
