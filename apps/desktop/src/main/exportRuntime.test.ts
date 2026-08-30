import { describe, expect, it } from 'vitest';
import { findMissingExportRuntimeEntries } from './exportRuntime.js';

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
