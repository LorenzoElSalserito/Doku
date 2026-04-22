import { execFile } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { PdfExportRequestSchema, type PdfExportRequest, type PdfExportResult } from '@doku/schemas';

const execFileAsync = promisify(execFile);
const DEFAULT_WEASY_SCRIPT_PATH = fileURLToPath(new URL('./scripts/render_weasy_pdf.py', import.meta.url));
const DEFAULT_PRINT_STYLESHEET_PATH = fileURLToPath(new URL('./printStylesheet.css', import.meta.url));

interface WeasyPdfExportServiceOptions {
  weasyScriptPath?: string;
  printStylesheetPath?: string;
}

export class WeasyPdfExportService {
  private readonly weasyScriptPath: string;
  private readonly printStylesheetPath: string;

  constructor(options: WeasyPdfExportServiceOptions = {}) {
    this.weasyScriptPath = options.weasyScriptPath ?? DEFAULT_WEASY_SCRIPT_PATH;
    this.printStylesheetPath = options.printStylesheetPath ?? DEFAULT_PRINT_STYLESHEET_PATH;
  }

  async exportPdf(raw: unknown, outputPath: string): Promise<PdfExportResult> {
    const input = PdfExportRequestSchema.parse(raw);

    if (!input.content.trim()) {
      throw new Error('The document is empty. Write something before exporting the PDF.');
    }

    const tempDir = await mkdtemp(join(tmpdir(), 'doku-weasy-export-'));

    try {
      const markdownPath = join(tempDir, 'document.md');
      const htmlPath = join(tempDir, 'document.html');
      const stylesheetPath = join(tempDir, 'doku-print.css');

      await writeFile(markdownPath, input.content, 'utf-8');
      await copyFile(this.printStylesheetPath, stylesheetPath);
      await mkdir(dirname(outputPath), { recursive: true });

      await renderHtml(markdownPath, htmlPath, stylesheetPath, input);
      await renderPdf(htmlPath, outputPath, this.weasyScriptPath);

      const details = await stat(outputPath);
      return {
        outputPath,
        fileSizeBytes: details.size,
        engine: 'weasy',
        exportedAt: new Date().toISOString(),
      };
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  }
}

async function renderHtml(
  markdownPath: string,
  htmlPath: string,
  stylesheetPath: string,
  input: PdfExportRequest,
): Promise<void> {
  try {
    await execFileAsync('pandoc', [
      markdownPath,
      '--from=gfm',
      '--to=html5',
      '--standalone',
      '--css',
      stylesheetPath,
      '--metadata',
      `title=${input.title}`,
      '--output',
      htmlPath,
    ]);
  } catch (error: unknown) {
    throw humanizeWeasyError(error);
  }
}

async function renderPdf(
  htmlPath: string,
  outputPath: string,
  weasyScriptPath: string,
): Promise<void> {
  try {
    await execFileAsync('python3', [weasyScriptPath, htmlPath, outputPath]);
  } catch (error: unknown) {
    throw humanizeWeasyError(error);
  }
}

function humanizeWeasyError(error: unknown): Error {
  if (isMissingExecutable(error, 'pandoc')) {
    return new Error('Pandoc is not available on this machine, so web-style PDF export cannot start yet.');
  }

  if (isMissingExecutable(error, 'python3')) {
    return new Error('Python 3 is not available on this machine, so web-style PDF export cannot run.');
  }

  if (isExecFileError(error)) {
    const details = [error.stderr, error.stdout]
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .join('\n')
      .trim();

    if (details.includes('WeasyPrint is not installed')) {
      return new Error('WeasyPrint is not installed in the local Python runtime, so this export profile is not available yet.');
    }

    if (details) {
      return new Error(`Web-style PDF export failed. ${truncate(details, 320)}`);
    }
  }

  return new Error('Web-style PDF export failed before the file could be generated.');
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
