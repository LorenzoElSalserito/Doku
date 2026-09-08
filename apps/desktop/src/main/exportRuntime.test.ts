import { describe, expect, it, vi } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { findMissingExportRuntimeEntries, resolveExportRuntimePaths } from './exportRuntime.js';

vi.mock('electron', () => ({ app: { isPackaged: false } }));

describe('findMissingExportRuntimeEntries', () => {
  it('rejects missing executables instead of allowing host fallbacks', () => {
    expect(
      findMissingExportRuntimeEntries({
        printStylesheetPath: '/missing/printStylesheet.css',
        weasyScriptPath: '/missing/render_weasy_pdf.py',
      }),
    ).toEqual([
      'printStylesheet.css',
      'scripts/render_weasy_pdf.py',
      'weasy-python',
      'latex/bin/pandoc',
      'latex/bin/lualatex',
      'latex runtime',
      'native libraries',
      'Python home',
      'Python packages',
    ]);
  });
});


it('resolves a self-contained Windows Python layout without a venv launcher', () => {
  const temp = mkdtempSync(join(tmpdir(), 'doku-win-layout-'));
  const runtime = join(temp, 'build/export-runtime');
  const original = Object.getOwnPropertyDescriptor(process, 'platform')!;
  try {
    for (const entry of ['scripts/render_weasy_pdf.py', 'printStylesheet.css',
      'weasy-python/python.exe', 'weasy-python/Lib/site-packages/weasyprint/__init__.py',
      'latex/bin/pandoc.exe', 'latex/bin/lualatex.exe', 'lib/libgobject-2.0-0.dll']) {
      const file = join(runtime, entry);
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, 'fixture');
    }
    Object.defineProperty(process, 'platform', { value: 'win32' });
    const paths = resolveExportRuntimePaths(join(temp, 'apps/desktop/out/main'));
    expect(paths.weasyPythonPath).toBe(join(runtime, 'weasy-python/python.exe'));
    expect(paths.pythonPath).toBe(join(runtime, 'weasy-python/Lib/site-packages'));
    expect(findMissingExportRuntimeEntries(paths)).toEqual([]);
  } finally {
    Object.defineProperty(process, 'platform', original);
    rmSync(temp, { recursive: true, force: true });
  }
});
