import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { promisify } from 'node:util';
import { PdfExportRequestSchema, type PdfExportRequest, type PdfExportResult } from '@doku/schemas';

const execFileAsync = promisify(execFile);

interface LatexPdfExportServiceOptions {
  pandocPath?: string;
  lualatexPath?: string;
  latexRuntimeRoot?: string;
}

export class LatexPdfExportService {
  private readonly pandocPath: string;
  private readonly lualatexPath: string;
  private readonly latexRuntimeRoot?: string;

  constructor(options: LatexPdfExportServiceOptions = {}) {
    this.pandocPath = options.pandocPath ?? 'pandoc';
    this.lualatexPath = options.lualatexPath ?? 'lualatex';
    this.latexRuntimeRoot = options.latexRuntimeRoot;
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
  },
): Promise<void> {
  try {
    await execFileAsync(runtime.pandocPath, [
      markdownPath,
      '--from=gfm',
      '--standalone',
      `--pdf-engine=${runtime.lualatexPath}`,
      '--metadata',
      `title=${input.title}`,
      '--output',
      outputPath,
    ], {
      env: buildLatexEnvironment(cacheDir, runtime.latexRuntimeRoot),
    });
  } catch (error: unknown) {
    throw humanizeExportError(error);
  }
}

function buildLatexEnvironment(cacheDir: string, latexRuntimeRoot: string | undefined): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    TEXMFCACHE: cacheDir,
    TEXMFVAR: cacheDir,
    XDG_CACHE_HOME: cacheDir,
  };

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
  ].join(':');
  env.PATH = `${join(latexRuntimeRoot, 'bin')}:${env.PATH ?? ''}`;

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
