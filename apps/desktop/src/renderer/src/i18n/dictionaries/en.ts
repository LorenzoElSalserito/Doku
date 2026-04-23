import type { Dictionary } from '../keys.js';

export const en: Dictionary = {
  app: {
    name: 'Doku',
    loading: 'Preparing your studio…',
    errorTitle: 'Something went wrong.',
    unknownError: 'Unknown error',
    skipToEditor: 'Skip to editor',
  },
  languages: {
    it: 'Italiano',
    en: 'English',
    es: 'Español',
    de: 'Deutsch',
    fr: 'Français',
    pt: 'Português',
  },
  themes: {
    light: 'Light',
    lightDescription: 'Warm Ivory — daylight editorial tone with azure accents',
    dark: 'Dark',
    darkDescription: 'Deep Slate — dim, focused tone with azure accents',
    custom: 'Custom',
    customDescription: 'An editorial palette tailored by you',
    system: 'System',
    systemDescription: 'Follow your operating system',
  },
  wizard: {
    eyebrow: 'Welcome to Doku',
    steps: {
      language: 'Language',
      theme: 'Theme',
      confirm: 'Ready',
    },
    language: {
      title: 'Choose your language',
      subtitle: 'Doku will speak to you in the language you prefer. You can change it later.',
    },
    theme: {
      title: 'Pick the atmosphere',
      subtitle: 'Two editorial identities of equal quality. Preview updates live.',
      previewHeading: 'A page worth keeping',
      previewBody:
        'Doku treats the page as the heart of your craft. Every surface, every spacing, every line of type is tuned to let words stay in focus.',
    },
    confirm: {
      title: 'All set — open your studio',
      subtitle: 'Your preferences are saved on this device.',
      languageLabel: 'Language',
      themeLabel: 'Theme',
      nextSteps:
        'After the wizard you land directly on the page. Guide and export keep growing in the next milestones.',
    },
    actions: {
      back: 'Back',
      next: 'Continue',
      finish: 'Enter Doku',
    },
  },
  workspace: {
    breadcrumbHome: 'Home',
    breadcrumbWorkspace: 'Workspace',
    untitledDocument: 'Untitled document',
    statusLocal: 'Local-first',
    statusReady: 'Shell ready',
    leftPanelLabel: 'Left panel',
    rightPanelLabel: 'Right panel',
    guide: 'Guide',
    export: 'Export',
    settings: 'Preferences',
    info: 'About',
    fileMenu: {
      trigger: 'File',
      newDocument: 'New document',
      openFile: 'Open file…',
      recentHeading: 'Recent',
      recentEmpty: 'No recent documents',
    },
    quickActions: {
      toggleShow: 'Show quick actions',
      toggleHide: 'Hide quick actions',
      barLabel: 'Markdown quick actions',
      tableButton: 'Table',
      tableRows: 'Rows',
      tableColumns: 'Columns',
      tableInsert: 'Insert table',
      h1: 'H1',
      h2: 'H2',
      bold: 'Bold',
      italic: 'Italic',
      link: 'Link',
      image: 'Image',
      bulletList: 'Bullets',
      orderedList: 'Numbered',
      checklist: 'Checklist',
      quote: 'Quote',
      inlineCode: 'Inline code',
      codeBlock: 'Code block',
      divider: 'Divider',
    },
    workspaceExplorer: {
      title: 'Workspace',
      body: 'Files from the current document folder stay close so you can move through the project without leaving the page.',
      empty: 'No visible files in this folder yet.',
      draftHint: 'Save this draft to turn the left rail into a live workspace explorer.',
      openFolder: 'Current folder',
      newFile: 'New file',
      newFolder: 'New folder',
      newFilePrompt: 'New Markdown file name',
      newFolderPrompt: 'New folder name',
      createFileError: 'The file could not be created. Check the name and try again.',
      createFolderError: 'The folder could not be created. Check the name and try again.',
      directory: 'Folder',
      markdown: 'Markdown file',
      asset: 'Asset',
      other: 'File',
    },
    projectPanelEyebrow: 'Project',
    projectPanelTitle: 'A quiet desk for your manuscript',
    projectPanelBody:
      'This side will host navigation, recent sections and project context. For now it defines rhythm, hierarchy and breathing space.',
    projectPanelMeta: 'Panel width is already persistent across sessions.',
    outlineTitle: 'Outline placeholder',
    outlineBody: 'Headings, structure and quick jumps are available here so you can move through content without losing context.',
    notesTitle: 'Context placeholder',
    notesBody: 'Notes, metadata and editorial context can live on this side without stealing focus from the page.',
    previewTitle: 'Preview rail placeholder',
    previewBody: 'Exports, style checks and reading aids will arrive here progressively.',
    editorEyebrow: 'Writing area',
    editorTitle: 'The editor arrives next',
    editorBody:
      'This shell establishes the proportions, transitions and calm needed for the real Markdown workspace.',
    editorHint: 'Next sprint: Monaco, open/save, and the first editable page.',
    editorLoading: 'Preparing the page…',
    editorErrorTitle: 'The document could not be loaded',
    editorErrorBody: 'Check the file path or reopen it from the launcher.',
    missingDocumentNotice:
      'The selected document is no longer available. Doku opened a new local draft and removed the stale entry from recents.',
    save: 'Save',
    saveAs: 'Save as',
    writeMode: 'Write',
    previewMode: 'Preview',
    splitMode: 'Split',
    previewEyebrow: 'Preview',
    previewEmpty: 'Start writing and the editorial preview will appear here.',
    imageDropzoneEyebrow: 'Image drop',
    imageDropzoneTitle: 'Drop the image to import it into this document.',
    imageImportSuccess: 'Image added: {{fileName}}',
    imageImportSaveFirst: 'Save the document before importing images.',
    imageImportUnsupported: 'This image format is not supported.',
    imageImportMissingSource: 'The selected image is no longer available.',
    imageImportAllocationFailed: 'Doku could not reserve a clean local path for the image.',
    savedStatus: 'Saved',
    dirtyStatus: 'Unsaved changes',
    savingStatus: 'Saving…',
    errorStatus: 'Save error',
    savedAtLabel: 'Last saved',
    autosaveLabel: 'Autosave active',
    draftLabel: 'Draft',
    fileLabel: 'Markdown file',
    wordCountLabel: 'Words',
    charCountLabel: 'Characters',
    recentDocumentsTitle: 'Recent documents',
    recentDocumentsBody: 'Jump back into the pages you touched most recently.',
    sessionTitle: 'Current session',
    sessionBody: 'A quick read of save state, active view, and the document local status.',
    sessionUpdatedLabel: 'Updated',
    sessionViewModeLabel: 'View',
    sessionStorageLabel: 'Storage',
    sessionStorageDraft: 'Local draft',
    sessionStorageFile: 'Linked file',
    untitledPlaceholderBody: 'A blank page, ready for the first line.',
    leftPanelToggleCollapse: 'Collapse left panel',
    leftPanelToggleExpand: 'Expand left panel',
    rightPanelToggleCollapse: 'Collapse right panel',
    rightPanelToggleExpand: 'Expand right panel',
    resizeLeftPanel: 'Resize left panel',
    resizeRightPanel: 'Resize right panel',
  },
  settings: {
    title: 'Preferences',
    subtitle: 'Everything stays on this device.',
    languageLabel: 'Language',
    languageHint: 'Applied immediately, no restart needed.',
    themeLabel: 'Theme',
    themeHint: 'Light, dark, or follow your system.',
    fontLabel: 'Writing font',
    fontHint: 'Applies to editor and preview using fonts already installed on this system.',
    fontLoading: 'Loading system fonts…',
    fontDefault: 'Doku default',
    fontLatexNotice: 'Custom system fonts are not embedded in LuaLaTeX export.',
    openDefaultApps: 'Open default apps preferences',
    defaultAppsHint: 'You can also configure Doku as the default app for .md files from your system settings.',
    uninstallPreparationLabel: 'Uninstall Preparation',
    uninstallPreparationButton: 'Uninstall Preparation',
    uninstallPreparationWorking: 'Cleaning up…',
    uninstallPreparationHint:
      'Deletes Doku settings, autosaves, logs, and local app data, then closes the app. Use this before uninstalling.',
    uninstallPreparationConfirm:
      'Permanently delete all Doku user data and close the app?',
    customThemeOpen: 'Edit custom theme',
    customThemeHint: 'Adjust the core palette tokens and apply them to Doku.',
    close: 'Done',
    customTheme: {
      title: 'Custom theme',
      subtitle: 'Build your own editorial palette and apply it without restarting the app.',
      reset: 'Reset',
      apply: 'Apply',
      close: 'Close',
      modeLabel: 'Theme base',
      previewLabel: 'Preview',
      fields: {
        base: 'Base',
        surface: 'Surface',
        elevated: 'Elevated',
        accent: 'Accent',
        accentSoft: 'Accent soft',
        textPrimary: 'Primary text',
        textSecondary: 'Secondary text',
        border: 'Border',
        focusRing: 'Focus ring',
      },
    },
  },
  defaultAppPrompt: {
    title: 'Set Doku as the default app for .md files',
    subtitle: 'Doku will only open your system preferences. It will not change anything silently.',
    openPreferences: 'Open system preferences',
    notNow: 'Not now',
    linuxHint: 'On Linux, the exact path depends on your desktop environment.',
  },
  exportDialog: {
    title: 'Export PDF',
    subtitle: 'Choose the PDF style that fits this document and generate it locally.',
    profileLabel: 'PDF profile',
    profiles: {
      lualatex: {
        label: 'Typographic',
        title: 'PDF typographic',
        description: 'More editorial and book-like. Best when hierarchy, serif rhythm, and print tone matter most.',
      },
      weasy: {
        label: 'Web/print',
        title: 'PDF web-style',
        description: 'Closer to HTML and print CSS. Best when you want a more modern, browser-like page feel.',
      },
    },
    documentLabel: 'Document',
    outputLabel: 'Output path',
    outputHint: 'Doku is preparing the PDF and saving it to the chosen destination.',
    confirm: 'Export PDF',
    exporting: 'Exporting…',
    close: 'Close',
    successTitle: 'Export completed',
    successBody: 'The PDF was generated successfully at this path.',
    errorTitle: 'Export failed',
    errorGeneric: 'PDF export failed before the file could be generated.',
    resultEngineLabel: 'Profile used',
  },
  info: {
    title: 'Doku',
    subtitle: 'A local editorial studio for Markdown writing.',
    versionLabel: 'Version',
    licenseLabel: 'License',
    local: 'Everything stays on this device.',
    donations: 'Donations',
    reportBug: 'Report a bug',
    close: 'Close',
  },
  guideCenter: {
    title: 'Guide Center',
    subtitle: 'Doku explains itself without pushing you out of the page.',
    searchLabel: 'Search the guide',
    searchPlaceholder: 'Markdown, panels, shortcuts…',
    navLabel: 'Guide sections',
    noResults: 'No section matches the current search.',
    close: 'Close guide',
    copy: 'Copy snippet',
    copied: 'Snippet copied',
    livePreview: 'Live preview',
    sections: {
      quickStart: {
        title: 'Quick start',
        summary: 'Take the page and begin writing.',
        intro:
          'Doku is built to remove startup friction: open it, write, save. The shell stays quiet and supportive instead of demanding setup before work begins.',
        bullets: [
          'Use File to create a new document or open an existing Markdown file.',
          'Write in the center, monitor status and view mode from the header, and let autosave cover the routine work.',
          'Switch between Write, Preview, and Split to match drafting, reviewing, or editing moments.',
        ],
        snippetLabel: 'Starter snippet',
        snippet: `# Document title

Write the opening paragraph without hurry.

- One key point
- One useful detail
- One clean ending`,
      },
      uiTour: {
        title: 'UI tour',
        summary: 'Understand the shell in seconds.',
        intro:
          'Doku’s interface is split into simple zones: a light header, a central page, and optional side panels. Each part has one job.',
        bullets: [
          'The header gathers file actions, view modes, save actions, guide access, export, and settings.',
          'The left panel shows document context, metrics, and quick structure.',
          'The right panel hosts notes, reading support, and secondary surfaces.',
        ],
      },
      markdown: {
        title: 'Markdown basics',
        summary: 'The essential forms you use most.',
        intro:
          'You only need a small set of recurring patterns to write well in Markdown. Doku keeps them legible in both the editor and preview without making syntax feel hostile.',
        bullets: [
          'Use `#` and `##` to define a clear hierarchy before the longer text arrives.',
          'Lists and block quotes work well for notes, outlines, revisions, and supporting material.',
          'Inline code and fenced blocks are useful whenever you need exact syntax or paths.',
        ],
        snippetLabel: 'Markdown example',
        snippet: `# Chapter one

One paragraph with **emphasis** and \`inline code\`.

> A short quote to set the tone.

1. First idea
2. Second idea
3. Closing line`,
      },
      shortcuts: {
        title: 'Shortcuts and rhythm',
        summary: 'Less mouse, more continuity.',
        intro:
          'Doku rewards a calm flow. Frequent actions stay close, but the keyboard should be able to support the whole core path.',
        bullets: [
          'Use Escape to close menus and dialogs when you want to return to the page immediately.',
          'Use Cmd/Ctrl+S to save and Cmd/Ctrl+Shift+S to open Save as.',
          'Save regularly even with autosave on: the status feedback always tells you where you stand.',
          'Keep panels closed while drafting and reopen them only for review or structure checks.',
        ],
      },
      manual: {
        title: 'Markdown manual',
        summary: 'Integrated Italian reference authored by Lorenzo DM.',
        intro:
          'This section embeds the full Italian Markdown manual provided for Doku and presents it in-product as editorial reference material by Lorenzo DM.',
        bullets: [
          'The manual remains in Italian because that is the authored source text integrated into the product.',
          'You can copy any example block directly from this section and test it inside Doku.',
          'The live preview on the right lets you compare raw Markdown and rendered output immediately.',
        ],
        snippetLabel: 'Full manual',
        snippet: `# Markdown Manual

Version: 20201226  
By Lorenzo DM

This essential sheet starts from the reference material of [Markdown Guide](https://www.markdownguide.org) and has been adapted for practical use inside Doku.

## Summary

### Foundations

1. [Basic syntax](#basic-syntax)
2. [Headings](#headings)
3. [Bold](#bold)
4. [Italic](#italic)
5. [Block quote](#block-quote)
6. [Lists](#lists)
7. [Code](#code)
8. [Horizontal rule](#horizontal-rule)
9. [Links](#links)
10. [Images](#images)

### Useful extensions

1. [Extended syntax](#extended-syntax)
2. [Footnotes](#footnotes)
3. [Tables](#tables)
4. [Superscript and subscript](#superscript-and-subscript)
5. [Code blocks](#code-blocks)
6. [IDs and heading links](#ids-and-heading-links)
7. [Highlighted text](#highlighted-text)
8. [Special characters](#special-characters)

## Basic syntax

These are the elements defined by John Gruber's original Markdown. They are the ones that almost every application supports.

## Headings

Always leave a space between \`#\` and the text.

\`\`\`md
# Heading 1
## Heading 2
### Heading 3
#### Heading 4
##### Heading 5
###### Heading 6
\`\`\`

## Bold

\`\`\`md
**bold text**
\`\`\`

Result: **bold text**

## Italic

\`\`\`md
_italic text_
*italic text*
\`\`\`

Result: _italic text_ or *italic text*

Useful combinations:

\`\`\`md
_text with **partial** emphasis_
**_very emphasized text_**
\`\`\`

## Block quote

\`\`\`md
> First paragraph.
>
> Second paragraph.
\`\`\`

> First paragraph.
>
> Second paragraph.

## Lists

### Ordered list

\`\`\`md
1. First item
2. Second item
    1. First sub-item
    2. Another sub-item
3. Third item
\`\`\`

### Unordered list

\`\`\`md
- First item
- Second item
    - Sub-item
    - Another sub-item
- Third item
\`\`\`

## Code

For inline code use the grave accent backtick.

\`\`\`md
\`code\`
\`\`\`

Result: \`code\`

## Horizontal rule

\`\`\`md
***
\`\`\`

***

Remember to leave a blank line after the rule.

## Links

\`\`\`md
[Liber Liber](https://www.liberliber.it)
<https://www.liberliber.it>
\`\`\`

## Images

\`\`\`md
![descriptive text](immagini/image.jpg)
_this is the caption_
\`\`\`

Or an image on the web:

\`\`\`md
![Liber Liber](https://www.liberliber.it/online/wp-content/uploads/2017/03/logo_liberliber.png)
*This is the Liber Liber logo*
\`\`\`

## Extended syntax

Many modern applications support additional features beyond basic Markdown.

## Footnotes

\`\`\`md
Here we have the reference to a note[^1].

[^1]: And this is the note.
\`\`\`

## Tables

\`\`\`md
| left | center | right |
| :--- | :---: | ---: |
| pippo | pluto | topolino |
| paperino | paperoga | paperone |
\`\`\`

| left | center | right |
| :--- | :---: | ---: |
| pippo | pluto | topolino |
| paperino | paperoga | paperone |

## Superscript and subscript

\`\`\`md
X^2^
H~2~O
\`\`\`

Expected result in compatible renderers: X^2^ and H~2~O

## Code blocks

\`\`\`\`md
\`\`\`
{
  "firstName": "John",
  "lastName": "Smith",
  "age": 25
}
\`\`\`
\`\`\`\`

## IDs and heading links

\`\`\`md
#### Example heading {#a-heading}
[Go to the heading](#a-heading)
[Go to a normal heading](#clickable-heading)
\`\`\`

## Highlighted text

\`\`\`md
==This is highlighted text==
\`\`\`

## Special characters

When needed, prefix symbols with a backslash:

\`\`\`md
\\\` \\* \\_ \\{ \\} \\[ \\] \\( \\) \\< \\> \\# \\+ \\. \\! \\|
\`\`\`

## Final note

Not every extension is supported by every converter, but this sheet covers the most useful forms for everyday editorial work inside Doku.`,
      },
    },
  },
};
