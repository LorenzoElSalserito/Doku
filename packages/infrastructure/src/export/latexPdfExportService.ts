import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { delimiter, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { PdfExportRequestSchema, type PdfExportRequest, type PdfExportResult } from '@doku/schemas';
import { shouldInjectPandocTitle } from './markdownTitle.js';
import { buildLatexFontVariables, resolvePdfTypography } from './pdfTypography.js';
import { materializeVisualAssets } from './visualAssets.js';

const execFileAsync = promisify(execFile);
const DEFAULT_FONT_ASSETS_DIR = fileURLToPath(new URL('./fonts', import.meta.url));
const DEFAULT_PREAMBLE_PATH = fileURLToPath(new URL('./latexPreamble.tex', import.meta.url));
const DEFAULT_TABLE_FILTER_PATH = fileURLToPath(new URL('./tableWidths.lua', import.meta.url));

/**
 * The bundled families are single-file variable fonts: bold and italic are
 * axes, not separate files. fontspec is told to synthesise the faces from the
 * weight/slant axes so `**bold**` and `*italic*` render in the PDF.
 */
const VARIABLE_FONT_OPTIONS =
  'BoldFont={*},BoldFeatures={RawFeature={axis={wght=700}}},ItalicFont={*},ItalicFeatures={RawFeature={axis={slnt=-10,ital=1}}},BoldItalicFont={*},BoldItalicFeatures={RawFeature={axis={wght=700,slnt=-10,ital=1}}}';

interface LatexPdfExportServiceOptions {
  pandocPath?: string;
  lualatexPath?: string;
  latexRuntimeRoot?: string;
  fontAssetsDir?: string;
  nativeLibraryDir?: string;
  /** LaTeX preamble appended to pandoc's own (typography, code wrapping, rules). */
  preamblePath?: string;
  /** Pandoc Lua filter that keeps wide tables inside the text column. */
  tableFilterPath?: string;
}

export class LatexPdfExportService {
  private readonly pandocPath: string;
  private readonly lualatexPath: string;
  private readonly latexRuntimeRoot?: string;
  private readonly fontAssetsDir: string;
  private readonly nativeLibraryDir?: string;
  private readonly preamblePath: string;
  private readonly tableFilterPath: string;

  constructor(options: LatexPdfExportServiceOptions = {}) {
    this.pandocPath = options.pandocPath ?? 'pandoc';
    this.lualatexPath = options.lualatexPath ?? 'lualatex';
    this.latexRuntimeRoot = options.latexRuntimeRoot;
    this.fontAssetsDir = options.fontAssetsDir ?? DEFAULT_FONT_ASSETS_DIR;
    this.nativeLibraryDir = options.nativeLibraryDir;
    this.preamblePath = options.preamblePath ?? DEFAULT_PREAMBLE_PATH;
    this.tableFilterPath = options.tableFilterPath ?? DEFAULT_TABLE_FILTER_PATH;
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
      // LuaLaTeX embeds raster pictures only: captured diagrams go in as PNG.
      const { markdown } = await materializeVisualAssets(
        input.content,
        input.visualAssets,
        tempDir,
        'png-only',
      );
      await writeFile(markdownPath, markdown, 'utf-8');
      await mkdir(cacheDir, { recursive: true });
      await mkdir(dirname(outputPath), { recursive: true });

      await runPandoc(markdownPath, outputPath, input, cacheDir, {
        pandocPath: this.pandocPath,
        lualatexPath: this.lualatexPath,
        latexRuntimeRoot: this.latexRuntimeRoot,
        fontAssetsDir: this.fontAssetsDir,
        nativeLibraryDir: this.nativeLibraryDir,
        preamblePath: this.preamblePath,
        tableFilterPath: this.tableFilterPath,
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
    preamblePath: string;
    tableFilterPath: string;
  },
): Promise<void> {
  try {
    const args = [
      markdownPath,
      ...(runtime.latexRuntimeRoot ? [`--data-dir=${join(runtime.latexRuntimeRoot, 'share/pandoc')}`] : []),
      '--from=gfm',
      '--standalone',
      `--pdf-engine=${runtime.lualatexPath}`,
      '--pdf-engine-opt=-halt-on-error',
      '--variable=papersize:a4',
      '--variable=classoption:twoside',
      '--variable=geometry:inner=26mm,outer=16mm,top=20mm,bottom=20mm',
      '--variable=fontsize:11pt',
      '--variable=linestretch:1.2',
      '--variable=colorlinks:true',
      '--variable=linkcolor:dokuaccent',
      '--variable=urlcolor:dokuaccent',
      '--variable=citecolor:dokuaccent',
      // Plain code, like the preview: no syntax colours, and every line wraps
      // (highlighted tokens would be unbreakable macro arguments).
      '--no-highlight',
      `--include-in-header=${runtime.preamblePath}`,
      `--lua-filter=${runtime.tableFilterPath}`,
      `--variable=mainfontoptions:${VARIABLE_FONT_OPTIONS}`,
      `--variable=sansfontoptions:${VARIABLE_FONT_OPTIONS}`,
      `--variable=monofontoptions:${VARIABLE_FONT_OPTIONS}`,
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
  env.OSFONTDIR = fontAssetsDir;

  if (!latexRuntimeRoot) {
    return env;
  }

  env.TEXMFROOT = join(latexRuntimeRoot, 'share/texlive');
  env.TEXMFDIST = join(latexRuntimeRoot, 'share/texlive/texmf-dist');
  env.TEXMFHOME = cacheDir;
  env.TEXMFCONFIG = cacheDir;
  env.TEXMFDEBIAN = join(latexRuntimeRoot, 'share/texmf-debian');
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
