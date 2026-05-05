import { promises as fs } from 'node:fs';
import { mkdtemp } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS, type Settings, type SettingsPatch } from '@doku/schemas';
import { IPC_CHANNELS } from './channels.js';
import { registerDocumentsChannel } from './documentsChannel.js';
import type { SettingsRepository } from '../settings/settingsRepository.js';

const electronMock = vi.hoisted(() => {
  const handlers = new Map<string, (event: unknown, raw?: unknown) => unknown>();
  const ownerWindow = {
    isDestroyed: vi.fn(() => false),
    isMinimized: vi.fn(() => false),
    restore: vi.fn(),
    show: vi.fn(),
    focus: vi.fn(),
  };

  return {
    handlers,
    ownerWindow,
    BrowserWindow: {
      fromWebContents: vi.fn(() => ownerWindow),
    },
    dialog: {
      showOpenDialog: vi.fn(),
      showSaveDialog: vi.fn(),
    },
    ipcMain: {
      handle: vi.fn((channel: string, handler: (event: unknown, raw?: unknown) => unknown) => {
        handlers.set(channel, handler);
      }),
      removeHandler: vi.fn((channel: string) => {
        handlers.delete(channel);
      }),
    },
  };
});

vi.mock('electron', () => ({
  BrowserWindow: electronMock.BrowserWindow,
  dialog: electronMock.dialog,
  ipcMain: electronMock.ipcMain,
}));

describe('documents channel', () => {
  let userDataDir: string;
  let settings: Settings;
  let repo: Pick<SettingsRepository, 'read' | 'update'>;
  let cleanup: (() => void) | null;

  beforeEach(async () => {
    userDataDir = await mkdtemp(join(tmpdir(), 'doku-documents-channel-'));
    settings = DEFAULT_SETTINGS;
    repo = {
      read: vi.fn(async () => settings),
      update: vi.fn(async (patch: SettingsPatch) => {
        settings = { ...settings, ...patch };
        return settings;
      }),
    };
    cleanup = registerDocumentsChannel(repo as SettingsRepository, { userDataDir });
  });

  afterEach(async () => {
    cleanup?.();
    cleanup = null;
    electronMock.handlers.clear();
    vi.clearAllMocks();
    await fs.rm(userDataDir, { recursive: true, force: true });
  });

  it('opens the save dialog as a focused child of the editor window', async () => {
    const outputPath = join(userDataDir, 'chapter.md');
    electronMock.dialog.showSaveDialog.mockResolvedValue({
      canceled: false,
      filePath: outputPath,
    });

    const result = await invokeDocumentsSave({
      id: 'draft:current',
      kind: 'draft',
      title: 'Chapter',
      content: '# Chapter',
      mode: 'save',
    });

    expect(electronMock.BrowserWindow.fromWebContents).toHaveBeenCalledWith('sender-web-contents');
    expect(electronMock.ownerWindow.show.mock.invocationCallOrder[0]).toBeLessThan(
      electronMock.dialog.showSaveDialog.mock.invocationCallOrder[0] ?? 0,
    );
    expect(electronMock.ownerWindow.focus.mock.invocationCallOrder[0]).toBeLessThan(
      electronMock.dialog.showSaveDialog.mock.invocationCallOrder[0] ?? 0,
    );
    expect(electronMock.dialog.showSaveDialog).toHaveBeenCalledWith(
      electronMock.ownerWindow,
      expect.objectContaining({
        defaultPath: 'chapter.md',
        filters: [{ name: 'Markdown', extensions: ['md'] }],
      }),
    );
    await expect(fs.readFile(outputPath, 'utf-8')).resolves.toBe('# Chapter');
    expect(result.document).toEqual(
      expect.objectContaining({
        id: outputPath,
        kind: 'file',
        path: outputPath,
        content: '# Chapter',
      }),
    );
  });

  it('autosaves repeated draft edits to one snapshot and one launcher entry', async () => {
    const first = await invokeDocumentsSave({
      id: 'draft:current',
      kind: 'draft',
      title: 'Untitled document',
      content: 'first edit',
      mode: 'autosave',
    });
    const second = await invokeDocumentsSave({
      id: 'draft:current',
      kind: 'draft',
      title: 'Untitled document',
      content: 'second edit',
      mode: 'autosave',
    });

    expect(first.document.id).toBe('draft:current');
    expect(second.document.id).toBe('draft:current');
    expect(second.launcher.recentDocuments).toHaveLength(1);
    expect(second.launcher.recentDocuments[0]).toEqual(
      expect.objectContaining({
        id: 'draft:current',
        kind: 'draft',
        snippet: 'second edit',
      }),
    );

    const autosaveFiles = await fs.readdir(join(userDataDir, 'autosave-documents'));
    expect(autosaveFiles).toHaveLength(1);

    const loaded = await invokeDocumentsLoad(second.launcher.recentDocuments[0]);
    expect(loaded).toEqual(
      expect.objectContaining({
        id: 'draft:current',
        kind: 'draft',
        content: 'second edit',
      }),
    );
  });

  it('recovers a draft autosave from the tmp file when the main snapshot was lost mid-write', async () => {
    const documentId = 'draft:lost-mid-write';
    const autosaveDir = join(userDataDir, 'autosave-documents');
    await fs.mkdir(autosaveDir, { recursive: true });
    const hash = createHash('sha256').update(documentId).digest('hex');
    const tmpPath = join(autosaveDir, `${hash}.json.tmp`);
    await fs.writeFile(
      tmpPath,
      JSON.stringify({
        id: documentId,
        title: 'Recovered draft',
        content: 'partial content saved before crash',
        lastSavedAt: '2026-05-05T00:00:00.000Z',
      }),
      'utf-8',
    );

    const loaded = await invokeDocumentsLoad({
      id: documentId,
      kind: 'draft',
      title: 'Recovered draft',
      snippet: '',
      lastOpenedAt: '2026-05-05T00:00:00.000Z',
    });

    expect(loaded).toEqual(
      expect.objectContaining({
        id: documentId,
        kind: 'draft',
        content: 'partial content saved before crash',
      }),
    );
  });

  it('falls back to the tmp autosave when the main snapshot file is corrupted JSON', async () => {
    const documentId = 'draft:corrupted-main';
    const autosaveDir = join(userDataDir, 'autosave-documents');
    await fs.mkdir(autosaveDir, { recursive: true });
    const hash = createHash('sha256').update(documentId).digest('hex');
    const mainPath = join(autosaveDir, `${hash}.json`);
    const tmpPath = join(autosaveDir, `${hash}.json.tmp`);
    await fs.writeFile(mainPath, '{ "broken": ', 'utf-8');
    await fs.writeFile(
      tmpPath,
      JSON.stringify({
        id: documentId,
        title: 'Recovered draft',
        content: 'rescued from tmp',
        lastSavedAt: '2026-05-05T01:00:00.000Z',
      }),
      'utf-8',
    );

    const loaded = await invokeDocumentsLoad({
      id: documentId,
      kind: 'draft',
      title: 'Recovered draft',
      snippet: '',
      lastOpenedAt: '2026-05-05T01:00:00.000Z',
    });

    expect(loaded).toEqual(
      expect.objectContaining({
        id: documentId,
        content: 'rescued from tmp',
      }),
    );
  });

  it('writes autosaves atomically by renaming a tmp file into place', async () => {
    await invokeDocumentsSave({
      id: 'draft:atomic',
      kind: 'draft',
      title: 'Atomic draft',
      content: 'atomic body',
      mode: 'autosave',
    });

    const autosaveFiles = await fs.readdir(join(userDataDir, 'autosave-documents'));
    expect(autosaveFiles).toHaveLength(1);
    expect(autosaveFiles[0]?.endsWith('.json')).toBe(true);
    expect(autosaveFiles.some((name) => name.endsWith('.tmp'))).toBe(false);
  });

  it('derives the saved document title from the markdown heading instead of the untitled placeholder', async () => {
    const outputPath = join(userDataDir, 'document.md');
    electronMock.dialog.showSaveDialog.mockResolvedValue({
      canceled: false,
      filePath: outputPath,
    });

    const result = await invokeDocumentsSave({
      id: 'draft:current',
      kind: 'draft',
      title: 'Untitled document',
      content: '# Real Title\n\nBody copy',
      mode: 'save',
    });

    expect(electronMock.dialog.showSaveDialog).toHaveBeenCalledWith(
      electronMock.ownerWindow,
      expect.objectContaining({
        defaultPath: 'real-title.md',
      }),
    );
    expect(result.document).toEqual(
      expect.objectContaining({
        title: 'Real Title',
        path: outputPath,
      }),
    );
  });
});

async function invokeDocumentsSave(input: unknown) {
  const handler = electronMock.handlers.get(IPC_CHANNELS.documentsSave);
  if (!handler) {
    throw new Error('documents save handler was not registered');
  }

  return handler({ sender: 'sender-web-contents' }, input) as Promise<{
    document: {
      id: string;
      kind: 'file' | 'draft';
      path?: string;
      content: string;
    };
    launcher: Settings['launcher'];
  }>;
}

async function invokeDocumentsLoad(input: unknown) {
  const handler = electronMock.handlers.get(IPC_CHANNELS.documentsLoad);
  if (!handler) {
    throw new Error('documents load handler was not registered');
  }

  return handler({ sender: 'sender-web-contents' }, input);
}
