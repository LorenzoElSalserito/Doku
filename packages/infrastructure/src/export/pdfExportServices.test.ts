import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LatexPdfExportService } from './latexPdfExportService.js';
import { WeasyPdfExportService } from './weasyPdfExportService.js';

const execFileMock = vi.hoisted(() => vi.fn());

vi.mock('node:child_process', () => ({
  execFile: execFileMock,
}));

describe('PDF export services', () => {
  beforeEach(() => {
    execFileMock.mockReset();
    execFileMock.mockImplementation((command: string, args: string[], optionsOrCallback: unknown, maybeCallback: unknown) => {
      const callback = typeof optionsOrCallback === 'function' ? optionsOrCallback : maybeCallback;
      if (typeof callback !== 'function') {
        throw new Error('Missing execFile callback');
      }

      const outputPath = resolveOutputPath(command, args);
      void writeFile(outputPath, '%PDF-1.7\n%Doku test PDF\n').then(() => {
        callback(null, '', '');
      });
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exports a typographic PDF through Pandoc and LuaLaTeX', async () => {
    const outputPath = join('/tmp', `doku-lualatex-${Date.now()}.pdf`);
    const service = new LatexPdfExportService({
      pandocPath: '/opt/Doku/resources/export-runtime/latex/bin/pandoc',
      lualatexPath: '/opt/Doku/resources/export-runtime/latex/bin/lualatex',
      latexRuntimeRoot: '/opt/Doku/resources/export-runtime/latex',
    });

    const result = await service.exportPdf(
      {
        engine: 'lualatex',
        title: 'Export Check',
        content: '# Export Check\n\nHello **Doku**.',
      },
      outputPath,
    );

    expect(result).toEqual(
      expect.objectContaining({
        outputPath,
        engine: 'lualatex',
      }),
    );
    expect(result.fileSizeBytes).toBeGreaterThan(0);
    expect(execFileMock).toHaveBeenCalledWith(
      '/opt/Doku/resources/export-runtime/latex/bin/pandoc',
      expect.arrayContaining([
        '--pdf-engine=/opt/Doku/resources/export-runtime/latex/bin/lualatex',
        '--output',
        outputPath,
      ]),
      expect.objectContaining({
        env: expect.objectContaining({
          TEXMFCACHE: expect.any(String),
          TEXMFVAR: expect.any(String),
          XDG_CACHE_HOME: expect.any(String),
          TEXMFROOT: '/opt/Doku/resources/export-runtime/latex/share/texlive',
          TEXMFDIST: '/opt/Doku/resources/export-runtime/latex/share/texlive/texmf-dist',
          TEXMFSYSVAR: '/opt/Doku/resources/export-runtime/latex/var/lib/texmf',
        }),
      }),
      expect.any(Function),
    );
  });

  it('exports a web-style PDF through Pandoc HTML and the Weasy renderer script', async () => {
    const outputPath = join('/tmp', `doku-weasy-${Date.now()}.pdf`);
    const service = new WeasyPdfExportService({
      printStylesheetPath: 'packages/infrastructure/src/export/printStylesheet.css',
      weasyScriptPath: 'packages/infrastructure/src/export/scripts/render_weasy_pdf.py',
      pythonExecutablePath: '/opt/Doku/resources/export-runtime/weasy-python/bin/python',
    });

    const result = await service.exportPdf(
      {
        engine: 'weasy',
        title: 'Export Check',
        content: '# Export Check\n\nHello **Doku**.',
      },
      outputPath,
    );

    expect(result).toEqual(
      expect.objectContaining({
        outputPath,
        engine: 'weasy',
      }),
    );
    expect(result.fileSizeBytes).toBeGreaterThan(0);
    expect(execFileMock).toHaveBeenNthCalledWith(
      1,
      'pandoc',
      expect.arrayContaining(['--to=html5', '--output']),
      expect.any(Function),
    );
    expect(execFileMock).toHaveBeenNthCalledWith(
      2,
      '/opt/Doku/resources/export-runtime/weasy-python/bin/python',
      expect.arrayContaining(['packages/infrastructure/src/export/scripts/render_weasy_pdf.py', outputPath]),
      expect.any(Function),
    );
  });
});

function resolveOutputPath(command: string, args: string[]): string {
  if (args[0]?.endsWith('render_weasy_pdf.py')) {
    return args[2] ?? join('/tmp', 'doku-missing-weasy-output.pdf');
  }

  const outputFlagIndex = args.indexOf('--output');
  return args[outputFlagIndex + 1] ?? join('/tmp', 'doku-missing-pandoc-output.pdf');
}
