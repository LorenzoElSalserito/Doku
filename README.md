# Doku

Local-first Markdown editor — desktop app.

## Stato

Repository allineato fino a **Sprint 13: Done**.
La release candidate del repository corrente è stata consolidata con documentazione finale, baseline QA e packaging Linux verificato.

Sprint 0 + Sprint 1 implementati: monorepo, shell Electron sicura, design system (temi Warm Ivory / Deep Slate con accento azzurro), wizard iniziale lingua + tema, persistenza impostazioni, i18n (it/en/es/de/fr/pt).

Nel repository corrente sono già presenti anche:
- Workspace-first post wizard
- Info Dialog prodotto
- Guide Center con ricerca e snippet copiabili
- tema personalizzato con editor modale colori e persistenza locale
- font di sistema per editor/preview e apertura guidata delle preferenze app predefinite per `.md`
- export PDF tipografico via LuaLaTeX
- export PDF web-style via Weasy con fallback d'errore esplicito se il runtime non è ancora bundle-embedded
- hardening accessibilità/tastiera sul workspace e sui dialog principali

Roadmap completa in [`PLAN.md`](./PLAN.md). Specifica di prodotto in [`Doku_PRD.md`](./Doku_PRD.md).

## Per un nuovo utente

- Se vuoi capire rapidamente come installare o provare Doku, parti da [docs/installazione.md](./docs/installazione.md).
- Se vuoi sapere quali dati locali usa l'app, leggi [docs/privacy-locale.md](./docs/privacy-locale.md).
- Se devi verificare gli installer o la CI di packaging, usa [docs/packaging-smoke-checklist.md](./docs/packaging-smoke-checklist.md).
- Se vuoi un riepilogo dello stato corrente della release, consulta [CHANGELOG.md](./CHANGELOG.md).
- La CI di Release Candidate ora usa anche `.github/workflows/release-candidate.yml` per eseguire la baseline QA Linux della RC.

## Requisiti

- Node.js 20 LTS
- npm 10+

## Comandi

```bash
npm install            # installa dipendenze workspace
npm run dev            # avvia Doku in modalità sviluppo (Electron)
npm run typecheck      # typecheck di tutti i workspace
npm run lint           # ESLint
npm run format         # Prettier
npm run build          # build produzione di tutti i workspace
npm run smoke:linux    # smoke check del packaging Linux gia' prodotto
```

## Struttura

```
apps/
  desktop/         # Electron app (main + preload + renderer)

packages/
  application/     # Contratti applicativi (tipi condivisi main ↔ renderer)
  domain/          # Logica pura (placeholder per sprint futuri)
  infrastructure/  # Persistence, IPC server-side
  schemas/         # Validazioni runtime (Zod)
  ui/              # Design system: tokens, tema, componenti primitivi
```

## Note architetturali

- `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`. Il renderer accede al sistema solo via `window.doku` esposto dal preload.
- Ogni stringa visibile passa dai dizionari i18n. Nessun colore/padding/font è hardcoded: tutto via CSS variables tokenizzate (`@doku/ui`).
- Palette contrattuale come da PRD §18.4 (Warm Ivory / Deep Slate, con accento `#00a3ee`).
- Il profilo locale di Doku vive in una cartella `Doku` sotto il percorso documenti dell’OS: esempio tipico `~/Documents/Doku/` oppure `~/Documenti/Doku/` su sistemi localizzati.
- In quella cartella Doku salva `settings.json`, autosave locali, metadati recenti e gli altri file applicativi che prima finivano nel legacy `userData` di Electron.
- All'avvio, se esiste ancora un profilo legacy in `~/.config/Doku` o equivalente `userData` della piattaforma, Doku ne migra i contenuti verso `Documents/Doku` senza sovrascrivere eventuali file già presenti nel nuovo percorso.
- Al primo ingresso post-wizard il workspace si presenta con entrambi i pannelli laterali chiusi e la vista editoriale in `split`; da quel momento layout pannelli e modalità `write/preview/split` continuano a vivere nelle preferenze locali dell’utente.
- Nel workspace il nome del documento non viene più promosso come elemento UI principale: per le bozze il file resta anonimo finché non viene salvato.
- Al primo salvataggio, sia `Salva` sia `Salva con nome` aprono la scelta del file e quindi definiscono nome e percorso; dai salvataggi successivi, `Salva` aggiorna direttamente il file corrente mentre `Salva con nome` apre sempre una nuova destinazione.
- Il workspace mantiene un header leggero e clusterizzato, con menu `File` e controlli sempre sopra il canvas editoriale: il dropdown non viene nascosto dal body dell'editor e resta usabile anche in split view.
- Il `Guide Center` ospita anche un manuale Markdown completo firmato Lorenzo DM, tradotto nelle lingue supportate e presentato come articolo integrato nel prodotto invece che come blocco tecnico grezzo.

## Limitazioni note nella RC corrente

- Il packaging reale degli installer è configurato ma viene eseguito principalmente in GitHub Actions.
- L'export `Weasy` è cablato nell'app ma richiede ancora il runtime Python/Weasy bundle-embedded per essere completamente autosufficiente in ogni installer.
- La RC Linux ha evidenza concreta nel repository; Windows e macOS restano allineati a livello di configurazione/workflow ma non con la stessa evidenza locale raccolta in questo repository.
- Lo scope della v1 è congelato: oltre questo punto si parla di release, hardening ulteriore o sprint successivi, non di nuove feature di prodotto.
