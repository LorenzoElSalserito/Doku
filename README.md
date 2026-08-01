# Doku

![Doku icon](apps/desktop/src/assets/icon.png)

**Doku is a local-first Markdown writing studio for desktop.**

It is designed for people who want a calm, beautiful and reliable place to write: authors, students, researchers, copywriters, essayists and anyone who prefers plain Markdown without giving up a polished editorial experience.

Doku is not a cloud workspace, not an IDE and not a noisy productivity dashboard. It opens into a focused writing environment, keeps your documents local, and gives you a refined path from draft to preview to export.

## Why Doku Exists

Writing software should get out of the way without feeling unfinished.

Doku is built around a simple product belief: **writing well should feel easy**. The interface is quiet, structured and deliberate. The editor is powerful, but the product does not force you to configure a system before you can begin. You choose your language and theme, enter the workspace, and write.

The result is a desktop Markdown editor that feels closer to a digital editorial desk than to a developer tool.

## What Makes It Different

- **Local-first by design**: documents, preferences, recent files and autosave data stay on your device.
- **No account required**: Doku does not need a login, cloud workspace or remote service to support the core writing flow.
- **Markdown-native**: write in plain `.md`, keep portable files, avoid lock-in.
- **Editorial workspace**: write, preview and split modes are designed for long-form focus, with a page-like preview that feels close to the final printed result.
- **Comfort and focus controls**: top tabs for your open documents, an adjustable and centered preview zoom, an immersive distraction-free mode, scrollable side panels and personalizable preview colors.
- **Integrated guidance**: product help and Markdown guidance are available inside the app, so you do not need to leave your writing context.
- **Beautiful light and dark themes**: Warm Ivory and Deep Slate are treated as two first-class editorial identities.
- **Bundled typography and app zoom**: Doku ships its font catalog with the app and offers 75%, 100%, 125% and 150% interface zoom without requiring system font installation.
- **Multilingual from the start**: the interface supports English, Italian, Spanish, German, French and Portuguese.
- **Local export flow**: save Markdown and export PDFs through local document pipelines.
- **Privacy-first posture**: no content upload, no content analytics and no telemetry-driven writing experience.

## Core Experience

Doku starts with a short onboarding flow for language, theme and writing font. After that, the workspace becomes the center of the product: a clean editor, a live preview, optional panels, recent documents, save state, guide access and export actions.

The writing surface is intentionally restrained. It favors readability, keyboard access, persistent preferences and a clear sense of document state over crowded toolbars or technical panels. The selected font is normalized for consistent UI behavior at 100%; the app zoom preference scales the full interface when a user wants a smaller or larger workspace.

Long Markdown lines wrap naturally, so writing remains vertical and predictable even with wide fonts or long prose. Pure Preview mode becomes a centered page-like reading surface, while Split mode keeps a compact side-by-side view for writing and checking the result.

When more than one Markdown file is opened, Doku keeps each document in its own tab. Opening a file from the system while Doku is already running no longer replaces the page you were editing: the requested document appears beside the others, and a file that is already open simply comes back into focus.

Unsaved drafts remain a single continuous working sheet during autosave. Autosave updates the local draft snapshot and recent-document metadata without clearing the editor or creating a new blank document under the user's cursor.

Manual save uses the operating system's native file chooser as a child dialog of the Doku editor window, so the save surface stays visible and foregrounded instead of opening unnoticed behind the workspace.

After the first real file save, Doku can suggest opening the system default-app preferences for Markdown files. The prompt includes a “do not ask again” choice enabled by default and is persisted locally, so it does not keep interrupting future sessions.

Visual preference changes such as zoom, theme and typography show a restart notice, making the application of layout-sensitive changes explicit instead of silently destabilizing the workspace.

The integrated Guide Center includes product help, shortcuts and Markdown reference material with examples, so the app can teach without interrupting.

## Reading, Focus And Personalization

The workspace adapts to how you want to read and write at any moment.

- **Document tabs at the top**: every open Markdown file gets its own tab across the top of the editor. Tabs gently shrink to make room as you open more documents, and when there are too many to fit, side arrows let you scroll through them. The title of the document you are editing always stays visible on its active tab.
- **More room to write**: the bars around the workspace are slimmer and the editor sits closer to the top, giving your text more breathing space.
- **Scrollable side panels**: the left workspace panel and the right information panel scroll on their own, so their content stays reachable even on smaller windows.
- **Immersive mode**: a discreet button in the bottom corner of the editor and preview hides the top bars and side panels for distraction-free reading or writing. It stays almost transparent until you move the pointer over it, and pressing it again — or the Esc key — brings everything back exactly as it was.

### Preview Zoom

Pure Preview mode shows your document as a centered page. A quiet zoom bar sits along the bottom of the page and fades out of the way until you need it:

- **Fit width** scales the page to fill the reading area.
- **Fit length** zooms out so the whole page fits in view.
- A **slider** lets you set any zoom between 50% and 300%.
- The **percentage** is also a quick control: a single click returns to 100%, and a double click lets you type an exact value.

The page stays centered at every zoom level, and a horizontal scrollbar only appears when you zoom in past the width of the view.

### Inverted Preview

The zoom bar also carries an **invert colors** button. It flips the printed page of the preview to light text on a dark sheet, including code blocks, tables and quotes, while images and diagrams keep their own colors. Pressing it again restores the paper look. The inversion is a reading aid for the current view only: it never changes the document, your color choices or the exported PDF.

### Content Colors

From the quick actions bar, a **Colors** button opens a small panel where you can personalize how key parts of your preview look:

- hyperlink color,
- heading color,
- code block background,
- quote background.

Your choices apply to the live preview in every theme, and a single reset returns any element to its default.

## Privacy And Local Data

Doku works primarily with local files. It is designed so the basic writing experience does not depend on a remote backend, cloud sync or account identity.

Application preferences and supporting local data are stored in a `Doku` folder under the user's Documents location, or the localized equivalent provided by the operating system. This can include settings, autosave data and recent-document metadata.

Some user-triggered actions may open system applications, such as a browser for external links, an email client for bug reports, or system preferences for default Markdown app settings. These actions do not upload your Markdown content through Doku.

## Installation

When you have a generated installer, use the standard installer for your platform:

- Linux: `.deb`
- Windows: `.exe`
- macOS: `.dmg`

After installation:

1. Launch Doku from the installed application.
2. Complete the first-run language, theme and font setup.
3. Open or create a Markdown document.
4. Confirm that preferences persist after closing and reopening the app.

## Run From Source

Prerequisites:

- Node.js 20 LTS
- npm 10 or newer

Install dependencies:

```bash
npm install
```

Start the desktop app in development mode:

```bash
npm run dev
```

## Quality Checks

Run the automated checks:

```bash
npm test
npm run typecheck
npm run lint
```

The current test coverage protects the recent workspace improvements, including document tabs, smoother file opening while Doku is already running, clearer visual-preference feedback and a more reliable preview experience.

Format the codebase:

```bash
npm run format
```

## Build And Package

Build the project:

```bash
npm run build
```

Create local desktop packages:

```bash
npm run package:linux
npm run package:win
npm run package:mac
```

Run the Linux packaging smoke check after producing a Linux package:

```bash
npm run smoke:linux
```

## Export Notes

Doku is designed around local export flows:

- Markdown remains the source format.
- Typographic PDF export is intended for polished reading output.
- Web-style PDF export is intended for HTML/CSS-oriented rendering.

The web-style profile uses a professional A4 stylesheet built around two rules. First, nothing is ever clipped: wide tables shrink to the text column and repeat their header across pages, long code lines and URLs wrap instead of running off the sheet, and images are scaled down to the page width. Second, the page is binding-safe: margins are mirrored, so the wider gutter always falls on the inner edge of each sheet (26 mm inner, 16 mm outer) and stapled or bound printouts never swallow text. Page numbers are printed at the bottom of every page, and the document keeps the font selected in Doku.

Packaged builds include the web-style PDF runtime internally, including the WeasyPrint Python environment used by Doku. Export runs locally and does not upload document content to a remote service.

## License

Doku is released under the **AGPL-3.0-only** license.

Please read LICENSE for more info.

## Copyright

© Lorenzo De Marco (Lorenzo DM) - 2026
