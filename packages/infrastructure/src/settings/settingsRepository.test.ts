import { promises as fs } from 'node:fs';
import { mkdtemp, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_SETTINGS,
  buildUnifiedDokuTypography,
  type Settings,
  type SettingsPatch,
} from '@doku/schemas';
import { SettingsRepository } from './settingsRepository.js';

let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'doku-settings-'));
});

afterEach(async () => {
  await fs.rm(tempDir, { recursive: true, force: true });
});

function makeRepo(fileName = 'settings.json'): SettingsRepository {
  return new SettingsRepository({ userDataDir: tempDir, fileName });
}

async function readFileJson(path: string): Promise<unknown> {
  return JSON.parse(await fs.readFile(path, 'utf-8'));
}

describe('SettingsRepository', () => {
  it('persists font choice across a fresh read (simulating restart)', async () => {
    const repo = makeRepo();
    await repo.read();

    await repo.update({ typography: buildUnifiedDokuTypography('Merriweather') });

    const repo2 = makeRepo();
    const reloaded = await repo2.read();
    expect(reloaded.typography.uiFontFamily).toBe('Merriweather');
  });

  it('does not lose typography when a launcher update races with a font update', async () => {
    const repo = makeRepo();
    await repo.read();

    const fontPatch: SettingsPatch = {
      typography: buildUnifiedDokuTypography('Lora'),
      writingFontFamily: null,
    };
    const launcherPatch: SettingsPatch = {
      launcher: {
        recentDocuments: [
          {
            id: 'doc-1',
            kind: 'file',
            title: 'Notes',
            path: '/tmp/notes.md',
            snippet: 'snippet',
            lastOpenedAt: new Date().toISOString(),
          },
        ],
        quickResumeId: 'doc-1',
      },
    };

    const [afterFont, afterLauncher] = await Promise.all([
      repo.update(fontPatch),
      repo.update(launcherPatch),
    ]);

    // The font update lands first; its returned snapshot has the new font.
    expect(afterFont.typography.uiFontFamily).toBe('Lora');
    // The launcher update lands second on top of the font state; both fields
    // must be present — the regression is launcher overwriting typography.
    expect(afterLauncher.typography.uiFontFamily).toBe('Lora');
    expect(afterLauncher.launcher.recentDocuments).toHaveLength(1);

    const repo2 = makeRepo();
    const reloaded = await repo2.read();
    expect(reloaded.typography.uiFontFamily).toBe('Lora');
    expect(reloaded.launcher.recentDocuments).toHaveLength(1);
    expect(reloaded.launcher.quickResumeId).toBe('doc-1');
  });

  it('serializes many concurrent updates without dropping any field', async () => {
    const repo = makeRepo();
    await repo.read();

    const fonts = ['Inter', 'Roboto', 'Open Sans', 'Lora', 'Merriweather'] as const;
    const updates = fonts.map((family) =>
      repo.update({ typography: buildUnifiedDokuTypography(family) }),
    );
    // Add launcher updates interleaved.
    const launcherUpdates = [0, 1, 2].map((i) =>
      repo.update({ launcher: { recentDocuments: [], quickResumeId: `q-${i}` } }),
    );
    const results = await Promise.all([...updates, ...launcherUpdates]);

    // The last-applied state must be a valid combination of the patches.
    const last = results[results.length - 1];
    const repo2 = makeRepo();
    const reloaded = await repo2.read();
    // The reloaded state must equal the in-memory last result.
    expect(reloaded).toEqual(last);
    // Typography must be one of the fonts we requested (not dropped to default).
    expect(fonts).toContain(reloaded.typography.uiFontFamily as (typeof fonts)[number]);
  });

  it('writes settings atomically (no settings.json appears truncated mid-write)', async () => {
    const repo = makeRepo();
    await repo.read();

    // Fire a barrage of updates; while they are running the repo should never
    // leave settings.json with non-JSON content.
    const checks: Array<Promise<void>> = [];
    const updatePromise = (async () => {
      for (let i = 0; i < 25; i += 1) {
        await repo.update({
          typography: buildUnifiedDokuTypography(i % 2 === 0 ? 'Inter' : 'Lora'),
        });
      }
    })();

    for (let i = 0; i < 25; i += 1) {
      checks.push(
        (async () => {
          // Sneak read attempts in between writes.
          try {
            const raw = await fs.readFile(join(tempDir, 'settings.json'), 'utf-8');
            // Whenever the file is observable, it must be parseable JSON.
            JSON.parse(raw);
          } catch (err: unknown) {
            // ENOENT is acceptable (initial moment), JSON parse error is not.
            if (
              !(err instanceof Error) ||
              !('code' in err) ||
              (err as NodeJS.ErrnoException).code !== 'ENOENT'
            ) {
              throw err;
            }
          }
        })(),
      );
    }

    await Promise.all([updatePromise, ...checks]);

    const final = (await readFileJson(join(tempDir, 'settings.json'))) as Settings;
    // No leftover .tmp-* files after the queue drains.
    const entries = await readdir(tempDir);
    expect(entries.filter((name) => name.includes('.tmp-'))).toEqual([]);
    expect(final.typography.uiFontFamily).toMatch(/Inter|Lora/);

    const backup = (await readFileJson(join(tempDir, 'settings.json.bak'))) as Settings;
    expect(backup).toEqual(final);
  });

  it('recovers font settings from a leftover temp file when settings.json is corrupted', async () => {
    // Simulate: previous run persisted a temp file successfully but crashed
    // before rename finished, AND a stale corrupt settings.json exists.
    const settingsPath = join(tempDir, 'settings.json');
    const tempPath = join(tempDir, 'settings.json.tmp-1234-5678');
    const validState: Settings = {
      ...DEFAULT_SETTINGS,
      typography: buildUnifiedDokuTypography('Lora'),
    };
    await writeFile(tempPath, JSON.stringify(validState, null, 2), 'utf-8');
    await writeFile(settingsPath, '{ "broken": ', 'utf-8');

    const repo = makeRepo();
    const recovered = await repo.read();
    expect(recovered.typography.uiFontFamily).toBe('Lora');

    // After recovery, the temp file is consumed and settings.json is valid.
    const final = (await readFileJson(settingsPath)) as Settings;
    expect(final.typography.uiFontFamily).toBe('Lora');
    const entries = await readdir(tempDir);
    expect(entries.filter((name) => name.startsWith('settings.json.tmp-'))).toEqual([]);
  });

  it('recovers from the durable backup when settings.json is corrupted after a successful write', async () => {
    const settingsPath = join(tempDir, 'settings.json');
    const backupPath = join(tempDir, 'settings.json.bak');
    const repo = makeRepo();
    await repo.update({ typography: buildUnifiedDokuTypography('Merriweather') });

    await writeFile(settingsPath, '{ "broken": ', 'utf-8');

    const repo2 = makeRepo();
    const recovered = await repo2.read();
    expect(recovered.typography.uiFontFamily).toBe('Merriweather');

    const final = (await readFileJson(settingsPath)) as Settings;
    const backup = (await readFileJson(backupPath)) as Settings;
    expect(final.typography.uiFontFamily).toBe('Merriweather');
    expect(backup).toEqual(final);
  });

  it('falls back to defaults when settings.json is corrupted and no temp file exists', async () => {
    const settingsPath = join(tempDir, 'settings.json');
    await writeFile(settingsPath, '{ "broken": ', 'utf-8');
    const repo = makeRepo();
    const reloaded = await repo.read();
    expect(reloaded).toEqual(DEFAULT_SETTINGS);
    // settings.json got rewritten with defaults so subsequent reads succeed.
    const final = (await readFileJson(settingsPath)) as Settings;
    expect(final).toEqual(DEFAULT_SETTINGS);
  });

  // The v0.1.0 → v0.1.1 reinstall scenario from BUG.md: a previous-version
  // settings file is still on disk and the new schema added/changed fields.
  // The repo must NOT throw away the user's preferences, and must NOT bounce
  // them back into the first-run wizard.
  it('preserves user preferences and firstRunCompleted when the on-disk schema is older than the running version', async () => {
    const settingsPath = join(tempDir, 'settings.json');
    // Settings shaped like an older release: missing `workspaceViewMode`
    // (a top-level required field added later), missing
    // `customTheme.focusRing` (a nested required field added later), and
    // missing `launcher.quickResumeId` (a nested required field added later).
    // No `firstRunCompleted` field — the older version didn't have it.
    const legacyJson = {
      language: 'it',
      theme: 'dark',
      appZoom: 125,
      customTheme: {
        mode: 'dark',
        base: '#101010',
        surface: '#181818',
        elevated: '#202020',
        accent: '#00A3EE',
        accentSoft: '#0E2A3A',
        textPrimary: '#FFFFFF',
        textSecondary: '#B0B0B0',
        border: '#2A2A2A',
        // focusRing intentionally omitted (added in newer schema)
      },
      typography: {
        profile: 'professional',
        uiFontFamily: 'Lora',
        pdfFontFamily: 'Lora',
        monospaceFontFamily: 'Lora',
        accessibilityFontFamily: 'Lora',
        accessibilityMode: false,
      },
      writingFontFamily: null,
      workspaceQuickActionsVisible: true,
      defaultMarkdownAppPrompt: { dismissed: true, shown: true },
      launcher: {
        recentDocuments: [
          {
            id: 'doc-legacy',
            kind: 'file',
            title: 'Legacy Note',
            path: '/tmp/legacy.md',
            snippet: 'snippet',
            lastOpenedAt: '2026-01-01T00:00:00.000Z',
          },
        ],
        // quickResumeId intentionally omitted
      },
      workspace: {
        leftPanelWidth: 300,
        rightPanelWidth: 360,
        leftPanelCollapsed: false,
        rightPanelCollapsed: true,
      },
      // workspaceViewMode intentionally omitted
    };
    await writeFile(settingsPath, JSON.stringify(legacyJson, null, 2), 'utf-8');

    const repo = makeRepo();
    const recovered = await repo.read();

    // User preferences from the older file are preserved.
    expect(recovered.language).toBe('it');
    expect(recovered.theme).toBe('dark');
    expect(recovered.appZoom).toBe(125);
    expect(recovered.typography.uiFontFamily).toBe('Lora');
    expect(recovered.workspaceQuickActionsVisible).toBe(true);
    expect(recovered.workspace.leftPanelWidth).toBe(300);
    expect(recovered.launcher.recentDocuments).toHaveLength(1);
    expect(recovered.launcher.recentDocuments[0]?.id).toBe('doc-legacy');
    // Newly-introduced nested fields are filled in from defaults.
    expect(recovered.customTheme.focusRing).toBe(DEFAULT_SETTINGS.customTheme.focusRing);
    expect(recovered.customTheme.base).toBe('#101010'); // user value preserved
    expect(recovered.launcher.quickResumeId).toBeNull();
    // Newly-introduced top-level fields are filled in from defaults.
    expect(recovered.workspaceViewMode).toBe(DEFAULT_SETTINGS.workspaceViewMode);
    // Critical: the user is NOT bounced back to the setup wizard.
    expect(recovered.firstRunCompleted).toBe(true);

    // The repo persists the normalized result so subsequent reads are fast.
    const final = (await readFileJson(settingsPath)) as Settings;
    expect(final.firstRunCompleted).toBe(true);
    expect(final.typography.uiFontFamily).toBe('Lora');
    expect(final.customTheme.focusRing).toBe(DEFAULT_SETTINGS.customTheme.focusRing);
  });

  it('recovers gracefully when a single field has an invalid value (e.g. retired enum)', async () => {
    const settingsPath = join(tempDir, 'settings.json');
    // Realistic legacy file: user had completed setup, then picked a font
    // that no longer exists in the catalog of the new version.
    const { firstRunCompleted: _ignored, ...rest } = DEFAULT_SETTINGS;
    const legacyJson = {
      ...rest,
      language: 'fr',
      typography: {
        ...DEFAULT_SETTINGS.typography,
        uiFontFamily: 'ComicSansLegacy',
      },
    };
    await writeFile(settingsPath, JSON.stringify(legacyJson, null, 2), 'utf-8');

    const repo = makeRepo();
    const recovered = await repo.read();

    expect(recovered.language).toBe('fr');
    // The invalid typography field falls back to the default.
    expect(recovered.typography).toEqual(DEFAULT_SETTINGS.typography);
    // Missing firstRunCompleted on a legacy file is treated as completed.
    expect(recovered.firstRunCompleted).toBe(true);
  });
});
