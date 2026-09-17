import type { Dictionary } from '../keys.js';

export const de: Dictionary = {
  app: {
    name: 'Doku',
    loading: 'Arbeitsbereich wird geöffnet…',
    errorTitle: 'Etwas ist schiefgelaufen.',
    unknownError: 'Unbekannter Fehler',
    skipToEditor: 'Direkt zum Editor springen',
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
    light: 'Hell',
    lightDescription: 'Warm Ivory — redaktioneller Tagton mit azurblauem Akzent',
    dark: 'Dunkel',
    darkDescription: 'Deep Slate — gedämpft mit azurblauem Akzent',
    custom: 'Benutzerdefiniert',
    customDescription: 'Eine redaktionelle Palette nach deinen Vorgaben',
    system: 'System',
    systemDescription: 'Folgt den Systemeinstellungen',
  },
  wizard: {
    eyebrow: 'Willkommen bei Doku',
    steps: {
      language: 'Sprache',
      theme: 'Thema',
      font: 'Schrift',
      confirm: 'Bereit',
    },
    language: {
      title: 'Wähle deine Sprache',
      subtitle: 'Doku spricht mit dir in der Sprache deiner Wahl. Du kannst sie jederzeit ändern.',
    },
    theme: {
      title: 'Wähle die Atmosphäre',
      subtitle:
        'Zwei gleichwertige redaktionelle Identitäten. Die Vorschau aktualisiert sich sofort.',
      previewHeading: 'Eine Seite, die Sorgfalt verdient',
      previewBody:
        'Für Doku steht die Seite im Mittelpunkt deines Handwerks. Jede Fläche, jeder Abstand und jedes typografische Detail wurde so abgestimmt, dass die Worte im Vordergrund bleiben.',
    },
    font: {
      title: 'Wähle deine Schreibschrift',
      subtitle:
        'Wähle die Typografie für Oberfläche, Editor, Vorschau und PDF-Export.',
      previewLabel: 'Vorschau',
      sampleText:
        'Ein klarer Absatz macht lange Notizen leichter lesbar, bearbeitbar und exportierbar.',
    },
    confirm: {
      title: 'Alles bereit — öffne dein Studio',
      subtitle: 'Deine Einstellungen werden auf diesem Gerät gespeichert.',
      languageLabel: 'Sprache',
      themeLabel: 'Thema',
      fontLabel: 'Schrift',
      nextSteps:
        'Nach dem Wizard landest du direkt auf der Seite. Guide und Export wachsen in den nächsten Meilensteinen weiter.',
    },
    actions: {
      back: 'Zurück',
      next: 'Weiter',
      finish: 'Doku betreten',
    },
  },
  workspace: {
    breadcrumbHome: 'Start',
    breadcrumbWorkspace: 'Workspace',
    untitledDocument: 'Unbenanntes Dokument',
    statusLocal: 'Local-first',
    statusReady: 'Shell bereit',
    documentTitleLabel: 'Dokumenttitel',
    documentTitlePlaceholder: 'Dokumenttitel',
    leftPanelLabel: 'Linkes Panel',
    rightPanelLabel: 'Rechtes Panel',
    guide: 'Guide',
    export: 'Export',
    settings: 'Einstellungen',
    info: 'Über Doku',
    fileMenu: {
      trigger: 'Datei',
      newDocument: 'Neues Dokument',
      openFile: 'Datei öffnen…',
      recentHeading: 'Zuletzt',
      recentEmpty: 'Keine zuletzt geöffneten Dokumente',
    },
    tabs: {
      label: 'Geöffnete Dokumente',
      close: 'Dokument schließen',
      closeDirtyConfirm: 'Dieses Dokument enthält ungespeicherte Änderungen. Trotzdem schließen?',
      missingDocumentFile: 'Die Datei ist auf dem Datenträger nicht mehr verfügbar.',
      reopenFromDisk: 'Vom Datenträger erneut öffnen',
      scrollPrev: 'Tabs nach links scrollen',
      scrollNext: 'Tabs nach rechts scrollen',
    },
    quickActions: {
      toggleShow: 'Schnellaktionen anzeigen',
      toggleHide: 'Schnellaktionen ausblenden',
      barLabel: 'Markdown-Schnellaktionen',
      tableButton: 'Tabelle',
      tableRows: 'Zeilen',
      tableColumns: 'Spalten',
      tableInsert: 'Tabelle einfügen',
      h1: 'H1',
      h2: 'H2',
      bold: 'Fett',
      italic: 'Kursiv',
      link: 'Link',
      image: 'Bild',
      bulletList: 'Aufzählung',
      orderedList: 'Nummeriert',
      checklist: 'Checkliste',
      quote: 'Zitat',
      inlineCode: 'Inline-Code',
      codeBlock: 'Codeblock',
      divider: 'Trenner',
      mermaidDiagram: 'Diagramm',
      markmapMindmap: 'Mindmap',
      chartBlock: 'Diagramm',
    },
    immersive: {
      enter: 'Immersiver Modus',
      exit: 'Immersiven Modus beenden',
    },
    contentColors: {
      button: 'Farben',
      title: 'Inhaltsfarben',
      link: 'Links',
      heading: 'Überschriften',
      code: 'Codeblöcke',
      quote: 'Zitate',
      reset: 'Zurücksetzen',
    },
    previewZoom: {
      label: 'Vorschau-Zoom',
      zoomIn: 'Vergrößern',
      zoomOut: 'Verkleinern',
      reset: 'Zoom zurücksetzen',
      fitWidth: 'Breite anpassen',
      fitPage: 'Höhe anpassen',
    },
    previewInvert: {
      invert: 'Vorschaufarben umkehren',
      restore: 'Vorschaufarben zurücksetzen',
    },
    visualBlocks: {
      loading: 'Visueller Block lädt…',
      fallback: 'Visueller Block',
      errorTitle: 'Ungültiger visueller Block',
      mermaidLabel: 'Mermaid-Diagramm',
      markmapLabel: 'Markmap-Mindmap',
      chartLabel: 'Recharts-Diagramm',
    },
    workspaceExplorer: {
      title: 'Workspace',
      body: 'Die Dateien des aktuellen Ordners bleiben nah, damit du dich durch das Projekt bewegen kannst, ohne die Seite zu verlassen.',
      empty: 'In diesem Ordner gibt es noch keine sichtbaren Dateien.',
      draftHint: 'Speichere diesen Entwurf, damit die linke Leiste zu einem echten Workspace-Explorer wird.',
      openFolder: 'Aktueller Ordner',
      newFile: 'Neue Datei',
      newFolder: 'Neuer Ordner',
      newFilePrompt: 'Name der neuen Markdown-Datei',
      newFolderPrompt: 'Name des neuen Ordners',
      createFileError: 'Die Datei konnte nicht erstellt werden. Prüfe den Namen und versuche es erneut.',
      createFolderError: 'Der Ordner konnte nicht erstellt werden. Prüfe den Namen und versuche es erneut.',
      directory: 'Ordner',
      markdown: 'Markdown-Datei',
      asset: 'Asset',
      other: 'Datei',
    },
    projectPanelEyebrow: 'Projekt',
    projectPanelTitle: 'Dein zweiter Verstand',
    projectPanelBody:
      'Diese Seite wird Navigation, letzte Abschnitte und Projektkontext aufnehmen. Im Moment definiert sie Rhythmus, Hierarchie und Ruhe.',
    projectPanelMeta: 'Die Panelbreite bleibt bereits zwischen Sitzungen erhalten.',
    outlineTitle: 'Struktur-Platzhalter',
    outlineBody: 'Überschriften, Struktur und schnelle Sprünge sind hier verfügbar, damit du dich ohne Kontextverlust durch Inhalte bewegen kannst.',
    notesTitle: 'Kontext-Platzhalter',
    notesBody: 'Notizen, Metadaten und redaktioneller Kontext können hier liegen, ohne der Seite den Fokus zu nehmen.',
    previewTitle: 'Preview-Leiste Platzhalter',
    previewBody: 'Exporte, Stilprüfungen und Lesehilfen kommen schrittweise hierher.',
    editorEyebrow: 'Schreibbereich',
    editorTitle: 'Der Editor kommt im nächsten Sprint',
    editorBody:
      'Diese Shell legt Proportionen, Übergänge und die Ruhe für den echten Markdown-Workspace fest.',
    editorHint: 'Nächster Sprint: Monaco, Öffnen/Speichern und die erste editierbare Seite.',
    editorLoading: 'Die Seite wird vorbereitet…',
    editorErrorTitle: 'Das Dokument konnte nicht geladen werden',
    editorErrorBody: 'Prüfe den Dateipfad oder öffne es erneut aus dem Launcher.',
    missingDocumentNotice:
      'Das gewählte Dokument ist nicht mehr verfügbar. Doku hat den Tab geöffnet gelassen und den veralteten Eintrag aus den zuletzt verwendeten Dokumenten entfernt.',
    save: 'Speichern',
    saveAs: 'Speichern unter',
    writeMode: 'Schreiben',
    previewMode: 'Vorschau',
    splitMode: 'Split',
    previewEyebrow: 'Vorschau',
    previewEmpty: 'Beginne zu schreiben, dann erscheint hier die redaktionelle Vorschau.',
    imageDropzoneEyebrow: 'Bild ablegen',
    imageDropzoneTitle: 'Lege das Bild ab, um es in dieses Dokument zu importieren.',
    imageImportSuccess: 'Bild hinzugefügt: {{fileName}}',
    imageImportSaveFirst: 'Speichere das Dokument, bevor du Bilder importierst.',
    imageImportUnsupported: 'Dieses Bildformat wird nicht unterstützt.',
    imageImportMissingSource: 'Das ausgewählte Bild ist nicht mehr verfügbar.',
    imageImportAllocationFailed: 'Doku konnte keinen sauberen lokalen Pfad für das Bild reservieren.',
    savedStatus: 'Gespeichert',
    dirtyStatus: 'Ungespeicherte Änderungen',
    savingStatus: 'Speichert…',
    errorStatus: 'Speicherfehler',
    savedAtLabel: 'Zuletzt gespeichert',
    autosaveLabel: 'Autosave aktiv',
    draftLabel: 'Entwurf',
    fileLabel: 'Markdown-Datei',
    wordCountLabel: 'Wörter',
    charCountLabel: 'Zeichen',
    recentDocumentsTitle: 'Zuletzt verwendet',
    recentDocumentsBody: 'Springe schnell zu den Seiten zurück, die du zuletzt bearbeitet hast.',
    sessionTitle: 'Aktuelle Sitzung',
    sessionBody: 'Ein schneller Überblick über Speichern, aktive Ansicht und lokalen Dokumentstatus.',
    sessionUpdatedLabel: 'Aktualisiert',
    sessionViewModeLabel: 'Ansicht',
    sessionStorageLabel: 'Speicher',
    sessionStorageDraft: 'Lokaler Entwurf',
    sessionStorageFile: 'Verknüpfte Datei',
    untitledPlaceholderBody: 'Eine leere Seite, bereit für die erste Zeile.',
    leftPanelToggleCollapse: 'Linkes Panel einklappen',
    leftPanelToggleExpand: 'Linkes Panel ausklappen',
    rightPanelToggleCollapse: 'Rechtes Panel einklappen',
    rightPanelToggleExpand: 'Rechtes Panel ausklappen',
    resizeLeftPanel: 'Linkes Panel in der Größe ändern',
    resizeRightPanel: 'Rechtes Panel in der Größe ändern',
  },
  settings: {
    title: 'Einstellungen',
    subtitle: 'Alles bleibt auf diesem Gerät.',
    languageLabel: 'Sprache',
    languageHint: 'Sofort wirksam, kein Neustart nötig.',
    themeLabel: 'Thema',
    themeHint: 'Hell, dunkel oder nach Systemeinstellung.',
    zoomLabel: 'App-Zoom',
    zoomHint: 'Skaliert die gesamte Oberflache, ohne die gewahlte Doku-Schrift zu andern.',
    restartNotice: 'Starte Doku neu, um visuelle Anderungen sauber anzuwenden.',
    fontLabel: 'Typografie',
    fontHint: 'Jede Auswahl nutzt den vollstandigen Doku-Fontkatalog aus FONTS.md.',
    fontLoading: 'Systemschriften werden geladen…',
    fontDefault: 'Doku-Standard',
    fontLatexNotice: 'Der PDF-Export erhalt die ausgewahlten Doku-Schriften fur Dokumenttext und Code.',
    fontProfileLabel: 'Font-Setup',
    fontUiLabel: 'UI',
    fontPdfLabel: 'PDF und Vorschau',
    fontMonoLabel: 'Code',
    fontAccessibilityLabel: 'Barrierefreiheit',
    fontAccessibilityMode: 'Barrierefreie Schrift fur Oberflache und Schreibbereich verwenden',
    fontProfiles: {
      professional: 'Professionell',
      allPurpose: 'Allround',
    },
    openDefaultApps: 'Standard-App-Einstellungen öffnen',
    defaultAppsHint: 'Du kannst Doku auch in den Systemeinstellungen als Standard-App für .md-Dateien festlegen.',
    uninstallPreparationLabel: 'Vorbereitung der Deinstallation',
    uninstallPreparationButton: 'Vorbereitung der Deinstallation',
    uninstallPreparationWorking: 'Bereinigung läuft…',
    uninstallPreparationHint:
      'Löscht Doku-Einstellungen, Autosaves, Logs und lokale App-Daten und schließt danach die App. Vor der Deinstallation verwenden.',
    uninstallPreparationConfirm:
      'Alle Doku-Benutzerdaten endgültig löschen und die App schließen?',
    customThemeOpen: 'Benutzerdefiniertes Thema bearbeiten',
    customThemeHint: 'Passe die zentralen Paletten-Tokens an und wende sie auf Doku an.',
    close: 'Fertig',
    customTheme: {
      title: 'Benutzerdefiniertes Thema',
      subtitle: 'Baue deine eigene redaktionelle Palette und übernimm sie ohne Neustart.',
      reset: 'Zurücksetzen',
      apply: 'Anwenden',
      close: 'Schließen',
      modeLabel: 'Themenbasis',
      previewLabel: 'Vorschau',
      fields: {
        base: 'Base',
        surface: 'Surface',
        elevated: 'Elevated',
        accent: 'Accent',
        accentSoft: 'Accent soft',
        textPrimary: 'Primärtext',
        textSecondary: 'Sekundärtext',
        border: 'Rahmen',
        focusRing: 'Focus ring',
      },
    },
  },
  defaultAppPrompt: {
    title: 'Doku als Standard-App für .md-Dateien festlegen',
    subtitle: 'Doku öffnet nur die Systemeinstellungen. Es ändert nichts still im Hintergrund.',
    openPreferences: 'Systemeinstellungen öffnen',
    notNow: 'Jetzt nicht',
    dontAskAgain: 'Nicht erneut fragen',
    linuxHint: 'Unter Linux hängt der genaue Pfad von deiner Desktop-Umgebung ab.',
  },
  exportDialog: {
    title: 'PDF exportieren',
    subtitle: 'Wähle das PDF-Profil, das am besten zu diesem Dokument passt, und erzeuge es lokal.',
    profileLabel: 'PDF-Profil',
    profiles: {
      lualatex: {
        label: 'Typografisch',
        title: 'Typografisches PDF',
        description:
          'Redaktioneller und näher an einer gedruckten Seite. Gut, wenn Hierarchie, Serif-Rhythmus und Buchcharakter wichtig sind.',
      },
      weasy: {
        label: 'Web/Print',
        title: 'PDF im Web-Stil',
        description:
          'Näher an HTML und Print-CSS. Gut für eine modernere Seite mit browserähnlicher Anmutung.',
      },
    },
    documentLabel: 'Dokument',
    outputLabel: 'Ausgabepfad',
    outputHint: 'Doku erstellt gerade das PDF und speichert es am gewählten Ziel.',
    confirm: 'PDF exportieren',
    exporting: 'Exportiere…',
    close: 'Schließen',
    successTitle: 'Export abgeschlossen',
    successBody: 'Das PDF wurde erfolgreich unter diesem Pfad erstellt.',
    errorTitle: 'Export fehlgeschlagen',
    errorGeneric: 'Der PDF-Export ist fehlgeschlagen, bevor die Datei erstellt werden konnte.',
    resultEngineLabel: 'Verwendetes Profil',
    capturing: 'Diagramme und Charts für das PDF werden gerendert…',
    visualNote: 'Mermaid-Diagramme, Markmap-Mindmaps und Charts werden als Bilder eingebettet – genau wie in der Vorschau.',
    a4Note: 'A4-Blatt, gespiegelte Bindungsränder, Seitenzahlen: das PDF entspricht der Vorschauseite.',
  },
  info: {
    title: 'Doku',
    subtitle: 'Dein zweiter Verstand',
    versionLabel: 'Version',
    licenseLabel: 'Lizenz',
    local: 'Alles bleibt auf diesem Gerät.',
    donations: 'Spenden',
    support: {
      title: 'Doku unterstützen',
      body: 'Doku ist kostenlos, Open Source und lebt nur auf deinem Gerät. Eine Spende hält es so und finanziert die nächsten Funktionen.',
      cta: 'Unterstütz mich mit einer Spende',
      note: 'Sichere PayPal-Seite, öffnet sich im Browser.',
    },
    reportBug: 'Fehler melden',
    close: 'Schließen',
  },
  fontCatalog: {
    use: {
      'Inter': 'Moderne Oberflächen und Desktop-Apps',
      'Roboto': 'Allgemeiner Oberflächentext',
      'Open Sans': 'Professionelle Apps und Dokumente',
      'IBM Plex Sans': 'Unternehmenssoftware und Produkttexte',
      'Ubuntu': 'Freundliche Desktop-Notizen',
      'Source Sans 3': 'Lange Dokumente und Oberflächen',
      'Work Sans': 'Bildschirmtitel und UI',
      'Nunito': 'Lockere Notizen mit weichem Ton',
      'Manrope': 'Minimale Oberflächen und Dashboards',
      'Source Serif 4': 'Berichte, Handbücher, professionelle PDFs',
      'Merriweather': 'Gut lesbare Druck- und PDF-Seiten',
      'Lora': 'Redaktionelle Langtexte',
      'Libre Baskerville': 'Klassische, formelle PDFs',
      'EB Garamond': 'Bücher, Essays, klassische PDFs',
      'Crimson Pro': 'Belletristik und Manuskripte',
      'Playfair Display': 'Redaktionelle Titel und Cover',
      'JetBrains Mono': 'Code und technische Daten',
      'Fira Code': 'Code mit Ligaturen',
      'Roboto Mono': 'Tabellen und Code',
      'Source Code Pro': 'Code und technische Dokumentation',
      'Inconsolata': 'Kompakter Code und Tabellen',
      'OpenDyslexic': 'Erleichtertes Lesen bei Dyslexie',
      'Atkinson Hyperlegible': 'Hohe Lesbarkeit für alle',
      'Lexend': 'Flüssiges Lesen, weniger Ermüdung',
      'Noto Sans': 'Universelle Abdeckung, jede Sprache',
      'Montserrat': 'Geometrische Titel und Plakate',
      'Raleway': 'Elegante Titel und Cover',
      'Rubik': 'Runde, freundliche Oberflächen',
      'Karla': 'Kompakte Grotesk für Notizen',
      'Public Sans': 'Neutrale institutionelle Dokumente',
      'Outfit': 'Moderne geometrische Titel',
      'DM Sans': 'Klare Oberfläche und Fließtext',
      'Figtree': 'Leichter, freundlicher Oberflächentext',
      'Noto Serif': 'Universelle Serif für jede Sprache',
      'Literata': 'Langes Lesen und E-Books',
      'Bitter': 'Slab Serif fürs Lesen am Bildschirm',
      'Alegreya': 'Literarische Prosa und Essays',
      'Vollkorn': 'Klassischer, warmer Fließtext',
      'Newsreader': 'Redaktionelle und Zeitungstypografie',
      'Cormorant Garamond': 'Display-Serif für Cover',
      'Red Hat Mono': 'Kompakter, lesbarer Code',
      'Atkinson Hyperlegible Next': 'Maximale Lesbarkeit, mehr Schnitte',
    },
    preview: {
      sans: 'Klarer Oberflächentext',
      serif: 'Redaktionelle Langprosa',
      monospace: 'Code, Tabellen, Metadaten',
      accessibility: 'Barrierearmer Lesefluss',
    },
  },
  guideCenter: {
    title: 'Guide Center',
    subtitle: 'Doku erklärt sich selbst, ohne dich aus der Seite zu ziehen.',
    searchLabel: 'In der Hilfe suchen',
    searchPlaceholder: 'Markdown, Panels, Kurzbefehle…',
    navLabel: 'Hilfebereiche',
    noResults: 'Kein Bereich passt zur aktuellen Suche.',
    close: 'Hilfe schließen',
    copy: 'Snippet kopieren',
    copied: 'Snippet kopiert',
    livePreview: 'Live-Vorschau',
    resultsCount: '{{count}} Abschnitte',
    outlineTitle: 'Inhalt',
    outlineBody: 'Springe zu jedem Kapitel des Handbuchs.',
    shortcutKeysHeader: 'Tasten',
    shortcutActionHeader: 'Aktion',
    sections: {
      quickStart: {
        title: 'Schnellstart',
        summary: 'Seite öffnen und direkt schreiben.',
        intro:
          'Doku soll den Einstieg reibungsarm machen: öffnen, schreiben, speichern. Die Oberfläche bleibt ruhig und hilfreich, statt erst Konfiguration zu verlangen.',
        bullets: [
          'Nutze Datei, um ein neues Dokument anzulegen oder eine vorhandene Markdown-Datei zu öffnen.',
          'Schreibe in der Mitte, beobachte Status und Ansicht im Header und lass Autosave die Routine übernehmen.',
          'Wechsle zwischen Schreiben, Vorschau und Split, je nachdem ob du entwirfst oder überarbeitest.',
        ],
        snippetLabel: 'Start-Snippet',
        snippet: `# Dokumenttitel

Schreibe den ersten Absatz ohne Eile.

- Ein Kernpunkt
- Ein nützliches Detail
- Ein sauberer Abschluss`,
      },
      uiTour: {
        title: 'Oberflächenrundgang',
        summary: 'Die Shell in wenigen Sekunden verstehen.',
        intro:
          'Die Oberfläche von Doku besteht aus klaren Zonen: leichtem Header, zentraler Seite und optionalen Seitenleisten. Jeder Bereich hat genau eine Aufgabe.',
        bullets: [
          'Der Header bündelt Dateiaktionen, Ansichten, Speichern, Hilfe, Export und Einstellungen.',
          'Das linke Panel zeigt Dokumentkontext, Kennzahlen und schnelle Struktur.',
          'Das rechte Panel nimmt Notizen, Lesehilfen und sekundäre Flächen auf.',
        ],
      },
      markdown: {
        title: 'Markdown-Grundlagen',
        summary: 'Die wichtigsten Formen für den Alltag.',
        intro:
          'Für gutes Schreiben in Markdown brauchst du nur wenige wiederkehrende Muster. Doku hält sie im Editor und in der Vorschau gut lesbar.',
        bullets: [
          'Nutze `#` und `##`, um schon vor dem langen Text eine klare Hierarchie aufzubauen.',
          'Listen und Zitate eignen sich gut für Notizen, Gliederungen, Revisionen und Begleitmaterial.',
          'Inline-Code und Codeblöcke helfen, wenn Syntax oder Pfade exakt bleiben müssen.',
        ],
        snippetLabel: 'Markdown-Beispiel',
        snippet: `# Kapitel eins

Ein Absatz mit **Betonung** und \`Inline-Code\`.

> Ein kurzes Zitat für den Ton.

1. Erster Gedanke
2. Zweiter Gedanke
3. Schluss`,
      },
      shortcuts: {
        title: 'Kurzbefehle und Rhythmus',
        summary: 'Weniger Maus, mehr Kontinuität.',
        intro:
          'Doku belohnt einen ruhigen Fluss. Häufige Aktionen bleiben nah, aber die Tastatur soll den gesamten Grundpfad tragen können.',
        bullets: [
          'Verwende Escape, um Menüs und Dialoge zu schließen und sofort zur Seite zurückzukehren.',
          'Verwende Cmd/Ctrl+S zum Speichern und Cmd/Ctrl+Shift+S für Speichern unter.',
          'Speichere regelmäßig, auch wenn Autosave aktiv ist: der Status zeigt dir immer, wo du stehst.',
          'Halte Panels beim Schreiben geschlossen und öffne sie nur für Struktur oder Überprüfung.',
        ],
        items: [
          { keys: 'Strg/Cmd + S', action: 'Dokument speichern' },
          { keys: 'Strg/Cmd + Umschalt + S', action: 'Speichern unter…' },
          { keys: 'Strg/Cmd + N', action: 'Neues leeres Dokument' },
          { keys: 'Strg/Cmd + W', action: 'Aktiven Tab schließen' },
          { keys: 'Strg/Cmd + Tab', action: 'Nächster Tab (Umschalt für den vorherigen)' },
          { keys: 'Strg/Cmd + 1…9', action: 'Zu Tab 1…9 springen' },
          { keys: 'Esc', action: 'Schließt Menüs, Dialoge und den Immersiv-Modus' },
          { keys: '↑ ↓ / Bild↑ Bild↓ / Pos1 Ende / Leertaste', action: 'Scrollt die Vorschauseite' },
          { keys: '← →', action: 'Scrollt die Vorschau seitlich, wenn sie überläuft' },
        ],
      },
      visualBlocks: {
        title: 'Diagramme und Charts',
        summary: 'Zeichnen mit Text: Mermaid, Markmap, Charts.',
        intro:
          'Drei eingezäunte Blöcke verwandeln reinen Text in Bilder, die live in der Vorschau gerendert und in jedem PDF-Export als Abbildung eingebettet werden.',
        bullets: [
          '`mermaid` zeichnet Flussdiagramme, Sequenzen, Klassen- und Zustandsdiagramme.',
          '`markmap` macht aus einer Überschriftengliederung eine Mindmap.',
          '`chart` nimmt einen kleinen JSON-Block (Balken, Linien, Flächen, Kreis) und zeichnet ihn mit der App-Palette.',
          'Füge eine fertige Vorlage aus der Schnellaktionsleiste ein; ungültige Blöcke zeigen einen klaren Fehler statt die Seite zu zerstören.',
        ],
        snippetLabel: 'Drei Blöcke zum Kopieren',
        snippet: `## Diagramma

\`\`\`mermaid
flowchart LR
  A[Idea] --> B[Bozza]
  B --> C[Revisione]
  C --> D[PDF]
\`\`\`

## Mappa mentale

\`\`\`markmap
# Progetto
## Ricerca
## Scrittura
### Capitoli
## Pubblicazione
\`\`\`

## Grafico

\`\`\`chart
{
  "kind": "chart",
  "chartType": "bar",
  "title": "Parole per capitolo",
  "xKey": "capitolo",
  "yKeys": ["parole"],
  "data": [
    { "capitolo": "1", "parole": 1200 },
    { "capitolo": "2", "parole": 1850 },
    { "capitolo": "3", "parole": 940 }
  ]
}
\`\`\``,
      },
      exportPdf: {
        title: 'Als PDF exportieren',
        summary: 'Zwei Profile, eine A4-Seite.',
        intro:
          'Der Export-Button erzeugt ein echtes A4-Dokument, vollständig offline, aus der gebündelten Laufzeit. Nichts wird je abgeschnitten, und die Datei entspricht dem, was die Vorschau zeigt.',
        bullets: [
          'Typografisch (LuaLaTeX): Buchsatz mit Mikrotypografie, umbrechendem Code, adaptiven Tabellen und gespiegelten Bindungsrändern.',
          'Web/Druck (WeasyPrint): der gedruckte Zwilling der Vorschauseite – gleiche Schriftskala, Abstände, Farben und Schriften.',
          'Breite Tabellen passen sich der Spalte an, lange Wörter und URLs brechen um, Code läuft nie über das Blatt hinaus, Tabellenköpfe wiederholen sich über Seiten.',
          'Mermaid-, Markmap- und Chart-Blöcke werden als Bilder eingebettet; die gewählte Schreibschrift gilt für Text, Überschriften und Code.',
        ],
      },
      typography: {
        title: 'Typografie, Thema und Zoom',
        summary: 'Mach die Seite zu deiner, ohne sie zu verlassen.',
        intro:
          'Doku bringt 24 Open-Source-Schriftfamilien, drei Themen plus eine eigene Palette und Oberflächenzoom von 75 % bis 150 % mit.',
        bullets: [
          'Wähle die Schreibschrift in den Einstellungen: sie gilt für Oberfläche, Editor, Vorschau und PDF-Export.',
          'Der Barrierefreiheitsmodus wechselt zu OpenDyslexic, Atkinson Hyperlegible oder Lexend für müheloses Lesen.',
          'Helles, dunkles und System-Thema folgen dem Betriebssystem; das eigene Thema lässt jede Farbe der Oberfläche setzen.',
          'Inhaltsfarben (Links, Überschriften, Code, Zitate) lassen sich in der Schnellaktionsleiste anpassen und mit einem Klick zurücksetzen.',
        ],
      },
      workspace: {
        title: 'Arbeitsbereich, Panels und Daten',
        summary: 'Wo Dateien und Zustand leben.',
        intro:
          'Die linke Leiste ist ein Live-Explorer des aktuellen Ordners; die rechte zeigt Metriken, letzte Dokumente und den Sitzungsstatus. Alles bleibt lokal.',
        bullets: [
          'Öffne eine gespeicherte Datei, um die linke Leiste zum Explorer zu machen: Dateien und Ordner anlegen, Verzeichnisse aufklappen, zwischen Dokumenten springen.',
          'Tabs merken sich, was offen war; Sitzung und Ansichtsmodus werden beim nächsten Start wiederhergestellt.',
          'Autosave sichert Entwürfe; das Statusabzeichen in der Kopfzeile sagt immer, ob die Seite gespeichert ist.',
          'Daten liegen in Dokumente/Doku (oder in AppUser neben der ausführbaren Datei in der portablen Windows-Version).',
        ],
      },
      manual: {
        title: 'Markdown-Handbuch',
        summary: 'Vollständige integrierte Referenz von Lorenzo DM.',
        intro:
          'Dieser Abschnitt integriert das vollständige Markdown-Handbuch im Produkt und präsentiert es als redaktionelle Referenz von Lorenzo DM.',
        bullets: [
          'Die Struktur folgt dem vollständigen Handbuch mit Grundsyntax und erweiterter Syntax.',
          'Jeder Beispielblock kann direkt kopiert und im Doku-Arbeitsbereich getestet werden.',
          'Die Live-Vorschau zeigt sofort den Unterschied zwischen Rohsyntax und gerendertem Ergebnis.',
        ],
        snippetLabel: 'Vollständiges Handbuch',
        snippet: `# Markdown-Handbuch

Version: 20201226  
Von Lorenzo DM

Dieses grundlegende Blatt basiert auf dem Referenzmaterial von [Markdown Guide](https://www.markdownguide.org) und wurde für den praktischen Einsatz in Doku angepasst.

## Inhaltsverzeichnis

### Grundlagen

1. [Grundsyntax](#grundsyntax)
2. [Überschriften](#uberschriften)
3. [Fett](#fett)
4. [Kursiv](#kursiv)
5. [Blockzitat](#blockzitat)
6. [Listen](#listen)
7. [Code](#code)
8. [Trennlinie](#trennlinie)
9. [Links](#links)
10. [Bilder](#bilder)

### Nützliche Erweiterungen

1. [Erweiterte Syntax](#erweiterte-syntax)
2. [Fußnoten](#fußnoten)
3. [Tabellen](#tabellen)
4. [Hoch- und Tiefstellung](#hoch--und-tiefstellung)
5. [Codeblöcke](#codeblocke)
6. [IDs und Sprunglinks](#ids-und-sprunglinks)
7. [Hervorgehobener Text](#hervorgehobener-text)
8. [Sonderzeichen](#sonderzeichen)

## Grundsyntax

Dies sind die Elemente des ursprünglichen Markdown von John Gruber. Fast jede Anwendung unterstützt sie.

## Überschriften

Lasse immer ein Leerzeichen zwischen \`#\` und dem Text.

\`\`\`md
# Überschrift 1
## Überschrift 2
### Überschrift 3
#### Überschrift 4
##### Überschrift 5
###### Überschrift 6
\`\`\`

## Fett

\`\`\`md
**fetter Text**
\`\`\`

Ergebnis: **fetter Text**

## Kursiv

\`\`\`md
_kursiver Text_
*kursiver Text*
\`\`\`

Ergebnis: _kursiver Text_ oder *kursiver Text*

Nützliche Kombinationen:

\`\`\`md
_Text mit **teilweiser** Betonung_
**_stark betonter Text_**
\`\`\`

## Blockzitat

\`\`\`md
> Erster Absatz.
>
> Zweiter Absatz.
\`\`\`

> Erster Absatz.
>
> Zweiter Absatz.

## Listen

### Nummerierte Liste

\`\`\`md
1. Erstes Element
2. Zweites Element
    1. Erstes Unterelement
    2. Weiteres Unterelement
3. Drittes Element
\`\`\`

### Nicht nummerierte Liste

\`\`\`md
- Erstes Element
- Zweites Element
    - Unterelement
    - Weiteres Unterelement
- Drittes Element
\`\`\`

## Code

Für Inline-Code verwende den Backtick.

\`\`\`md
\`code\`
\`\`\`

Ergebnis: \`code\`

## Trennlinie

\`\`\`md
***
\`\`\`

***

Lass danach eine Leerzeile stehen.

## Links

\`\`\`md
[Liber Liber](https://www.liberliber.it)
<https://www.liberliber.it>
\`\`\`

## Bilder

\`\`\`md
![beschreibender Text](immagini/image.jpg)
_dies ist die Bildunterschrift_
\`\`\`

Oder ein Bild im Netz:

\`\`\`md
![Liber Liber](https://www.liberliber.it/online/wp-content/uploads/2017/03/logo_liberliber.png)
*Dies ist das Logo von Liber Liber*
\`\`\`

## Erweiterte Syntax

Viele moderne Anwendungen unterstützen zusätzliche Funktionen über das Basis-Markdown hinaus.

## Fußnoten

\`\`\`md
Hier steht der Verweis auf eine Fußnote[^1].

[^1]: Und dies ist die Fußnote.
\`\`\`

## Tabellen

\`\`\`md
| links | mitte | rechts |
| :--- | :---: | ---: |
| pippo | pluto | topolino |
| paperino | paperoga | paperone |
\`\`\`

| links | mitte | rechts |
| :--- | :---: | ---: |
| pippo | pluto | topolino |
| paperino | paperoga | paperone |

## Hoch- und Tiefstellung

\`\`\`md
X^2^
H~2~O
\`\`\`

Erwartetes Ergebnis in kompatiblen Renderern: X^2^ und H~2~O

## Codeblöcke

\`\`\`\`md
\`\`\`
{
  "firstName": "John",
  "lastName": "Smith",
  "age": 25
}
\`\`\`
\`\`\`\`

## IDs und Sprunglinks

\`\`\`md
#### Beispielüberschrift {#eine-uberschrift}
[Zur Überschrift](#eine-uberschrift)
[Zu einer normalen Überschrift](#klickbare-uberschrift)
\`\`\`

## Hervorgehobener Text

\`\`\`md
==Dies ist hervorgehobener Text==
\`\`\`

## Sonderzeichen

Wenn nötig, setze einen Backslash vor die Zeichen:

\`\`\`md
\\\` \\* \\_ \\{ \\} \\[ \\] \\( \\) \\< \\> \\# \\+ \\. \\! \\|
\`\`\`

## Schlussbemerkung

Nicht jede Erweiterung wird von jedem Konverter unterstützt, aber dieses Blatt deckt die nützlichsten Formen für den redaktionellen Alltag in Doku ab.`,
      },
    },
  },
};
