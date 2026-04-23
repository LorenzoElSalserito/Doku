import { app } from 'electron';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

export interface ExportRuntimePaths {
  printStylesheetPath: string;
  weasyScriptPath: string;
  weasyPythonPath?: string;
  pandocPath?: string;
  lualatexPath?: string;
  latexRuntimeRoot?: string;
}

export function resolveExportRuntimePaths(baseDir: string): ExportRuntimePaths {
  const bundledDevRuntime = join(baseDir, '../../../../build/export-runtime');
  const sourceRuntime = join(baseDir, '../../../../packages/infrastructure/src/export');
  const exportRoot = app.isPackaged
    ? join(process.resourcesPath, 'export-runtime')
    : existsSync(join(bundledDevRuntime, 'scripts/render_weasy_pdf.py'))
      ? bundledDevRuntime
      : sourceRuntime;

  const weasyPythonPath = process.platform === 'win32'
    ? join(exportRoot, 'weasy-python/Scripts/python.exe')
    : join(exportRoot, 'weasy-python/bin/python');
  const latexRuntimeRoot = join(exportRoot, 'latex');
  const pandocPath = join(latexRuntimeRoot, 'bin/pandoc');
  const lualatexPath = join(latexRuntimeRoot, 'bin/lualatex');

  return {
    printStylesheetPath: join(exportRoot, 'printStylesheet.css'),
    weasyScriptPath: join(exportRoot, 'scripts/render_weasy_pdf.py'),
    weasyPythonPath: existsSync(weasyPythonPath) ? weasyPythonPath : undefined,
    pandocPath: existsSync(pandocPath) ? pandocPath : undefined,
    lualatexPath: existsSync(lualatexPath) ? lualatexPath : undefined,
    latexRuntimeRoot: existsSync(latexRuntimeRoot) ? latexRuntimeRoot : undefined,
  };
}
