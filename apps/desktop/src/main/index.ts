import { app, BrowserWindow, crashReporter } from 'electron';
import { promises as fs } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, extname, join, resolve } from 'node:path';
import {
  IPC_CHANNELS,
  LatexPdfExportService,
  registerDocumentsChannel,
  registerExportChannel,
  WeasyPdfExportService,
  SettingsRepository,
  registerSettingsChannel,
  registerSystemChannel,
  SessionLogger,
  serializeErrorForLog,
} from '@doku/infrastructure';
import { PRODUCT_NAME } from '@doku/application';
import { resolveExportRuntimePaths } from './exportRuntime.js';
import { createMainWindow } from './window.js';
import { CrashStateManager } from './crashState.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ORIGINAL_USER_DATA_DIR = app.getPath('userData');
const DOCUMENTS_DATA_DIR = resolveDocumentsDataDir(ORIGINAL_USER_DATA_DIR);
const logger = new SessionLogger({ logsDir: join(DOCUMENTS_DATA_DIR, 'logs') });
const crashState = new CrashStateManager(DOCUMENTS_DATA_DIR);
const LOG_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const pendingOpenFilePaths = new Set<string>();
let mainWindow: BrowserWindow | null = null;
let healthyBootstrapTimer: NodeJS.Timeout | null = null;

if (process.platform === 'linux') {
  app.disableHardwareAcceleration();
  app.commandLine.appendSwitch('disable-gpu');
  app.commandLine.appendSwitch('disable-gpu-compositing');
  app.commandLine.appendSwitch('disable-software-rasterizer');
  app.commandLine.appendSwitch('disable-features', 'UseChromeOSDirectVideoDecoder');
}

app.setName(PRODUCT_NAME);

crashReporter.start({
  submitURL: '',
  uploadToServer: false,
  compress: true,
  productName: PRODUCT_NAME,
});

registerProcessDiagnostics();
registerFileOpenHandlers();

async function bootstrap(): Promise<void> {
  logger.info('app:bootstrap-started', {
    platform: process.platform,
    version: app.getVersion(),
    appDataDir: DOCUMENTS_DATA_DIR,
    electronUserDataDir: ORIGINAL_USER_DATA_DIR,
  });
  logger.info('app:crash-dump-dir', { path: app.getPath('crashDumps') });
  void logger.pruneOlderThan(LOG_RETENTION_MS);

  await crashState.markBootstrapStarted();
  const safeMode = crashState.isInSafeMode();
  logger.info('app:bootstrap-safe-mode', { safeMode, ...crashState.snapshot });

  await app.whenReady();

  const electronUserDataDir = app.getPath('userData');
  await migrateLegacyUserData(ORIGINAL_USER_DATA_DIR, DOCUMENTS_DATA_DIR);
  const repo = new SettingsRepository({
    userDataDir: DOCUMENTS_DATA_DIR,
    legacyFilePaths: [join(ORIGINAL_USER_DATA_DIR, 'settings.json')],
    logger,
  });
  // Ensure defaults exist on disk (idempotent).
  await repo.read();

  const disposeSettings = registerSettingsChannel(repo, logger);
  const disposeSystem = registerSystemChannel({
    appDataDir: DOCUMENTS_DATA_DIR,
    electronUserDataDir,
    cleanupDirs: [DOCUMENTS_DATA_DIR, electronUserDataDir],
    logger,
  });
  const disposeDocuments = registerDocumentsChannel(repo, {
    userDataDir: DOCUMENTS_DATA_DIR,
    logger,
  });
  const exportRuntime = resolveExportRuntimePaths(__dirname);
  const disposeExport = registerExportChannel({
    lualatex: new LatexPdfExportService({
      pandocPath: exportRuntime.pandocPath,
      lualatexPath: exportRuntime.lualatexPath,
      latexRuntimeRoot: exportRuntime.latexRuntimeRoot,
    }),
    weasy: new WeasyPdfExportService({
      printStylesheetPath: exportRuntime.printStylesheetPath,
      weasyScriptPath: exportRuntime.weasyScriptPath,
      pythonExecutablePath: exportRuntime.weasyPythonPath,
    }),
  }, logger);

  const preloadPath = join(__dirname, '../preload/index.js');
  const rendererDevUrl = process.env.ELECTRON_RENDERER_URL;
  const rendererFile = join(__dirname, '../renderer/index.html');

  mainWindow = createMainWindow({ preloadPath, rendererDevUrl, rendererFile, safeMode });
  attachWindowDiagnostics(mainWindow);
  dispatchPendingOpenFiles(mainWindow);
  scheduleHealthyBootstrap();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createMainWindow({ preloadPath, rendererDevUrl, rendererFile, safeMode });
      attachWindowDiagnostics(mainWindow);
      dispatchPendingOpenFiles(mainWindow);
    }
  });

  app.on('window-all-closed', () => {
    logger.info('app:window-all-closed');
    if (healthyBootstrapTimer) {
      clearTimeout(healthyBootstrapTimer);
      healthyBootstrapTimer = null;
    }
    disposeSettings();
    disposeSystem();
    disposeDocuments();
    disposeExport();
    if (process.platform !== 'darwin') app.quit();
  });
}

function scheduleHealthyBootstrap(): void {
  if (healthyBootstrapTimer) {
    clearTimeout(healthyBootstrapTimer);
  }
  healthyBootstrapTimer = setTimeout(() => {
    healthyBootstrapTimer = null;
    void crashState
      .markBootstrapHealthy()
      .then(() => logger.info('app:bootstrap-healthy', { ...crashState.snapshot }))
      .catch((err) => logger.warn('app:bootstrap-healthy-failed', { error: serializeErrorForLog(err) }));
  }, crashState.healthyBootstrapDelayMs);
}

function registerFileOpenHandlers(): void {
  const initialOpenFilePath = findMarkdownFilePath(process.argv);
  if (initialOpenFilePath) {
    pendingOpenFilePaths.add(initialOpenFilePath);
  }

  const hasSingleInstanceLock = app.requestSingleInstanceLock();
  if (!hasSingleInstanceLock) {
    logger.info('app:secondary-instance-exit');
    app.quit();
    return;
  }

  app.on('second-instance', (_event, argv) => {
    const filePath = findMarkdownFilePath(argv);
    logger.info('app:second-instance', { filePath });
    if (filePath) {
      pendingOpenFilePaths.add(filePath);
      dispatchPendingOpenFiles(resolveMainWindow());
    }
  });

  app.on('open-file', (event, filePath) => {
    event.preventDefault();
    const markdownPath = findMarkdownFilePath([filePath]);
    logger.info('app:open-file', { filePath: markdownPath });
    if (markdownPath) {
      pendingOpenFilePaths.add(markdownPath);
      dispatchPendingOpenFiles(resolveMainWindow());
    }
  });
}

function resolveMainWindow(): BrowserWindow | null {
  if (mainWindow && !mainWindow.isDestroyed()) {
    return mainWindow;
  }

  const [firstWindow] = BrowserWindow.getAllWindows();
  mainWindow = firstWindow ?? null;
  return mainWindow;
}

function dispatchPendingOpenFiles(window: BrowserWindow | null): void {
  if (!window || pendingOpenFilePaths.size === 0) {
    return;
  }

  if (window.isMinimized()) {
    window.restore();
  }
  window.focus();

  const sendOpenRequests = () => {
    for (const filePath of pendingOpenFilePaths) {
      window.webContents.send(IPC_CHANNELS.documentsOpenFileRequest, { filePath });
      logger.info('app:file-open-request-dispatched', { filePath });
    }
    pendingOpenFilePaths.clear();
  };

  if (window.webContents.isLoadingMainFrame()) {
    window.webContents.once('did-finish-load', sendOpenRequests);
    return;
  }

  sendOpenRequests();
}

function findMarkdownFilePath(argv: readonly string[]): string | null {
  for (const arg of argv) {
    const normalized = normalizeFileArgument(arg);
    if (!normalized) {
      continue;
    }

    const extension = extname(normalized).toLowerCase();
    if (extension === '.md' || extension === '.markdown' || extension === '.mdown') {
      return normalized;
    }
  }

  return null;
}

function normalizeFileArgument(arg: string): string | null {
  if (!arg || arg.startsWith('-')) {
    return null;
  }

  try {
    if (arg.startsWith('file://')) {
      return fileURLToPath(arg);
    }
  } catch {
    return null;
  }

  return resolve(arg);
}

function resolveDocumentsDataDir(fallbackDir: string): string {
  if (process.env.DOKU_DATA_DIR) {
    return resolve(process.env.DOKU_DATA_DIR);
  }

  try {
    return join(app.getPath('documents'), PRODUCT_NAME);
  } catch {
    return fallbackDir;
  }
}

async function migrateLegacyUserData(sourceDir: string, targetDir: string): Promise<void> {
  if (sourceDir === targetDir) {
    return;
  }

  try {
    await fs.access(sourceDir);
  } catch {
    return;
  }

  await fs.mkdir(targetDir, { recursive: true });
  const entries = ['settings.json', 'autosave-documents'];

  for (const entry of entries) {
    try {
      await fs.cp(join(sourceDir, entry), join(targetDir, entry), {
        recursive: true,
        errorOnExist: false,
        force: false,
      });
      logger.info('app:legacy-user-data-migrated', { entry, sourceDir, targetDir });
    } catch (error: unknown) {
      if (!isNodeError(error) || error.code !== 'ENOENT') {
        logger.warn('app:legacy-user-data-migration-failed', {
          entry,
          error: serializeErrorForLog(error),
        });
      }
    }
  }
}

function attachWindowDiagnostics(window: BrowserWindow): void {
  logger.info('window:created');
  window.webContents.on('did-finish-load', () => logger.info('window:did-finish-load'));
  window.webContents.on('render-process-gone', (_event, details) => {
    logger.error('window:render-process-gone', { ...details });
  });
  window.webContents.on('unresponsive', () => logger.warn('window:unresponsive'));
  window.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    logger.debug('renderer:console-message', { level, message, line, sourceId });
  });
}

function registerProcessDiagnostics(): void {
  process.on('uncaughtException', (error) => {
    logger.error('process:uncaught-exception', { error: serializeErrorForLog(error) });
  });
  process.on('unhandledRejection', (reason) => {
    logger.error('process:unhandled-rejection', { reason: serializeErrorForLog(reason) });
  });
  app.on('child-process-gone', (_event, details) => {
    logger.error('app:child-process-gone', { ...details });
  });
  app.on('before-quit', () => logger.info('app:before-quit'));
}

function isNodeError(err: unknown): err is NodeJS.ErrnoException {
  return err instanceof Error && 'code' in err;
}

if (app.hasSingleInstanceLock()) {
  bootstrap().catch((err) => {
    logger.error('app:fatal-bootstrap-error', { error: serializeErrorForLog(err) });
    console.error(`[${PRODUCT_NAME}] fatal bootstrap error`, err);
    app.exit(1);
  });
}
