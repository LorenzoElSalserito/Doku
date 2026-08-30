# Changelog

## [Unreleased]

## [0.1.5] - 2026-08-30

- Added: Pipeline di release versionata e crash-safe, packaging Debian conforme e verifica automatica degli artefatti desktop.
- Added: Runtime PDF offline certificato per pacchetti Linux, Windows e macOS.
- Changed: Identità descrittiva aggiornata a "Your Second Mind".
- Changed: Export PDF rafforzato con font incorporati, geometria A4 rilegabile e controlli anti-clipping.

## [0.1.4] - 2026-08-01

Rendering A4 professionale per l'export PDF web/print e inversione colori dell'anteprima.

### Added

- Foglio di stile A4 professionale per l'export WeasyPrint: margini rilegabili speculari (26 mm interno, 16 mm esterno), numerazione pagina, controllo di orfane/vedove e blocchi non spezzati (titoli, righe di tabella, figure).
- Pulsante "inverti colori" nella barra zoom dell'anteprima: pagina scura e testo chiaro, incluse tabelle, blocchi codice e citazioni, senza toccare immagini, documento, colori personalizzati o PDF esportato.
- Test e2e Playwright dedicati: audit del PDF esportato (marcatori presenti, box di ogni parola dentro la banda di testo rilegabile, header di tabella ripetuto, margini speculari) e inversione colori dell'anteprima.
- Test unitari sulle invarianti del foglio di stile di stampa.

### Fixed

- Le tabelle larghe non vengono più tagliate: le colonne si adattano alla colonna di testo e l'header si ripete a ogni pagina.
- Il codice non viene più tagliato: le righe lunghe vanno a capo anche con evidenziazione della sintassi (le regole di Pandoc forzavano `white-space: pre` e un rientro sporgente fuori pagina).
- URL, parole lunghissime e codice inline non escono più dal margine destro.
- Le immagini vengono ridotte alla larghezza utile della pagina invece di essere troncate.

## [0.1.1] - 2026-05-05

Release di stabilizzazione per avvio, sessione tab, UX tab e regressioni editor/tema.

### Added

- Crash reporter locale Electron con logging del percorso `crashDumps`.
- Safe mode automatico dopo crash consecutivi durante il bootstrap.
- Persistenza completa delle tab di sessione con tab attiva e ripristino multi-tab all'avvio.
- Riordino tab tramite drag & drop nativo.
- Shortcut tab `Ctrl/Cmd+Tab`, `Ctrl/Cmd+Shift+Tab`, `Ctrl/Cmd+1..9` e `Ctrl/Cmd+W`.
- Scrollbar orizzontale delle tab in stile browser con auto-scroll della tab attiva.
- Preload e reload dei font dopo idle/ritorno in foreground, con relayout di Monaco.

### Changed

- Monaco usa worker ESM dedicato in renderer.
- I colori tema Monaco vengono normalizzati in formato hex compatibile, incluso alpha.
- Il colore selezione in dark mode passa a un azzurro tenue meno aggressivo.
- Il passaggio da Split/Preview a Write resetta la preview, rilayouta Monaco e ripristina il focus editor.

### Fixed

- Autosave snapshot scritto in modo atomico con recovery da `.tmp`.
- I file recenti mancanti restano come tab in errore invece di chiudersi silenziosamente o aprire un draft.
- Migliorata la protezione contro perdita di sessione tab durante crash o riavvio.
- Mitigazioni Linux per crash/segfault all'avvio su stack grafici problematici.

## [0.1.0-rc.1] - 2026-04-22

Prima release candidate operativa consolidata del repository corrente.

### Added

- Workspace-first post wizard senza launcher separato.
- Info Dialog con donazioni e segnalazione bug.
- Guide Center con ricerca locale, sezioni editoriali, snippet copiabili e manuale Markdown integrato.
- Tema personalizzato con dialog dedicato e persistenza.
- Font di sistema per editor e preview.
- Prompt guidato per impostazioni app predefinite `.md`.
- Export PDF con profilo `LuaLaTeX`.
- Export PDF con profilo `Weasy` lato wiring applicativo.
- Smoke check Linux eseguibile dal repository per validare `.deb`, metadata e file runtime inclusi.

### Changed

- Profilo locale spostato in `Documents/Doku` con migrazione soft dal path legacy Electron.
- Workspace ripulito nel layout iniziale e nella semantica di salvataggio.
- Persistenza della modalità `write` / `preview` / `split`.
- Menu `File` riallineato per leggibilità, layering corretto e navigazione tastiera più solida.
- Guida integrata estesa con indice navigabile e orientamento da tastiera.
- Dialog principali riallineati con lifecycle del focus più coerente.

### Fixed

- Riapertura documenti recenti non più presenti con fallback pulito a nuova bozza locale.
- Shortcut `Cmd/Ctrl+S` e `Cmd/Ctrl+Shift+S` coerenti nel flusso base.
- Dropdown `File` non più nascosto sotto il body del workspace.
- Migliorato il ritorno focus alla chiusura dei dialog principali.
- Packaging Linux riallineato con metadata `electron-builder` sufficienti a produrre un `.deb` locale.
- Split View riallineata: editor Markdown e preview ora condividono la stessa altezza utile, con scrollbar indipendenti e sincronizzazione dello scroll editor -> preview.
- Sincronizzazione scroll in split view resa più robusta anche durante uso wheel/trackpad direttamente sopra l'editor.

### Known limitations

- Il packaging reale degli installer è configurato ma viene verificato soprattutto via GitHub Actions.
- Il runtime `Weasy` non è ancora bundle-embedded in modo completo per tutte le piattaforme.
- L'evidenza più forte raccolta direttamente nel repository riguarda oggi il target Linux `.deb`.

## Formato

Questo changelog usa una struttura semplice orientata alla release candidate del progetto, non uno storico semver completo già stabilizzato.
