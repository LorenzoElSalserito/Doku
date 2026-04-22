import { app } from 'electron';
import { join } from 'node:path';

export interface ExportRuntimePaths {
  printStylesheetPath: string;
  weasyScriptPath: string;
}

export function resolveExportRuntimePaths(baseDir: string): ExportRuntimePaths {
  const exportRoot = app.isPackaged
    ? join(process.resourcesPath, 'export-runtime')
    : join(baseDir, '../../../../packages/infrastructure/src/export');

  return {
    printStylesheetPath: join(exportRoot, 'printStylesheet.css'),
    weasyScriptPath: join(exportRoot, 'scripts/render_weasy_pdf.py'),
  };
}
