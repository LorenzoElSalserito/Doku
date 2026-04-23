import type { Dictionary } from '../keys.js';

export const it: Dictionary = {
  app: {
    name: 'Doku',
    loading: 'Preparo il tuo studio…',
    errorTitle: 'Qualcosa è andato storto.',
    unknownError: 'Errore sconosciuto',
    skipToEditor: 'Vai direttamente all’editor',
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
    light: 'Chiaro',
    lightDescription: 'Warm Ivory — tono editoriale diurno con accento azzurro',
    dark: 'Scuro',
    darkDescription: 'Deep Slate — tono soffuso con accento azzurro',
    custom: 'Personalizzato',
    customDescription: 'Palette editoriale definita da te',
    system: 'Sistema',
    systemDescription: 'Segue le preferenze del tuo sistema',
  },
  wizard: {
    eyebrow: 'Benvenuto in Doku',
    steps: {
      language: 'Lingua',
      theme: 'Tema',
      confirm: 'Pronto',
    },
    language: {
      title: 'Scegli la tua lingua',
      subtitle:
        'Doku parlerà la lingua che preferisci. Puoi cambiarla in qualsiasi momento dalle impostazioni.',
    },
    theme: {
      title: 'Scegli l’atmosfera',
      subtitle: 'Due identità editoriali di pari dignità. L’anteprima si aggiorna dal vivo.',
      previewHeading: 'Una pagina che vale la cura',
      previewBody:
        'Doku considera la pagina il cuore del tuo mestiere. Ogni superficie, ogni spazio, ogni dettaglio tipografico è pensato per lasciare le parole in primo piano.',
    },
    confirm: {
      title: 'Tutto pronto — apri il tuo studio',
      subtitle: 'Le preferenze sono salvate su questo dispositivo.',
      languageLabel: 'Lingua',
      themeLabel: 'Tema',
      nextSteps:
        'Dopo il wizard entri subito nel foglio. Guida ed export continuano a crescere nelle milestone successive.',
    },
    actions: {
      back: 'Indietro',
      next: 'Continua',
      finish: 'Entra in Doku',
    },
  },
  workspace: {
    breadcrumbHome: 'Home',
    breadcrumbWorkspace: 'Workspace',
    untitledDocument: 'Documento senza titolo',
    statusLocal: 'Local-first',
    statusReady: 'Shell pronta',
    leftPanelLabel: 'Pannello sinistro',
    rightPanelLabel: 'Pannello destro',
    guide: 'Guida',
    export: 'Export',
    settings: 'Impostazioni',
    info: 'Informazioni',
    fileMenu: {
      trigger: 'File',
      newDocument: 'Nuovo documento',
      openFile: 'Apri file…',
      recentHeading: 'Recenti',
      recentEmpty: 'Nessun documento recente',
    },
    quickActions: {
      toggleShow: 'Mostra azioni rapide',
      toggleHide: 'Nascondi azioni rapide',
      barLabel: 'Azioni rapide Markdown',
      tableButton: 'Tabella',
      tableRows: 'Righe',
      tableColumns: 'Colonne',
      tableInsert: 'Inserisci tabella',
      h1: 'H1',
      h2: 'H2',
      bold: 'Grassetto',
      italic: 'Corsivo',
      link: 'Link',
      image: 'Immagine',
      bulletList: 'Puntato',
      orderedList: 'Numerato',
      checklist: 'Checklist',
      quote: 'Citazione',
      inlineCode: 'Codice inline',
      codeBlock: 'Blocco codice',
      divider: 'Separatore',
    },
    workspaceExplorer: {
      title: 'Workspace',
      body: 'I file della cartella corrente restano vicini, così puoi muoverti nel progetto senza uscire dalla pagina.',
      empty: 'In questa cartella non ci sono ancora file visibili.',
      draftHint: 'Salva questa bozza per trasformare il pannello sinistro in uno workspace explorer reale.',
      openFolder: 'Cartella corrente',
      newFile: 'Nuovo file',
      newFolder: 'Nuova cartella',
      newFilePrompt: 'Nome del nuovo file Markdown',
      newFolderPrompt: 'Nome della nuova cartella',
      createFileError: 'Impossibile creare il file. Controlla il nome e riprova.',
      createFolderError: 'Impossibile creare la cartella. Controlla il nome e riprova.',
      directory: 'Cartella',
      markdown: 'File Markdown',
      asset: 'Asset',
      other: 'File',
    },
    projectPanelEyebrow: 'Progetto',
    projectPanelTitle: 'Una scrivania silenziosa per il tuo manoscritto',
    projectPanelBody:
      'Questo lato ospiterà navigazione, sezioni recenti e contesto di progetto. Per ora definisce ritmo, gerarchia e respiro.',
    projectPanelMeta: 'La larghezza del pannello è già persistente tra le sessioni.',
    outlineTitle: 'Placeholder struttura',
    outlineBody: 'Titoli, struttura e salti rapidi sono disponibili qui per muoversi nel contenuto senza perdere il contesto.',
    notesTitle: 'Placeholder contesto',
    notesBody: 'Note, metadati e contesto editoriale si appoggiano su questo lato senza rubare spazio alla pagina.',
    previewTitle: 'Placeholder colonna preview',
    previewBody: 'Export, controlli stilistici e strumenti di lettura arriveranno qui in modo progressivo.',
    editorEyebrow: 'Area di scrittura',
    editorTitle: 'L’editor arriva nel prossimo sprint',
    editorBody:
      'Questa shell definisce proporzioni, transizioni e calma necessarie per il vero workspace Markdown.',
    editorHint: 'Prossimo sprint: Monaco, apri/salva e prima pagina modificabile.',
    editorLoading: 'Preparo la pagina…',
    editorErrorTitle: 'Impossibile caricare il documento',
    editorErrorBody: 'Controlla il percorso del file o riaprilo dal launcher.',
    missingDocumentNotice:
      'Il documento selezionato non è più disponibile. Doku ha aperto una nuova bozza locale e ha rimosso il riferimento non valido dai recenti.',
    save: 'Salva',
    saveAs: 'Salva con nome',
    writeMode: 'Scrivi',
    previewMode: 'Anteprima',
    splitMode: 'Split',
    previewEyebrow: 'Anteprima',
    previewEmpty: 'Inizia a scrivere e qui apparirà l’anteprima editoriale.',
    imageDropzoneEyebrow: 'Drop immagine',
    imageDropzoneTitle: 'Rilascia l’immagine per importarla in questo documento.',
    imageImportSuccess: 'Immagine aggiunta: {{fileName}}',
    imageImportSaveFirst: 'Salva il documento prima di importare immagini.',
    imageImportUnsupported: 'Questo formato immagine non è supportato.',
    imageImportMissingSource: 'L’immagine selezionata non è più disponibile.',
    imageImportAllocationFailed: 'Doku non è riuscito a riservare un percorso locale pulito per l’immagine.',
    savedStatus: 'Salvato',
    dirtyStatus: 'Modifiche non salvate',
    savingStatus: 'Salvataggio…',
    errorStatus: 'Errore di salvataggio',
    savedAtLabel: 'Ultimo salvataggio',
    autosaveLabel: 'Autosave attivo',
    draftLabel: 'Bozza',
    fileLabel: 'File Markdown',
    wordCountLabel: 'Parole',
    charCountLabel: 'Caratteri',
    recentDocumentsTitle: 'Documenti recenti',
    recentDocumentsBody: 'Rientra rapidamente nelle pagine toccate più di recente.',
    sessionTitle: 'Sessione corrente',
    sessionBody: 'Uno sguardo rapido su salvataggio, vista attiva e stato locale del documento.',
    sessionUpdatedLabel: 'Aggiornato',
    sessionViewModeLabel: 'Vista',
    sessionStorageLabel: 'Storage',
    sessionStorageDraft: 'Bozza locale',
    sessionStorageFile: 'File collegato',
    untitledPlaceholderBody: 'Una pagina vuota, pronta per la prima riga.',
    leftPanelToggleCollapse: 'Chiudi pannello sinistro',
    leftPanelToggleExpand: 'Apri pannello sinistro',
    rightPanelToggleCollapse: 'Chiudi pannello destro',
    rightPanelToggleExpand: 'Apri pannello destro',
    resizeLeftPanel: 'Ridimensiona pannello sinistro',
    resizeRightPanel: 'Ridimensiona pannello destro',
  },
  settings: {
    title: 'Impostazioni',
    subtitle: 'Tutto rimane su questo dispositivo.',
    languageLabel: 'Lingua',
    languageHint: 'Applicata subito, nessun riavvio necessario.',
    themeLabel: 'Tema',
    themeHint: 'Chiaro, scuro o allineato al sistema.',
    fontLabel: 'Font di scrittura',
    fontHint: 'Si applica a editor e anteprima usando i font già installati su questo sistema.',
    fontLoading: 'Carico i font di sistema…',
    fontDefault: 'Default Doku',
    fontLatexNotice: 'I font di sistema personalizzati non vengono incorporati nell’export LuaLaTeX.',
    openDefaultApps: 'Apri preferenze app predefinite',
    defaultAppsHint: 'Puoi anche configurare Doku come app predefinita per i file .md dalle impostazioni di sistema.',
    customThemeOpen: 'Modifica tema personalizzato',
    customThemeHint: 'Scegli i token principali della palette e applicali a Doku.',
    close: 'Fatto',
    customTheme: {
      title: 'Tema personalizzato',
      subtitle: 'Definisci una palette editoriale tua e applicala senza riavviare l’app.',
      reset: 'Ripristina',
      apply: 'Applica',
      close: 'Chiudi',
      modeLabel: 'Base del tema',
      previewLabel: 'Anteprima',
      fields: {
        base: 'Base',
        surface: 'Surface',
        elevated: 'Elevated',
        accent: 'Accent',
        accentSoft: 'Accent soft',
        textPrimary: 'Testo primario',
        textSecondary: 'Testo secondario',
        border: 'Bordo',
        focusRing: 'Focus ring',
      },
    },
  },
  defaultAppPrompt: {
    title: 'Imposta Doku come app predefinita per i file .md',
    subtitle: 'Doku apre solo le preferenze di sistema. Non cambia nulla in modo silenzioso.',
    openPreferences: 'Apri preferenze di sistema',
    notNow: 'Non ora',
    linuxHint: 'Su Linux il percorso esatto dipende dall’ambiente desktop in uso.',
  },
  exportDialog: {
    title: 'Esporta PDF',
    subtitle: 'Scegli lo stile PDF più adatto al documento e generarlo in locale.',
    profileLabel: 'Profilo PDF',
    profiles: {
      lualatex: {
        label: 'Tipografico',
        title: 'PDF tipografico',
        description:
          'Più editoriale e vicino alla pagina stampata. Ideale quando contano gerarchia, ritmo serif e tono da libro.',
      },
      weasy: {
        label: 'Web/print',
        title: 'PDF stile web',
        description:
          'Più vicino a HTML e print CSS. Utile quando vuoi una pagina moderna, con resa più simile al browser.',
      },
    },
    documentLabel: 'Documento',
    outputLabel: 'Percorso output',
    outputHint: 'Doku sta preparando il PDF e lo sta salvando nella destinazione scelta.',
    confirm: 'Esporta PDF',
    exporting: 'Esporto…',
    close: 'Chiudi',
    successTitle: 'Export completato',
    successBody: 'Il PDF è stato generato correttamente in questo percorso.',
    errorTitle: 'Export non riuscito',
    errorGeneric: 'L’export PDF non è riuscito prima di generare il file.',
    resultEngineLabel: 'Profilo usato',
  },
  info: {
    title: 'Doku',
    subtitle: 'Studio editoriale locale per la scrittura Markdown.',
    versionLabel: 'Versione',
    licenseLabel: 'Licenza',
    local: 'Tutto rimane su questo dispositivo.',
    donations: 'Donazioni',
    reportBug: 'Segnala un bug',
    close: 'Chiudi',
  },
  guideCenter: {
    title: 'Guide Center',
    subtitle: 'Doku spiega se stesso senza farti uscire dal foglio.',
    searchLabel: 'Cerca nella guida',
    searchPlaceholder: 'Markdown, pannelli, scorciatoie…',
    navLabel: 'Sezioni guida',
    noResults: 'Nessuna sezione corrisponde alla ricerca corrente.',
    close: 'Chiudi guida',
    copy: 'Copia snippet',
    copied: 'Snippet copiato',
    livePreview: 'Anteprima live',
    sections: {
      quickStart: {
        title: 'Avvio rapido',
        summary: 'Prendi il foglio e inizia a scrivere.',
        intro:
          'Doku è pensato per ridurre l’attrito iniziale: entri, scrivi, salvi. La shell resta quieta e ti accompagna senza chiederti configurazioni premature.',
        bullets: [
          'Usa File per creare un nuovo documento o aprire un Markdown esistente.',
          'Scrivi al centro, controlla stato e formato dall’header, lascia che l’autosave faccia il resto.',
          'Passa da Scrivi, Anteprima e Split per scegliere il ritmo giusto per il momento.',
        ],
        snippetLabel: 'Snippet di partenza',
        snippet: `# Titolo del documento

Scrivi il paragrafo iniziale con calma.

- Un punto chiave
- Un dettaglio utile
- Una chiusura pulita`,
      },
      uiTour: {
        title: 'Tour dell’interfaccia',
        summary: 'Capire la shell in pochi secondi.',
        intro:
          'L’interfaccia di Doku è divisa in zone semplici: header leggero, foglio centrale, pannelli laterali opzionali. Ogni elemento ha un solo compito.',
        bullets: [
          'L’header raccoglie file, modalità di vista, salvataggio, guida, export e impostazioni.',
          'Il pannello sinistro mostra contesto documento, metriche e struttura rapida.',
          'Il pannello destro ospita appunti, supporti di lettura e superfici secondarie.',
        ],
      },
      markdown: {
        title: 'Markdown base',
        summary: 'Le forme essenziali che usi più spesso.',
        intro:
          'Per scrivere bene in Markdown bastano pochi pattern ricorrenti. Doku li rende leggibili sia in editor sia in anteprima, senza trasformarli in una grammatica ostile.',
        bullets: [
          'Usa `#` e `##` per costruire una gerarchia chiara prima ancora del testo lungo.',
          'Liste e citazioni funzionano bene per appunti, strutture, revisioni e materiali preparatori.',
          'Il codice inline e i blocchi recintati servono quando devi mostrare sintassi o percorsi con precisione.',
        ],
        snippetLabel: 'Esempio Markdown',
        snippet: `# Capitolo uno

Un paragrafo con **enfasi** e \`codice inline\`.

> Una citazione breve per fissare il tono.

1. Prima idea
2. Seconda idea
3. Chiusura`,
      },
      shortcuts: {
        title: 'Scorciatoie e ritmo',
        summary: 'Meno mouse, più continuità.',
        intro:
          'Doku premia un flusso tranquillo. Le azioni frequenti restano vicine, ma la tastiera deve poter sostenere tutto il percorso base.',
        bullets: [
          'Usa Escape per chiudere menu e dialog quando vuoi tornare subito al foglio.',
          'Usa Cmd/Ctrl+S per salvare e Cmd/Ctrl+Shift+S per aprire Salva con nome.',
          'Salva con regolarità anche se l’autosave è attivo: il feedback di stato ti conferma sempre dove sei.',
          'Tieni i pannelli chiusi quando stai componendo e riaprili solo nei momenti di controllo o revisione.',
        ],
      },
      manual: {
        title: 'Manuale Markdown',
        summary: 'Guida completa in italiano firmata Lorenzo DM.',
        intro:
          'Questa guida integrata riprende il manuale essenziale Markdown fornito per Doku e viene presentata nel prodotto come testo editoriale di Lorenzo DM.',
        bullets: [
          'Copre sintassi di base ed estesa in italiano, con esempi pensati per chi scrive anche in semplici editor di testo.',
          'Ogni blocco è pensato per essere copiato, provato nel foglio e verificato subito nell’anteprima di Doku.',
          'Quando una funzione Markdown non è supportata ovunque, il manuale lo segnala in modo esplicito.',
        ],
        snippetLabel: 'Manuale completo',
        snippet: `# Manuale Markdown

Versione: 20201226  
Di Lorenzo DM

Questa scheda essenziale nasce dal materiale di riferimento di [Markdown Guide](https://www.markdownguide.org) ed è stata adattata per l'uso pratico dentro Doku.

## Sommario

### Fondamenti

1. [Sintassi di base](#sintassi-di-base)
2. [Titoli](#titoli)
3. [Grassetto](#grassetto)
4. [Corsivo](#corsivo)
5. [Blocco di citazione](#blocco-di-citazione)
6. [Liste](#liste)
7. [Codice](#codice)
8. [Linea di separazione](#linea-di-separazione)
9. [Link](#link)
10. [Immagini](#immagini)

### Estensioni utili

1. [Sintassi estesa](#sintassi-estesa)
2. [Note a pie' di pagina](#note-a-pie-di-pagina)
3. [Tabelle](#tabelle)
4. [Apice e pedice](#apice-e-pedice)
5. [Blocchi di codice](#blocchi-di-codice)
6. [ID e link alle intestazioni](#id-e-link-alle-intestazioni)
7. [Testo evidenziato](#testo-evidenziato)
8. [Caratteri speciali](#caratteri-speciali)

## Sintassi di base

Questi sono gli elementi definiti dal Markdown originale di John Gruber. Sono quelli che quasi ogni applicazione supporta.

## Titoli

Lascia sempre uno spazio tra \`#\` e il testo.

\`\`\`md
# Titolo 1
## Titolo 2
### Titolo 3
#### Titolo 4
##### Titolo 5
###### Titolo 6
\`\`\`

## Grassetto

\`\`\`md
**testo in grassetto**
\`\`\`

Risultato: **testo in grassetto**

## Corsivo

\`\`\`md
_testo in corsivo_
*testo in corsivo*
\`\`\`

Risultato: _testo in corsivo_ oppure *testo in corsivo*

Combinazioni utili:

\`\`\`md
_testo **parzialmente** enfatizzato_
**_testo molto enfatizzato_**
\`\`\`

## Blocco di citazione

\`\`\`md
> Primo capoverso.
>
> Secondo capoverso.
\`\`\`

> Primo capoverso.
>
> Secondo capoverso.

## Liste

### Lista numerata

\`\`\`md
1. Primo elemento
2. Secondo elemento
    1. Primo sotto-elemento
    2. Altro sotto-elemento
3. Terzo elemento
\`\`\`

### Lista non numerata

\`\`\`md
- Primo elemento
- Secondo elemento
    - Sotto-elemento
    - Altro sotto-elemento
- Terzo elemento
\`\`\`

## Codice

Per codice inline usa il backtick grave.

\`\`\`md
\`codice\`
\`\`\`

Risultato: \`codice\`

## Linea di separazione

\`\`\`md
***
\`\`\`

***

Ricorda di lasciare una riga vuota dopo la linea.

## Link

\`\`\`md
[Liber Liber](https://www.liberliber.it)
<https://www.liberliber.it>
\`\`\`

## Immagini

\`\`\`md
![testo descrittivo](immagini/image.jpg)
_questa è la didascalia_
\`\`\`

Oppure un'immagine in rete:

\`\`\`md
![Liber Liber](https://www.liberliber.it/online/wp-content/uploads/2017/03/logo_liberliber.png)
*Questo è il logo di Liber Liber*
\`\`\`

## Sintassi estesa

Molte applicazioni moderne supportano caratteristiche aggiuntive oltre al Markdown di base.

## Note a pie' di pagina

\`\`\`md
Qui abbiamo il riferimento a una nota[^1].

[^1]: E questa è la nota.
\`\`\`

## Tabelle

\`\`\`md
| sinistra | centro | destra |
| :--- | :---: | ---: |
| pippo | pluto | topolino |
| paperino | paperoga | paperone |
\`\`\`

| sinistra | centro | destra |
| :--- | :---: | ---: |
| pippo | pluto | topolino |
| paperino | paperoga | paperone |

## Apice e pedice

\`\`\`md
X^2^
H~2~O
\`\`\`

Risultato atteso in renderer compatibili: X^2^ e H~2~O

## Blocchi di codice

\`\`\`\`md
\`\`\`
{
  "firstName": "John",
  "lastName": "Smith",
  "age": 25
}
\`\`\`
\`\`\`\`

## ID e link alle intestazioni

\`\`\`md
#### Titolo di esempio {#un-titolo}
[Vai al titolo](#un-titolo)
[Vai a un titolo normale](#titolo-cliccabile)
\`\`\`

## Testo evidenziato

\`\`\`md
==Questo è un testo evidenziato==
\`\`\`

## Caratteri speciali

Quando serve, precedi i simboli con un backslash:

\`\`\`md
\\\` \\* \\_ \\{ \\} \\[ \\] \\( \\) \\< \\> \\# \\+ \\. \\! \\|
\`\`\`

## Nota finale

Non tutte le estensioni sono supportate da ogni convertitore, ma questa scheda copre le forme più utili nel lavoro editoriale quotidiano dentro Doku.`,
      },
    },
  },
};
