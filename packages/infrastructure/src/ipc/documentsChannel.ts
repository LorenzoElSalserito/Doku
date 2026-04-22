import { createHash, randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { BrowserWindow, dialog, ipcMain, type OpenDialogOptions, type SaveDialogOptions } from 'electron';
import {
  DocumentSaveRequestSchema,
  DocumentSummarySchema,
  type DocumentOperationResult,
  type DocumentSaveRequest,
  type DocumentSession,
  type DocumentSummary,
  type LauncherState,
  type Settings,
} from '@doku/schemas';
import type { SettingsRepository } from '../settings/settingsRepository.js';
import { IPC_CHANNELS } from './channels.js';

const MARKDOWN_EXTENSIONS = ['md', 'markdown', 'mdown'];
const MAX_SNIPPET_LENGTH = 220;
const MAX_RECENTS = 6;

interface DocumentsChannelOptions {
  userDataDir: string;
}

export function registerDocumentsChannel(
  repo: SettingsRepository,
  options: DocumentsChannelOptions,
): () => void {
  const autosaveDir = join(options.userDataDir, 'autosave-documents');

  const openMarkdownFileHandler = async (
    event: Electron.IpcMainInvokeEvent,
  ): Promise<DocumentOperationResult | null> => {
    const ownerWindow = BrowserWindow.fromWebContents(event.sender) ?? undefined;
    const dialogOptions: OpenDialogOptions = {
      properties: ['openFile'],
      filters: [
        { name: 'Markdown', extensions: MARKDOWN_EXTENSIONS },
        { name: 'All files', extensions: ['*'] },
      ],
    };
    const result = ownerWindow
      ? await dialog.showOpenDialog(ownerWindow, dialogOptions)
      : await dialog.showOpenDialog(dialogOptions);

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    const filePath = result.filePaths[0];
    if (!filePath) {
      return null;
    }

    const document = await loadFileDocument(filePath, autosaveDir);
    const launcher = await persistOpenedDocument(repo, document);
    return { document, launcher };
  };

  const loadDocumentHandler = async (
    _event: Electron.IpcMainInvokeEvent,
    raw: unknown,
  ): Promise<DocumentSession | null> => {
    const summary = DocumentSummarySchema.parse(raw);
    if (summary.kind === 'file' && summary.path) {
      try {
        return await loadFileDocument(summary.path, autosaveDir);
      } catch (error: unknown) {
        if (isMissingFileError(error)) {
          return null;
        }
        throw error;
      }
    }

    return loadDraftDocument(summary, autosaveDir);
  };

  const saveDocumentHandler = async (
    event: Electron.IpcMainInvokeEvent,
    raw: unknown,
  ): Promise<DocumentOperationResult> => {
    const input = DocumentSaveRequestSchema.parse(raw);
    const ownerWindow = BrowserWindow.fromWebContents(event.sender) ?? undefined;
    const document = await saveDocument(input, autosaveDir, ownerWindow);
    const launcher = await persistOpenedDocument(repo, document);
    return { document, launcher };
  };

  ipcMain.handle(IPC_CHANNELS.documentsOpenMarkdownFile, openMarkdownFileHandler);
  ipcMain.handle(IPC_CHANNELS.documentsLoad, loadDocumentHandler);
  ipcMain.handle(IPC_CHANNELS.documentsSave, saveDocumentHandler);

  return () => {
    ipcMain.removeHandler(IPC_CHANNELS.documentsOpenMarkdownFile);
    ipcMain.removeHandler(IPC_CHANNELS.documentsLoad);
    ipcMain.removeHandler(IPC_CHANNELS.documentsSave);
  };
}

async function loadFileDocument(filePath: string, autosaveDir: string): Promise<DocumentSession> {
  const diskContent = await fs.readFile(filePath, 'utf-8');
  const autosave = await readAutosaveForDocument(filePath, autosaveDir);
  const content = autosave?.content ?? diskContent;
  const title = basename(filePath).replace(/\.[^.]+$/, '') || basename(filePath);

  return {
    id: filePath,
    kind: 'file',
    title,
    path: filePath,
    content,
    snippet: extractSnippet(content),
    lastOpenedAt: new Date().toISOString(),
    lastSavedAt: autosave?.lastSavedAt ?? new Date().toISOString(),
  };
}

async function loadDraftDocument(
  summary: DocumentSummary,
  autosaveDir: string,
): Promise<DocumentSession | null> {
  const autosave = await readAutosaveForDocument(summary.id, autosaveDir);
  if (!autosave) {
    return null;
  }

  return {
    id: summary.id,
    kind: 'draft',
    title: autosave.title || summary.title,
    content: autosave.content,
    snippet: extractSnippet(autosave.content),
    lastOpenedAt: new Date().toISOString(),
    lastSavedAt: autosave.lastSavedAt,
  };
}

async function saveDocument(
  input: DocumentSaveRequest,
  autosaveDir: string,
  ownerWindow?: BrowserWindow,
): Promise<DocumentSession> {
  if (input.mode === 'autosave') {
    let lastSavedAt: string | null = null;

    if (input.kind === 'file' && input.path) {
      await fs.mkdir(dirname(input.path), { recursive: true });
      await fs.writeFile(input.path, input.content, 'utf-8');
      lastSavedAt = new Date().toISOString();
    }

    const document = createSessionFromInput(input, input.path, lastSavedAt);
    await writeAutosaveSnapshot(document, autosaveDir);
    return document;
  }

  const savePath =
    input.mode === 'saveAs'
      ? await requestSavePath(ownerWindow, input.title, input.path)
      : input.path ?? (await requestSavePath(ownerWindow, input.title, input.path));

  if (!savePath) {
    throw new Error('Save operation canceled.');
  }

  await fs.mkdir(dirname(savePath), { recursive: true });
  await fs.writeFile(savePath, input.content, 'utf-8');

  const title = basename(savePath).replace(/\.[^.]+$/, '') || basename(savePath);
  const lastSavedAt = new Date().toISOString();
  const document: DocumentSession = {
    id: savePath,
    kind: 'file',
    title,
    path: savePath,
    content: input.content,
    snippet: extractSnippet(input.content),
    lastOpenedAt: lastSavedAt,
    lastSavedAt,
  };

  await writeAutosaveSnapshot(document, autosaveDir);
  return document;
}

function createSessionFromInput(
  input: DocumentSaveRequest,
  filePath: string | undefined,
  lastSavedAt: string | null,
): DocumentSession {
  return {
    id: input.kind === 'file' && filePath ? filePath : input.id || `draft:${randomUUID()}`,
    kind: input.kind,
    title: input.title,
    path: filePath,
    content: input.content,
    snippet: extractSnippet(input.content),
    lastOpenedAt: new Date().toISOString(),
    lastSavedAt,
  };
}

async function requestSavePath(
  ownerWindow: BrowserWindow | undefined,
  title: string,
  existingPath?: string,
): Promise<string | null> {
  const dialogOptions: SaveDialogOptions = {
    defaultPath: existingPath ?? `${sanitizeFileName(title)}.md`,
    filters: [{ name: 'Markdown', extensions: ['md'] }],
  };

  const result = ownerWindow
    ? await dialog.showSaveDialog(ownerWindow, dialogOptions)
    : await dialog.showSaveDialog(dialogOptions);

  return result.canceled ? null : (result.filePath ?? null);
}

async function persistOpenedDocument(
  repo: SettingsRepository,
  document: DocumentSession,
): Promise<LauncherState> {
  const settings = await repo.read();
  const summary: DocumentSummary = {
    id: document.id,
    kind: document.kind,
    title: document.title,
    path: document.path,
    snippet: document.snippet,
    lastOpenedAt: document.lastOpenedAt,
  };
  const launcher = mergeLauncherState(settings, summary);
  await repo.update({ launcher });
  return launcher;
}

function mergeLauncherState(settings: Settings, summary: DocumentSummary): Settings['launcher'] {
  const deduped = settings.launcher.recentDocuments.filter((document) => document.id !== summary.id);
  const recentDocuments = [summary, ...deduped].slice(0, MAX_RECENTS);

  return {
    recentDocuments,
    quickResumeId: summary.id,
  };
}

async function writeAutosaveSnapshot(document: DocumentSession, autosaveDir: string): Promise<void> {
  const filePath = autosaveFilePath(document.id, autosaveDir);
  await fs.mkdir(autosaveDir, { recursive: true });
  await fs.writeFile(
    filePath,
    JSON.stringify(
      {
        id: document.id,
        title: document.title,
        content: document.content,
        lastSavedAt: document.lastSavedAt,
      },
      null,
      2,
    ),
    'utf-8',
  );
}

async function readAutosaveForDocument(
  documentId: string,
  autosaveDir: string,
): Promise<{ title: string; content: string; lastSavedAt: string | null } | null> {
  try {
    const raw = await fs.readFile(autosaveFilePath(documentId, autosaveDir), 'utf-8');
    const parsed = JSON.parse(raw) as {
      title?: string;
      content?: string;
      lastSavedAt?: string | null;
    };

    return {
      title: parsed.title ?? '',
      content: parsed.content ?? '',
      lastSavedAt: parsed.lastSavedAt ?? null,
    };
  } catch (error: unknown) {
    if (isNodeError(error) && error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

function autosaveFilePath(documentId: string, autosaveDir: string): string {
  const hash = createHash('sha256').update(documentId).digest('hex');
  return join(autosaveDir, `${hash}.json`);
}

function sanitizeFileName(value: string): string {
  return value
    .trim()
    .replace(/[<>:"/\\|?*]+/g, '-')
    .replace(/\s+/g, '-')
    .toLowerCase();
}

function extractSnippet(content: string): string {
  const normalized = content
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join(' ');

  if (!normalized) {
    return '';
  }

  if (normalized.length <= MAX_SNIPPET_LENGTH) {
    return normalized;
  }

  return `${normalized.slice(0, MAX_SNIPPET_LENGTH - 1).trimEnd()}…`;
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error;
}

function isMissingFileError(error: unknown): error is NodeJS.ErrnoException {
  return isNodeError(error) && (error.code === 'ENOENT' || error.code === 'ENOTDIR');
}
