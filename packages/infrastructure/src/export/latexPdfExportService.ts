import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { delimiter, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { PdfExportRequestSchema, type PdfExportRequest, type PdfExportResult } from '@doku/schemas';
import { shouldInjectPandocTitle } from './markdownTitle.js';
import { buildLatexFontVariables, resolvePdfTypography } from './pdfTypography.js';

const execFileAsync = promisify(execFile);
const DEFAULT_FONT_ASSETS_DIR = fileURLToPath(new URL('./fonts', import.meta.url));

interface LatexPdfExportServiceOptions {
  pandocPath?: string;
  lualatexPath?: string;
  latexRuntimeRoot?: string;
  fontAssetsDir?: string;
  nativeLibraryDir?: string;
}

export class LatexPdfExportService {
  private readonly pandocPath: string;
  private readonly lualatexPath: string;
  private readonly latexRuntimeRoot?: string;
  private readonly fontAssetsDir: string;
  private readonly nativeLibraryDir?: string;

  constructor(options: LatexPdfExportServiceOptions = {}) {
    this.pandocPath = options.pandocPath ?? 'pandoc';
    this.lualatexPath = options.lualatexPath ?? 'lualatex';
    this.latexRuntimeRoot = options.latexRuntimeRoot;
    this.fontAssetsDir = options.fontAssetsDir ?? DEFAULT_FONT_ASSETS_DIR;
    this.nativeLibraryDir = options.nativeLibraryDir;
  }

  async exportPdf(raw: unknown, outputPath: string): Promise<PdfExportResult> {
    const input = PdfExportRequestSchema.parse(raw);

    if (!input.content.trim()) {
      throw new Error('The document is empty. Write something before exporting the PDF.');
    }

    const tempDir = await mkdtemp(join(tmpdir(), 'doku-latex-export-'));

    try {
      const markdownPath = join(tempDir, 'document.md');
      const cacheDir = join(tempDir, '.tex-cache');
      await writeFile(markdownPath, input.content, 'utf-8');
      await mkdir(cacheDir, { recursive: true });
      await mkdir(dirname(outputPath), { recursive: true });

      await runPandoc(markdownPath, outputPath, input, cacheDir, {
        pandocPath: this.pandocPath,
        lualatexPath: this.lualatexPath,
        latexRuntimeRoot: this.latexRuntimeRoot,
        fontAssetsDir: this.fontAssetsDir,
        nativeLibraryDir: this.nativeLibraryDir,
      });

      const details = await stat(outputPath);
      return {
        outputPath,
        fileSizeBytes: details.size,
        engine: 'lualatex',
        exportedAt: new Date().toISOString(),
      };
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  }
}

async function runPandoc(
  markdownPath: string,
  outputPath: string,
  input: PdfExportRequest,
  cacheDir: string,
  runtime: {
    pandocPath: string;
    lualatexPath: string;
    latexRuntimeRoot?: string;
    fontAssetsDir: string;
    nativeLibraryDir?: string;
  },
): Promise<void> {
  try {
    const args = [
      markdownPath,
      '--from=gfm',
      '--standalone',
      `--pdf-engine=${runtime.lualatexPath}`,
      '--pdf-engine-opt=-halt-on-error',
      '--variable=papersize:a4',
      '--variable=classoption:twoside',
      '--variable=geometry:inner=26mm,outer=16mm,top=20mm,bottom=20mm',
      '--variable=fontsize:11pt',
      '--variable=linestretch:1.15',
      '--variable=colorlinks:true',
      '--variable=linkcolor:blue',
      '--variable=urlcolor:blue',
      ...buildLatexFontVariables(resolvePdfTypography(input.typography)),
      '--output',
      outputPath,
    ];

    if (shouldInjectPandocTitle(input.content, input.title)) {
      args.splice(args.length - 2, 0, '--metadata', `title=${input.title.trim()}`);
    }

    await execFileAsync(runtime.pandocPath, args, {
      env: buildLatexEnvironment(
        cacheDir,
        runtime.latexRuntimeRoot,
        runtime.fontAssetsDir,
        runtime.nativeLibraryDir,
      ),
    });
  } catch (error: unknown) {
    throw humanizeExportError(error);
  }
}

function buildLatexEnvironment(
  cacheDir: string,
  latexRuntimeRoot: string | undefined,
  bundledFontAssetsDir: string,
  nativeLibraryDir?: string,
): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    TEXMFCACHE: cacheDir,
    TEXMFVAR: cacheDir,
    XDG_CACHE_HOME: cacheDir,
  };
  if (nativeLibraryDir) {
    env.LD_LIBRARY_PATH = env.LD_LIBRARY_PATH
      ? `${nativeLibraryDir}${delimiter}${env.LD_LIBRARY_PATH}`
      : nativeLibraryDir;
  }

  const runtimeFontAssetsDir = latexRuntimeRoot ? join(dirname(latexRuntimeRoot), 'fonts') : null;
  const fontAssetsDir = runtimeFontAssetsDir ?? bundledFontAssetsDir;
  env.OSFONTDIR = env.OSFONTDIR ? `${fontAssetsDir}${delimiter}${env.OSFONTDIR}` : fontAssetsDir;

  if (!latexRuntimeRoot) {
    return env;
  }

  env.TEXMFROOT = join(latexRuntimeRoot, 'share/texlive');
  env.TEXMFDIST = join(latexRuntimeRoot, 'share/texlive/texmf-dist');
  env.TEXMFLOCAL = join(latexRuntimeRoot, 'share/texmf');
  env.TEXMFSYSVAR = join(latexRuntimeRoot, 'var/lib/texmf');
  env.TEXMFSYSCONFIG = join(latexRuntimeRoot, 'etc/texmf');
  env.TEXMFCNF = [
    join(latexRuntimeRoot, 'etc/texmf/web2c'),
    join(latexRuntimeRoot, 'share/texlive/texmf-dist/web2c'),
  ].join(delimiter);
  env.PATH = `${join(latexRuntimeRoot, 'bin')}${delimiter}${env.PATH ?? ''}`;

  return env;
}

function humanizeExportError(error: unknown): Error {
  if (isMissingExecutable(error, 'pandoc')) {
    return new Error('Pandoc is not available on this machine, so PDF export cannot start yet.');
  }

  if (isMissingExecutable(error, 'lualatex')) {
    return new Error('LuaLaTeX is not available on this machine, so PDF export cannot complete.');
  }

  if (isExecFileError(error)) {
    const details = [error.stderr, error.stdout]
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .join('\n')
      .trim();

    if (details) {
      return new Error(`PDF export failed. ${truncate(details, 320)}`);
    }
  }

  return new Error('PDF export failed before the file could be generated.');
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1).trimEnd()}…`;
}

function isMissingExecutable(error: unknown, executable: string): boolean {
  return (
    isExecFileError(error) &&
    error.code === 'ENOENT' &&
    (error.path === executable || error.spawnargs?.includes(executable) === true)
  );
}

function isExecFileError(
  error: unknown,
): error is Error & {
  code?: string;
  path?: string;
  spawnargs?: string[];
  stderr?: string;
  stdout?: string;
} {
  return error instanceof Error;
}
