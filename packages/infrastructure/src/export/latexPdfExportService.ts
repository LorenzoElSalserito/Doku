import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { promisify } from 'node:util';
import { PdfExportRequestSchema, type PdfExportRequest, type PdfExportResult } from '@doku/schemas';

const execFileAsync = promisify(execFile);

export class LatexPdfExportService {
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

      await runPandoc(markdownPath, outputPath, input, cacheDir);

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
): Promise<void> {
  try {
    await execFileAsync('pandoc', [
      markdownPath,
      '--from=gfm',
      '--standalone',
      '--pdf-engine=lualatex',
      '--metadata',
      `title=${input.title}`,
      '--output',
      outputPath,
    ], {
      env: {
        ...process.env,
        TEXMFCACHE: cacheDir,
        TEXMFVAR: cacheDir,
        XDG_CACHE_HOME: cacheDir,
      },
    });
  } catch (error: unknown) {
    throw humanizeExportError(error);
  }
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
