export const IPC_CHANNELS = {
  settingsGet: 'settings:get',
  settingsSet: 'settings:set',
  systemAppInfo: 'system:app-info',
  systemPrefersDark: 'system:prefersDark',
  systemOpenExternal: 'system:open-external',
  systemListFonts: 'system:list-fonts',
  systemOpenDefaultAppsPreferences: 'system:open-default-apps-preferences',
  documentsOpenMarkdownFile: 'documents:open-markdown-file',
  documentsOpenDocumentAtPath: 'documents:open-document-at-path',
  documentsLoad: 'documents:load',
  documentsSave: 'documents:save',
  documentsImportAsset: 'documents:import-asset',
  documentsListWorkspaceTree: 'documents:list-workspace-tree',
  documentsCreateWorkspaceEntry: 'documents:create-workspace-entry',
  documentsWatchWorkspaceTree: 'documents:watch-workspace-tree',
  documentsUnwatchWorkspaceTree: 'documents:unwatch-workspace-tree',
  documentsWorkspaceTreeChanged: 'documents:workspace-tree-changed',
  exportsPdf: 'exports:pdf',
} as const;

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS];
