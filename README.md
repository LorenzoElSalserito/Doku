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
- **Editorial workspace**: write, preview and split modes are designed for long-form focus.
- **Integrated guidance**: product help and Markdown guidance are available inside the app, so you do not need to leave your writing context.
- **Beautiful light and dark themes**: Warm Ivory and Deep Slate are treated as two first-class editorial identities.
- **Multilingual from the start**: the interface supports English, Italian, Spanish, German, French and Portuguese.
- **Local export flow**: save Markdown and export PDFs through local document pipelines.
- **Privacy-first posture**: no content upload, no content analytics and no telemetry-driven writing experience.

## Core Experience

Doku starts with a short onboarding flow for language and theme. After that, the workspace becomes the center of the product: a clean editor, a live preview, optional panels, recent documents, save state, guide access and export actions.

The writing surface is intentionally restrained. It favors readability, keyboard access, persistent preferences and a clear sense of document state over crowded toolbars or technical panels.

Unsaved drafts remain a single continuous working sheet during autosave. Autosave updates the local draft snapshot and recent-document metadata without clearing the editor or creating a new blank document under the user's cursor.

Manual save uses the operating system's native file chooser as a child dialog of the Doku editor window, so the save surface stays visible and foregrounded instead of opening unnoticed behind the workspace.

The integrated Guide Center includes product help, shortcuts and Markdown reference material with examples, so the app can teach without interrupting.

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
2. Complete the first-run language and theme setup.
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

Packaged builds include the web-style PDF runtime internally, including the WeasyPrint Python environment used by Doku. Export runs locally and does not upload document content to a remote service.

## License

Doku is released under the **AGPL-3.0-only** license.

Please read LICENSE for more info.

## Copyright

© Lorenzo De Marco (Lorenzo DM) - 2026
