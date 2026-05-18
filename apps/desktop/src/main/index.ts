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
import { createMainWindow, showMainWindow } from './window.js';
import { CrashStateManager } from './crashState.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ORIGINAL_USER_DATA_DIR = app.getPath('userData');
const DOCUMENTS_DATA_DIR = resolveDocumentsDataDir(ORIGINAL_USER_DATA_DIR);
const bootstrapStartedAtMs = Date.now();
const logger = new SessionLogger({
  logsDir: join(DOCUMENTS_DATA_DIR, 'logs'),
  processName: 'main',
  appVersion: app.getVersion(),
});
const crashState = new CrashStateManager(DOCUMENTS_DATA_DIR);
const LOG_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const pendingOpenFilePaths = new Set<string>();
let mainWindow: BrowserWindow | null = null;
let healthyBootstrapTimer: NodeJS.Timeout | null = null;
let mainWindowShowTimer: NodeJS.Timeout | null = null;
let bootstrapMarkedHealthy = false;
let latestRendererEvent: { event: string; context: Record<string, unknown>; at: string } | null =
  null;

if (process.platform === 'linux') {
  app.disableHardwareAcceleration();
  app.commandLine.appendSwitch('disable-gpu');
  app.commandLine.appendSwitch('disable-gpu-compositing');
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
  logStartup('process-created', {
    platform: process.platform,
    version: app.getVersion(),
    appDataDir: DOCUMENTS_DATA_DIR,
    electronUserDataDir: ORIGINAL_USER_DATA_DIR,
    argv: process.argv,
    isPackaged: app.isPackaged,
  });
  logStartup('crash-reporter-started', { crashDumpDir: app.getPath('crashDumps') });
  void logCrashpadPendingDumps();
  void logger.pruneOlderThan(LOG_RETENTION_MS);

  logStartup('crash-state-mark-starting');
  await crashState.markBootstrapStarted();
  const safeMode = crashState.isInSafeMode();
  logStartup('crash-state-loaded', { safeMode, ...crashState.snapshot });

  logStartup('electron-when-ready-waiting');
  await app.whenReady();
  logStartup('electron-ready', {
    electronUserDataDir: app.getPath('userData'),
    locale: app.getLocale(),
  });

  const electronUserDataDir = app.getPath('userData');
  logStartup('legacy-user-data-migration-started', {
    sourceDir: ORIGINAL_USER_DATA_DIR,
    targetDir: DOCUMENTS_DATA_DIR,
  });
  await migrateLegacyUserData(ORIGINAL_USER_DATA_DIR, DOCUMENTS_DATA_DIR);
  logStartup('legacy-user-data-migration-finished');
  const repo = new SettingsRepository({
    userDataDir: DOCUMENTS_DATA_DIR,
    legacyFilePaths: [join(ORIGINAL_USER_DATA_DIR, 'settings.json')],
    logger,
  });
  // Ensure defaults exist on disk (idempotent).
  logStartup('settings-read-started');
  await repo.read();
  logStartup('settings-read-finished');

  logStartup('ipc-registration-started');
  const disposeSettings = registerSettingsChannel(repo, logger);
  const disposeSystem = registerSystemChannel({
    appDataDir: DOCUMENTS_DATA_DIR,
    electronUserDataDir,
    cleanupDirs: [DOCUMENTS_DATA_DIR, electronUserDataDir],
    logger,
    onRendererEvent: (event, context) => {
      latestRendererEvent = { event, context, at: new Date().toISOString() };
      if (event === 'first-frame-ready') {
        logger.info('window:first-frame-ready-ignored-until-bootstrap');
      }
      if (event === 'splash-ready') {
        revealMainWindow('renderer-splash-ready');
      }
      if (event === 'app-ready') {
        revealMainWindow('renderer-app-ready');
        markBootstrapHealthy('renderer-app-ready');
      }
    },
  });
  const disposeDocuments = registerDocumentsChannel(repo, {
    userDataDir: DOCUMENTS_DATA_DIR,
    logger,
  });
  logStartup('ipc-registration-finished');
  logStartup('export-runtime-resolve-started');
  const exportRuntime = resolveExportRuntimePaths(__dirname);
  logStartup('export-runtime-resolved', {
    hasPandoc: Boolean(exportRuntime.pandocPath),
    hasLuaLatex: Boolean(exportRuntime.lualatexPath),
    hasWeasyPython: Boolean(exportRuntime.weasyPythonPath),
  });
  const disposeExport = registerExportChannel(
    {
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
    },
    logger,
  );

  const preloadPath = join(__dirname, '../preload/index.js');
  const rendererDevUrl = process.env.ELECTRON_RENDERER_URL;
  const rendererFile = join(__dirname, '../renderer/index.html');

  logStartup('main-window-create-started', {
    preloadPath,
    rendererMode: rendererDevUrl ? 'dev-url' : 'file',
  });
  mainWindow = createMainWindow({ preloadPath, rendererDevUrl, rendererFile, safeMode });
  attachWindowDiagnostics(mainWindow);
  armMainWindowRevealFallback(mainWindow);
  dispatchPendingOpenFiles(mainWindow);
  scheduleHealthyBootstrap();
  logStartup('main-window-create-finished', { safeMode });

  app.on('activate', () => {
    logger.info('app:activate', { windowCount: BrowserWindow.getAllWindows().length });
    if (BrowserWindow.getAllWindows().length === 0) {
      logStartup('main-window-recreate-started');
      mainWindow = createMainWindow({ preloadPath, rendererDevUrl, rendererFile, safeMode });
      attachWindowDiagnostics(mainWindow);
      armMainWindowRevealFallback(mainWindow);
      dispatchPendingOpenFiles(mainWindow);
      logStartup('main-window-recreate-finished');
    }
  });

  app.on('window-all-closed', () => {
    logger.info('app:window-all-closed');
    if (healthyBootstrapTimer) {
      clearTimeout(healthyBootstrapTimer);
      healthyBootstrapTimer = null;
    }
    if (mainWindowShowTimer) {
      clearTimeout(mainWindowShowTimer);
      mainWindowShowTimer = null;
    }
    disposeSettings();
    disposeSystem();
    disposeDocuments();
    disposeExport();
    if (process.platform !== 'darwin') app.quit();
  });

  logStartup('bootstrap-completed');
}

function armMainWindowRevealFallback(window: BrowserWindow): void {
  if (mainWindowShowTimer) {
    clearTimeout(mainWindowShowTimer);
    mainWindowShowTimer = null;
  }

  window.once('ready-to-show', () => {
    mainWindowShowTimer = setTimeout(() => {
      logger.warn('window:main-window-ready-without-app-ready', {
        id: window.id,
        elapsedSinceProcessStartMs: Date.now() - bootstrapStartedAtMs,
      });
      revealMainWindow('main-window-ready-fallback');
    }, 7_500);
  });
}

function revealMainWindow(reason: string): void {
  const window = resolveMainWindow();
  if (!window || window.isDestroyed() || window.isVisible()) {
    return;
  }

  if (mainWindowShowTimer) {
    clearTimeout(mainWindowShowTimer);
    mainWindowShowTimer = null;
  }
  logger.info('window:show-requested', {
    id: window.id,
    reason,
    elapsedSinceProcessStartMs: Date.now() - bootstrapStartedAtMs,
  });
  showMainWindow(window);
}

function scheduleHealthyBootstrap(): void {
  if (healthyBootstrapTimer) {
    clearTimeout(healthyBootstrapTimer);
  }
  healthyBootstrapTimer = setTimeout(() => {
    markBootstrapHealthy('timer');
  }, crashState.healthyBootstrapDelayMs);
}

function markBootstrapHealthy(reason: string): void {
  if (bootstrapMarkedHealthy) {
    return;
  }
  bootstrapMarkedHealthy = true;
  if (healthyBootstrapTimer) {
    clearTimeout(healthyBootstrapTimer);
    healthyBootstrapTimer = null;
  }
  void crashState
    .markBootstrapHealthy()
    .then(() => logStartup('healthy', { reason, ...crashState.snapshot }))
    .catch((err) =>
      logger.warn('app:bootstrap-healthy-failed', {
        reason,
        error: serializeErrorForLog(err),
      }),
    );
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

  logger.info('app:file-open-dispatch-started', { count: pendingOpenFilePaths.size });
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
  logger.info('window:created', {
    id: window.id,
    bounds: window.getBounds(),
  });
  window.once('ready-to-show', () => {
    logger.info('window:ready-to-show', {
      id: window.id,
      elapsedSinceProcessStartMs: Date.now() - bootstrapStartedAtMs,
    });
  });
  window.on('show', () => logger.info('window:show', { id: window.id }));
  window.on('closed', () => logger.info('window:closed', { id: window.id }));
  window.webContents.on('did-start-loading', () =>
    logger.info('window:did-start-loading', { id: window.id }),
  );
  window.webContents.on('dom-ready', () => logger.info('window:dom-ready', { id: window.id }));
  window.webContents.on('did-finish-load', () =>
    logger.info('window:did-finish-load', { id: window.id }),
  );
  window.webContents.on(
    'did-fail-load',
    (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
      logger.error('window:did-fail-load', {
        id: window.id,
        errorCode,
        errorDescription,
        validatedURL,
        isMainFrame,
      });
    },
  );
  window.webContents.on('preload-error', (_event, preloadPath, error) => {
    logger.error('window:preload-error', {
      id: window.id,
      preloadPath,
      error: serializeErrorForLog(error),
    });
  });
  window.webContents.on('render-process-gone', (_event, details) => {
    logger.error('window:render-process-gone', { id: window.id, ...details, latestRendererEvent });
    void logCrashpadPendingDumps();
  });
  window.webContents.on('unresponsive', () =>
    logger.warn('window:unresponsive', { id: window.id }),
  );
  window.webContents.on('responsive', () => logger.info('window:responsive', { id: window.id }));
  window.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    logger.debug('renderer:console-message', { id: window.id, level, message, line, sourceId });
  });
}

function registerProcessDiagnostics(): void {
  process.on('uncaughtException', (error) => {
    logger.error('process:uncaught-exception', { error: serializeErrorForLog(error) });
    void logger.flush();
  });
  process.on('unhandledRejection', (reason) => {
    logger.error('process:unhandled-rejection', { reason: serializeErrorForLog(reason) });
    void logger.flush();
  });
  app.on('child-process-gone', (_event, details) => {
    logger.error('app:child-process-gone', { ...details, latestRendererEvent });
    void logCrashpadPendingDumps();
  });
  app.on('render-process-gone', (_event, webContents, details) => {
    logger.error('app:render-process-gone', {
      webContentsId: webContents.id,
      ...details,
      latestRendererEvent,
    });
  });
  app.on('gpu-info-update', () => logger.info('app:gpu-info-update'));
  app.on('will-quit', () => {
    logger.info('app:will-quit');
    markBootstrapHealthy('will-quit');
    void logger.flush();
  });
  app.on('before-quit', () => {
    logger.info('app:before-quit');
    markBootstrapHealthy('before-quit');
    void logger.flush();
  });
}

async function logCrashpadPendingDumps(): Promise<void> {
  try {
    const pendingDir = join(app.getPath('crashDumps'), 'pending');
    const entries = await fs.readdir(pendingDir);
    const dumps = entries.filter((entry) => entry.endsWith('.dmp'));
    logger.info('app:crashpad-pending-dumps', { count: dumps.length });
  } catch (error: unknown) {
    if (!isNodeError(error) || error.code !== 'ENOENT') {
      logger.warn('app:crashpad-pending-dumps-failed', { error: serializeErrorForLog(error) });
    }
  }
}

function isNodeError(err: unknown): err is NodeJS.ErrnoException {
  return err instanceof Error && 'code' in err;
}

if (app.hasSingleInstanceLock()) {
  bootstrap().catch((err) => {
    logger.error('app:fatal-bootstrap-error', { error: serializeErrorForLog(err) });
    console.error(`[${PRODUCT_NAME}] fatal bootstrap error`, err);
    void logger.flush().finally(() => app.exit(1));
  });
}

function logStartup(event: string, context: Record<string, unknown> = {}): void {
  logger.info(`startup:${event}`, {
    elapsedSinceProcessStartMs: Date.now() - bootstrapStartedAtMs,
    rssBytes: process.memoryUsage().rss,
    ...context,
  });
}
