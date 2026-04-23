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
} from '@doku/infrastructure';
import { PRODUCT_NAME } from '@doku/application';
import { resolveExportRuntimePaths } from './exportRuntime.js';
import { createMainWindow } from './window.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ORIGINAL_USER_DATA_DIR = app.getPath('userData');
const DOCUMENTS_DATA_DIR = resolveDocumentsDataDir(ORIGINAL_USER_DATA_DIR);

app.setName(PRODUCT_NAME);
app.setPath('userData', DOCUMENTS_DATA_DIR);

async function bootstrap(): Promise<void> {
  await app.whenReady();

  const userDataDir = app.getPath('userData');
  await migrateLegacyUserData(ORIGINAL_USER_DATA_DIR, userDataDir);
  const repo = new SettingsRepository({
    userDataDir,
    legacyFilePaths: [join(ORIGINAL_USER_DATA_DIR, 'settings.json')],
  });
  // Ensure defaults exist on disk (idempotent).
  await repo.read();

  const disposeSettings = registerSettingsChannel(repo);
  const disposeSystem = registerSystemChannel();
  const disposeDocuments = registerDocumentsChannel(repo, {
    userDataDir: app.getPath('userData'),
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
  });

  const preloadPath = join(__dirname, '../preload/index.js');
  const rendererDevUrl = process.env.ELECTRON_RENDERER_URL;
  const rendererFile = join(__dirname, '../renderer/index.html');

  createMainWindow({ preloadPath, rendererDevUrl, rendererFile });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow({ preloadPath, rendererDevUrl, rendererFile });
    }
  });

  app.on('window-all-closed', () => {
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
  const entries = await fs.readdir(sourceDir);

  for (const entry of entries) {
    await fs.cp(join(sourceDir, entry), join(targetDir, entry), {
      recursive: true,
      errorOnExist: false,
      force: false,
    });
  }
}

bootstrap().catch((err) => {
  console.error(`[${PRODUCT_NAME}] fatal bootstrap error`, err);
  app.exit(1);
});
