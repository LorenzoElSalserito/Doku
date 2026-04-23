/** Master shape of all translatable strings. Ogni lingua soddisfa questo tipo. */
export interface Dictionary {
  app: {
    name: string;
    loading: string;
    errorTitle: string;
    unknownError: string;
    skipToEditor: string;
  };
  languages: {
    it: string;
    en: string;
    es: string;
    de: string;
    fr: string;
    pt: string;
  };
  themes: {
    light: string;
    lightDescription: string;
    dark: string;
    darkDescription: string;
    custom: string;
    customDescription: string;
    system: string;
    systemDescription: string;
  };
  wizard: {
    eyebrow: string;
    steps: {
      language: string;
      theme: string;
      confirm: string;
    };
    language: {
      title: string;
      subtitle: string;
    };
    theme: {
      title: string;
      subtitle: string;
      previewHeading: string;
      previewBody: string;
    };
    confirm: {
      title: string;
      subtitle: string;
      languageLabel: string;
      themeLabel: string;
      nextSteps: string;
    };
    actions: {
      back: string;
      next: string;
      finish: string;
    };
  };
  workspace: {
    breadcrumbHome: string;
    breadcrumbWorkspace: string;
    untitledDocument: string;
    statusLocal: string;
    statusReady: string;
    leftPanelLabel: string;
    rightPanelLabel: string;
    guide: string;
    export: string;
    settings: string;
    info: string;
    fileMenu: {
      trigger: string;
      newDocument: string;
      openFile: string;
      recentHeading: string;
      recentEmpty: string;
    };
    quickActions: {
      toggleShow: string;
      toggleHide: string;
      barLabel: string;
      tableButton: string;
      tableRows: string;
      tableColumns: string;
      tableInsert: string;
      h1: string;
      h2: string;
      bold: string;
      italic: string;
      link: string;
      image: string;
      bulletList: string;
      orderedList: string;
      checklist: string;
      quote: string;
      inlineCode: string;
      codeBlock: string;
      divider: string;
    };
    workspaceExplorer: {
      title: string;
      body: string;
      empty: string;
      draftHint: string;
      openFolder: string;
      newFile: string;
      newFolder: string;
      newFilePrompt: string;
      newFolderPrompt: string;
      createFileError: string;
      createFolderError: string;
      directory: string;
      markdown: string;
      asset: string;
      other: string;
    };
    projectPanelEyebrow: string;
    projectPanelTitle: string;
    projectPanelBody: string;
    projectPanelMeta: string;
    outlineTitle: string;
    outlineBody: string;
    notesTitle: string;
    notesBody: string;
    previewTitle: string;
    previewBody: string;
    editorEyebrow: string;
    editorTitle: string;
    editorBody: string;
    editorHint: string;
    editorLoading: string;
    editorErrorTitle: string;
    editorErrorBody: string;
    missingDocumentNotice: string;
    save: string;
    saveAs: string;
    writeMode: string;
    previewMode: string;
    splitMode: string;
    previewEyebrow: string;
    previewEmpty: string;
    imageDropzoneEyebrow: string;
    imageDropzoneTitle: string;
    imageImportSuccess: string;
    imageImportSaveFirst: string;
    imageImportUnsupported: string;
    imageImportMissingSource: string;
    imageImportAllocationFailed: string;
    savedStatus: string;
    dirtyStatus: string;
    savingStatus: string;
    errorStatus: string;
    savedAtLabel: string;
    autosaveLabel: string;
    draftLabel: string;
    fileLabel: string;
    wordCountLabel: string;
    charCountLabel: string;
    recentDocumentsTitle: string;
    recentDocumentsBody: string;
    sessionTitle: string;
    sessionBody: string;
    sessionUpdatedLabel: string;
    sessionViewModeLabel: string;
    sessionStorageLabel: string;
    sessionStorageDraft: string;
    sessionStorageFile: string;
    untitledPlaceholderBody: string;
    leftPanelToggleCollapse: string;
    leftPanelToggleExpand: string;
    rightPanelToggleCollapse: string;
    rightPanelToggleExpand: string;
    resizeLeftPanel: string;
    resizeRightPanel: string;
  };
  settings: {
    title: string;
    subtitle: string;
    languageLabel: string;
    languageHint: string;
    themeLabel: string;
    themeHint: string;
    fontLabel: string;
    fontHint: string;
    fontLoading: string;
    fontDefault: string;
    fontLatexNotice: string;
    openDefaultApps: string;
    defaultAppsHint: string;
    uninstallPreparationLabel: string;
    uninstallPreparationButton: string;
    uninstallPreparationWorking: string;
    uninstallPreparationHint: string;
    uninstallPreparationConfirm: string;
    customThemeOpen: string;
    customThemeHint: string;
    close: string;
    customTheme: {
      title: string;
      subtitle: string;
      reset: string;
      apply: string;
      close: string;
      modeLabel: string;
      previewLabel: string;
      fields: {
        base: string;
        surface: string;
        elevated: string;
        accent: string;
        accentSoft: string;
        textPrimary: string;
        textSecondary: string;
        border: string;
        focusRing: string;
      };
    };
  };
  defaultAppPrompt: {
    title: string;
    subtitle: string;
    openPreferences: string;
    notNow: string;
    linuxHint: string;
  };
  exportDialog: {
    title: string;
    subtitle: string;
    profileLabel: string;
    profiles: {
      lualatex: {
        label: string;
        title: string;
        description: string;
      };
      weasy: {
        label: string;
        title: string;
        description: string;
      };
    };
    documentLabel: string;
    outputLabel: string;
    outputHint: string;
    confirm: string;
    exporting: string;
    close: string;
    successTitle: string;
    successBody: string;
    errorTitle: string;
    errorGeneric: string;
    resultEngineLabel: string;
  };
  info: {
    title: string;
    subtitle: string;
    versionLabel: string;
    licenseLabel: string;
    local: string;
    donations: string;
    reportBug: string;
    close: string;
  };
  guideCenter: {
    title: string;
    subtitle: string;
    searchLabel: string;
    searchPlaceholder: string;
    navLabel: string;
    noResults: string;
    close: string;
    copy: string;
    copied: string;
    livePreview: string;
    sections: {
      quickStart: {
        title: string;
        summary: string;
        intro: string;
        bullets: string[];
        snippetLabel: string;
        snippet: string;
      };
      uiTour: {
        title: string;
        summary: string;
        intro: string;
        bullets: string[];
      };
      markdown: {
        title: string;
        summary: string;
        intro: string;
        bullets: string[];
        snippetLabel: string;
        snippet: string;
      };
      shortcuts: {
        title: string;
        summary: string;
        intro: string;
        bullets: string[];
      };
      manual: {
        title: string;
        summary: string;
        intro: string;
        bullets: string[];
        snippetLabel: string;
        snippet: string;
      };
    };
  };
}

export const LANGUAGES = ['it', 'en', 'es', 'de', 'fr', 'pt'] as const;
export type LanguageCode = (typeof LANGUAGES)[number];
