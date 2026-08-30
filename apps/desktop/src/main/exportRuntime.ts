import { app } from 'electron';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export interface ExportRuntimePaths {
  printStylesheetPath: string;
  weasyScriptPath: string;
  weasyPythonPath?: string;
  pandocPath?: string;
  lualatexPath?: string;
  latexRuntimeRoot?: string;
  nativeLibraryDir?: string;
  pythonHome?: string;
  pythonPath?: string;
}

export function findMissingExportRuntimeEntries(paths: ExportRuntimePaths): string[] {
  const required: ReadonlyArray<readonly [string, string | undefined]> = [
    ['printStylesheet.css', paths.printStylesheetPath],
    ['scripts/render_weasy_pdf.py', paths.weasyScriptPath],
    ['weasy-python', paths.weasyPythonPath],
    ['latex/bin/pandoc', paths.pandocPath],
    ['latex/bin/lualatex', paths.lualatexPath],
    ['latex runtime', paths.latexRuntimeRoot],
    ['native libraries', paths.nativeLibraryDir],
    ['Python home', paths.pythonHome],
    ['Python packages', paths.pythonPath],
  ];

  return required
    .filter(([, path]) => !path || !existsSync(path))
    .map(([name]) => name);
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
  const nativeLibraryDir = join(exportRoot, 'lib');
  const pythonHome = join(exportRoot, 'weasy-python');
  const pythonPath = resolvePythonSitePackages(pythonHome);
  const executableSuffix = process.platform === 'win32' ? '.exe' : '';
  const pandocPath = join(latexRuntimeRoot, `bin/pandoc${executableSuffix}`);
  const lualatexPath = join(latexRuntimeRoot, `bin/lualatex${executableSuffix}`);

  return {
    printStylesheetPath: join(exportRoot, 'printStylesheet.css'),
    weasyScriptPath: join(exportRoot, 'scripts/render_weasy_pdf.py'),
    weasyPythonPath: existsSync(weasyPythonPath) ? weasyPythonPath : undefined,
    pandocPath: existsSync(pandocPath) ? pandocPath : undefined,
    lualatexPath: existsSync(lualatexPath) ? lualatexPath : undefined,
    latexRuntimeRoot: existsSync(latexRuntimeRoot) ? latexRuntimeRoot : undefined,
    nativeLibraryDir: existsSync(nativeLibraryDir) ? nativeLibraryDir : undefined,
    pythonHome: existsSync(pythonHome) ? pythonHome : undefined,
    pythonPath,
  };
}

function resolvePythonSitePackages(pythonHome: string): string | undefined {
  const libDir = join(pythonHome, 'lib');
  if (!existsSync(libDir)) return undefined;
  const versionDir = readdirSync(libDir).find((entry) => entry.startsWith('python'));
  if (!versionDir) return undefined;
  const sitePackages = join(libDir, versionDir, 'site-packages');
  return existsSync(sitePackages) ? sitePackages : undefined;
}
