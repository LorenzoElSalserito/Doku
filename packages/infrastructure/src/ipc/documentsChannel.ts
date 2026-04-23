import { createHash, randomUUID } from 'node:crypto';
import { watch as watchDirectory, type FSWatcher } from 'node:fs';
import { promises as fs } from 'node:fs';
import { basename, dirname, extname, isAbsolute, join, parse, relative, resolve } from 'node:path';
import { BrowserWindow, dialog, ipcMain, type OpenDialogOptions, type SaveDialogOptions } from 'electron';
import {
  type DocumentAssetImportRequest,
  DocumentAssetImportRequestSchema,
  DocumentSaveRequestSchema,
  DocumentSummarySchema,
  type DocumentAssetImportResult,
  type DocumentOperationResult,
  type DocumentSaveRequest,
  type DocumentSession,
  type DocumentSummary,
  type LauncherState,
  type Settings,
  type WorkspaceCreateEntryResult,
  WorkspaceCreateEntryRequestSchema,
  type WorkspaceNode,
  WorkspaceListingRequestSchema,
  WorkspaceWatchRequestSchema,
} from '@doku/schemas';
import type { SettingsRepository } from '../settings/settingsRepository.js';
import { IPC_CHANNELS } from './channels.js';
import { classifyWorkspaceFile, compareWorkspaceEntries } from './workspaceTree.js';

const MARKDOWN_EXTENSIONS = ['md', 'markdown', 'mdown'];
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp']);
const MAX_SNIPPET_LENGTH = 220;
const MAX_RECENTS = 6;
const IMAGE_IMPORT_ERRORS = {
  unsupportedFormat: 'documents:image-import:unsupported-format',
  documentMissing: 'documents:image-import:document-missing',
  sourceMissing: 'documents:image-import:source-missing',
  allocationFailed: 'documents:image-import:allocation-failed',
} as const;
const WORKSPACE_ERRORS = {
  invalidName: 'documents:workspace-entry:invalid-name',
  alreadyExists: 'documents:workspace-entry:already-exists',
  creationFailed: 'documents:workspace-entry:creation-failed',
} as const;
const WORKSPACE_TREE_MAX_DEPTH = 4;

interface DocumentsChannelOptions {
  userDataDir: string;
}

interface WorkspaceWatcherRegistration {
  watchId: string;
  rootDir: string;
  watchers: FSWatcher[];
  debounceTimer: NodeJS.Timeout | null;
  rebuilding: boolean;
  closed: boolean;
  webContents: Electron.WebContents;
}

export function registerDocumentsChannel(
  repo: SettingsRepository,
  options: DocumentsChannelOptions,
): () => void {
  const autosaveDir = join(options.userDataDir, 'autosave-documents');
  const workspaceWatchers = new Map<string, WorkspaceWatcherRegistration>();

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

  const openDocumentAtPathHandler = async (
    _event: Electron.IpcMainInvokeEvent,
    raw: unknown,
  ): Promise<DocumentOperationResult | null> => {
    const filePath = typeof raw === 'string' ? raw : '';
    if (!filePath) {
      return null;
    }

    const document = await loadFileDocument(filePath, autosaveDir);
    const launcher = await persistOpenedDocument(repo, document);
    return { document, launcher };
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

  const importAssetHandler = async (
    _event: Electron.IpcMainInvokeEvent,
    raw: unknown,
  ): Promise<DocumentAssetImportResult> => {
    const input = DocumentAssetImportRequestSchema.parse(raw);
    return importAsset(input);
  };

  const listWorkspaceTreeHandler = async (
    _event: Electron.IpcMainInvokeEvent,
    raw: unknown,
  ): Promise<WorkspaceNode[]> => {
    const input = WorkspaceListingRequestSchema.parse({ documentPath: raw });
    return listWorkspaceTree(input.documentPath);
  };

  const createWorkspaceEntryHandler = async (
    _event: Electron.IpcMainInvokeEvent,
    raw: unknown,
  ): Promise<WorkspaceCreateEntryResult> => {
    const input = WorkspaceCreateEntryRequestSchema.parse(raw);
    return createWorkspaceEntry(input.documentPath, input.name, input.kind);
  };

  const watchWorkspaceTreeHandler = async (
    event: Electron.IpcMainInvokeEvent,
    raw: unknown,
  ): Promise<void> => {
    const input = WorkspaceWatchRequestSchema.parse(raw);
    closeWorkspaceWatcher(workspaceWatchers.get(input.watchId));

    await ensureExistingFile(input.documentPath, IMAGE_IMPORT_ERRORS.documentMissing);
    const rootDir = dirname(input.documentPath);
    workspaceWatchers.set(
      input.watchId,
      await createWorkspaceWatcher(input.watchId, rootDir, event.sender),
    );
  };

  const unwatchWorkspaceTreeHandler = (
    _event: Electron.IpcMainInvokeEvent,
    raw: unknown,
  ): void => {
    const watchId = typeof raw === 'string' ? raw : '';
    closeWorkspaceWatcher(workspaceWatchers.get(watchId));
    workspaceWatchers.delete(watchId);
  };

  ipcMain.handle(IPC_CHANNELS.documentsOpenMarkdownFile, openMarkdownFileHandler);
  ipcMain.handle(IPC_CHANNELS.documentsOpenDocumentAtPath, openDocumentAtPathHandler);
  ipcMain.handle(IPC_CHANNELS.documentsLoad, loadDocumentHandler);
  ipcMain.handle(IPC_CHANNELS.documentsSave, saveDocumentHandler);
  ipcMain.handle(IPC_CHANNELS.documentsImportAsset, importAssetHandler);
  ipcMain.handle(IPC_CHANNELS.documentsListWorkspaceTree, listWorkspaceTreeHandler);
  ipcMain.handle(IPC_CHANNELS.documentsCreateWorkspaceEntry, createWorkspaceEntryHandler);
  ipcMain.handle(IPC_CHANNELS.documentsWatchWorkspaceTree, watchWorkspaceTreeHandler);
  ipcMain.handle(IPC_CHANNELS.documentsUnwatchWorkspaceTree, unwatchWorkspaceTreeHandler);

  return () => {
    for (const watcher of workspaceWatchers.values()) {
      closeWorkspaceWatcher(watcher);
    }
    workspaceWatchers.clear();
    ipcMain.removeHandler(IPC_CHANNELS.documentsOpenMarkdownFile);
    ipcMain.removeHandler(IPC_CHANNELS.documentsOpenDocumentAtPath);
    ipcMain.removeHandler(IPC_CHANNELS.documentsLoad);
    ipcMain.removeHandler(IPC_CHANNELS.documentsSave);
    ipcMain.removeHandler(IPC_CHANNELS.documentsImportAsset);
    ipcMain.removeHandler(IPC_CHANNELS.documentsListWorkspaceTree);
    ipcMain.removeHandler(IPC_CHANNELS.documentsCreateWorkspaceEntry);
    ipcMain.removeHandler(IPC_CHANNELS.documentsWatchWorkspaceTree);
    ipcMain.removeHandler(IPC_CHANNELS.documentsUnwatchWorkspaceTree);
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

async function importAsset(input: DocumentAssetImportRequest): Promise<DocumentAssetImportResult> {
  const extension = extname(input.sourcePath).toLowerCase();
  if (!IMAGE_EXTENSIONS.has(extension)) {
    throw new Error(IMAGE_IMPORT_ERRORS.unsupportedFormat);
  }

  await ensureExistingFile(input.documentPath, IMAGE_IMPORT_ERRORS.documentMissing);
  await ensureExistingFile(input.sourcePath, IMAGE_IMPORT_ERRORS.sourceMissing);

  const documentDir = dirname(input.documentPath);
  const sourceFileName = basename(input.sourcePath);
  const targetDir =
    input.strategy === 'project-assets' ? join(documentDir, 'assets') : documentDir;

  await fs.mkdir(targetDir, { recursive: true });
  const targetPath = await createUniqueTargetPath(targetDir, sourceFileName);

  if (targetPath !== input.sourcePath) {
    await fs.copyFile(input.sourcePath, targetPath);
  }

  return {
    fileName: basename(targetPath),
    assetPath: targetPath,
    relativePath: normalizeRelativePath(relative(documentDir, targetPath)),
  };
}

async function listWorkspaceTree(documentPath: string): Promise<WorkspaceNode[]> {
  await ensureExistingFile(documentPath, IMAGE_IMPORT_ERRORS.documentMissing);
  const rootDir = dirname(documentPath);
  return readWorkspaceDirectory(rootDir, 0);
}

async function createWorkspaceEntry(
  documentPath: string,
  rawName: string,
  kind: 'markdown' | 'directory',
): Promise<WorkspaceCreateEntryResult> {
  await ensureExistingFile(documentPath, IMAGE_IMPORT_ERRORS.documentMissing);
  const rootDir = dirname(documentPath);
  const targetPath = resolveWorkspaceTarget(rootDir, rawName, kind);

  try {
    await fs.access(targetPath);
    throw new Error(WORKSPACE_ERRORS.alreadyExists);
  } catch (error: unknown) {
    if (!(isNodeError(error) && error.code === 'ENOENT')) {
      throw error;
    }
  }

  try {
    if (kind === 'directory') {
      await fs.mkdir(targetPath, { recursive: false });
      return { path: targetPath, kind };
    }

    await fs.mkdir(dirname(targetPath), { recursive: true });
    await fs.writeFile(targetPath, '', { encoding: 'utf-8', flag: 'wx' });
    return { path: targetPath, kind };
  } catch (error: unknown) {
    if (isNodeError(error) && error.code === 'EEXIST') {
      throw new Error(WORKSPACE_ERRORS.alreadyExists);
    }
    throw new Error(WORKSPACE_ERRORS.creationFailed);
  }
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

  prepareWindowForModalDialog(ownerWindow);

  const result = ownerWindow
    ? await dialog.showSaveDialog(ownerWindow, dialogOptions)
    : await dialog.showSaveDialog(dialogOptions);

  return result.canceled ? null : (result.filePath ?? null);
}

function prepareWindowForModalDialog(ownerWindow: BrowserWindow | undefined): void {
  if (!ownerWindow || ownerWindow.isDestroyed()) {
    return;
  }

  if (ownerWindow.isMinimized()) {
    ownerWindow.restore();
  }

  ownerWindow.show();
  ownerWindow.focus();
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

async function ensureExistingFile(filePath: string, fallbackMessage: string): Promise<void> {
  try {
    await fs.access(filePath);
  } catch (error: unknown) {
    if (isMissingFileError(error) || (isNodeError(error) && error.code === 'ENOENT')) {
      throw new Error(fallbackMessage);
    }
    throw error;
  }
}

async function createUniqueTargetPath(targetDir: string, fileName: string): Promise<string> {
  const parsed = parse(fileName);
  const baseName = sanitizeImportedStem(parsed.name || 'image');
  const extension = parsed.ext || '.png';

  let attempt = 0;
  while (attempt < 500) {
    const suffix = attempt === 0 ? '' : `-${attempt + 1}`;
    const candidate = join(targetDir, `${baseName}${suffix}${extension}`);
    try {
      await fs.access(candidate);
      attempt += 1;
    } catch (error: unknown) {
      if (isNodeError(error) && error.code === 'ENOENT') {
        return candidate;
      }
      throw error;
    }
  }

  throw new Error(IMAGE_IMPORT_ERRORS.allocationFailed);
}

function sanitizeImportedStem(value: string): string {
  return (
    value
      .trim()
      .replace(/[<>:"/\\|?*]+/g, '-')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'image'
  );
}

function normalizeRelativePath(value: string): string {
  return value.split('\\').join('/');
}

function resolveWorkspaceTarget(
  rootDir: string,
  rawName: string,
  kind: 'markdown' | 'directory',
): string {
  const normalizedName = rawName.trim().replace(/\\/g, '/');
  if (
    !normalizedName ||
    isAbsolute(normalizedName) ||
    normalizedName.split('/').some((part) => part === '..' || part === '')
  ) {
    throw new Error(WORKSPACE_ERRORS.invalidName);
  }

  const name = kind === 'markdown' && !/\.(md|markdown|mdown)$/i.test(normalizedName)
    ? `${normalizedName}.md`
    : normalizedName;
  const targetPath = resolve(rootDir, name);
  const relativeTarget = relative(rootDir, targetPath);

  if (relativeTarget.startsWith('..') || isAbsolute(relativeTarget) || relativeTarget === '') {
    throw new Error(WORKSPACE_ERRORS.invalidName);
  }

  return targetPath;
}

async function readWorkspaceDirectory(directoryPath: string, depth: number): Promise<WorkspaceNode[]> {
  if (depth > WORKSPACE_TREE_MAX_DEPTH) {
    return [];
  }

  const entries = await fs.readdir(directoryPath, { withFileTypes: true });
  const visibleEntries = entries
    .filter((entry) => !entry.name.startsWith('.'))
    .sort(compareWorkspaceEntries);

  const nodes = await Promise.all(
    visibleEntries.map(async (entry) => {
      const entryPath = join(directoryPath, entry.name);
      if (entry.isDirectory()) {
        return {
          name: entry.name,
          path: entryPath,
          kind: 'directory' as const,
          children: await readWorkspaceDirectory(entryPath, depth + 1),
        };
      }

      return {
        name: entry.name,
        path: entryPath,
        kind: classifyWorkspaceFile(entry.name),
      };
    }),
  );

  return nodes;
}

async function createWorkspaceWatcher(
  watchId: string,
  rootDir: string,
  webContents: Electron.WebContents,
): Promise<WorkspaceWatcherRegistration> {
  const registration: WorkspaceWatcherRegistration = {
    watchId,
    rootDir,
    watchers: [],
    debounceTimer: null,
    rebuilding: false,
    closed: false,
    webContents,
  };

  await rebuildWorkspaceWatcher(registration);
  return registration;
}

async function rebuildWorkspaceWatcher(registration: WorkspaceWatcherRegistration): Promise<void> {
  if (registration.closed || registration.rebuilding) {
    return;
  }

  registration.rebuilding = true;

  for (const watcher of registration.watchers) {
    watcher.close();
  }
  registration.watchers = [];

  try {
    const directories = await readWorkspaceDirectories(registration.rootDir, 0);
    if (registration.closed) {
      return;
    }

    registration.watchers = directories.map((directoryPath) => {
      const watcher = watchDirectory(directoryPath, { persistent: false }, () =>
        scheduleWorkspaceTreeChanged(registration),
      );
      watcher.on('error', () => scheduleWorkspaceTreeChanged(registration));
      return watcher;
    });
  } catch {
    if (!registration.closed && !registration.webContents.isDestroyed()) {
      registration.webContents.send(IPC_CHANNELS.documentsWorkspaceTreeChanged, {
        watchId: registration.watchId,
      });
    }
  } finally {
    registration.rebuilding = false;
  }
}

function scheduleWorkspaceTreeChanged(registration: WorkspaceWatcherRegistration): void {
  if (registration.closed) {
    return;
  }

  if (registration.debounceTimer) {
    clearTimeout(registration.debounceTimer);
  }

  registration.debounceTimer = setTimeout(() => {
    if (registration.closed || registration.webContents.isDestroyed()) {
      return;
    }

    registration.webContents.send(IPC_CHANNELS.documentsWorkspaceTreeChanged, {
      watchId: registration.watchId,
    });
    void rebuildWorkspaceWatcher(registration);
  }, 140);
}

function closeWorkspaceWatcher(registration: WorkspaceWatcherRegistration | undefined): void {
  if (!registration) {
    return;
  }

  registration.closed = true;
  if (registration.debounceTimer) {
    clearTimeout(registration.debounceTimer);
  }
  for (const watcher of registration.watchers) {
    watcher.close();
  }
  registration.watchers = [];
}

async function readWorkspaceDirectories(directoryPath: string, depth: number): Promise<string[]> {
  if (depth > WORKSPACE_TREE_MAX_DEPTH) {
    return [];
  }

  const directories = [directoryPath];
  let entries: Array<{ name: string; isDirectory: () => boolean }>;
  try {
    entries = await fs.readdir(directoryPath, { withFileTypes: true });
  } catch {
    return directories;
  }

  for (const entry of entries.filter((item) => !item.name.startsWith('.') && item.isDirectory())) {
    directories.push(...(await readWorkspaceDirectories(join(directoryPath, entry.name), depth + 1)));
  }

  return directories;
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
