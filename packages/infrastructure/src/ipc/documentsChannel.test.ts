import { promises as fs } from 'node:fs';
import { mkdtemp } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
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
