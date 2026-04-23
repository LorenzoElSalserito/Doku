import { app, BrowserWindow } from 'electron';
import { promises as fs } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ORIGINAL_USER_DATA_DIR = app.getPath('userData');
const DOCUMENTS_DATA_DIR = resolveDocumentsDataDir(ORIGINAL_USER_DATA_DIR);
const logger = new SessionLogger({ logsDir: join(DOCUMENTS_DATA_DIR, 'logs') });
const LOG_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

if (process.platform === 'linux') {
  app.disableHardwareAcceleration();
  app.commandLine.appendSwitch('disable-gpu');
  app.commandLine.appendSwitch('disable-gpu-compositing');
}

app.setName(PRODUCT_NAME);

registerProcessDiagnostics();

async function bootstrap(): Promise<void> {
  logger.info('app:bootstrap-started', {
    platform: process.platform,
    version: app.getVersion(),
    appDataDir: DOCUMENTS_DATA_DIR,
    electronUserDataDir: ORIGINAL_USER_DATA_DIR,
  });
  void logger.pruneOlderThan(LOG_RETENTION_MS);

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

  const mainWindow = createMainWindow({ preloadPath, rendererDevUrl, rendererFile });
  attachWindowDiagnostics(mainWindow);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      attachWindowDiagnostics(createMainWindow({ preloadPath, rendererDevUrl, rendererFile }));
    }
  });

  app.on('window-all-closed', () => {
    logger.info('app:window-all-closed');
    disposeSettings();
    disposeSystem();
    disposeDocuments();
    disposeExport();
    if (process.platform !== 'darwin') app.quit();
  });
}

function resolveDocumentsDataDir(fallbackDir: string): string {
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

bootstrap().catch((err) => {
  logger.error('app:fatal-bootstrap-error', { error: serializeErrorForLog(err) });
  console.error(`[${PRODUCT_NAME}] fatal bootstrap error`, err);
  app.exit(1);
});
