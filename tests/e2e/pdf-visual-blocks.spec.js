const { join } = require('node:path');
const { expect, test } = require('@playwright/test');
const {
  cleanupDokuE2EContext,
  closeDokuApp,
  createDokuE2EContext,
  createMarkdownFile,
  hasLatexExportRuntime,
  hasWeasyExportRuntime,
  launchDokuApp,
  prepareDokuProfile,
  stubSaveDialog,
} = require('./helpers/dokuApp.cjs');
const {
  A4_WIDTH_PT,
  findOverflowingWords,
  hasPdfTools,
  readPdfImages,
  readPdfText,
  readPdfWords,
} = require('./helpers/pdfAudit.cjs');

/**
 * Mermaid diagrams, Markmap mind maps and charts are rendered by the app and
 * embedded in the PDF as pictures — the same pictures the preview shows —
 * instead of printing their source code.
 */

const DOCUMENT = [
  '# Visuali MARK_TITLE',
  '',
  'Intro MARK_INTRO.',
  '',
  '```mermaid',
  'graph LR',
  '  A[Bozza MARK_MERMAID_SRC] --> B[Revisione]',
  '  B --> C[Stampa]',
  '```',
  '',
  'Testo tra i blocchi MARK_MIDDLE.',
  '',
  '```chart',
  '{',
  '  "kind": "chart",',
  '  "chartType": "bar",',
  '  "title": "Vendite MARK_CHART_SRC",',
  '  "xKey": "mese",',
  '  "yKeys": ["valore"],',
  '  "data": [',
  '    { "mese": "Gen", "valore": 12 },',
  '    { "mese": "Feb", "valore": 18 },',
  '    { "mese": "Mar", "valore": 9 }',
  '  ]',
  '}',
  '```',
  '',
  '```markmap',
  '# Radice MARK_MARKMAP_SRC',
  '## Ramo uno',
  '## Ramo due',
  '```',
  '',
  'Fine MARK_END.',
  '',
].join('\n');

async function exportPdf(page, outputPath, profileName) {
  await page.getByRole('button', { name: 'Export' }).click();
  const profiles = page.getByRole('tablist', { name: 'PDF profile' });
  await profiles.waitFor({ state: 'visible' });
  await profiles.getByRole('tab', { name: profileName }).click();
  // The dialog announces that diagrams will be embedded as pictures.
  await expect(page.locator('.export-dialog__guarantees svg[data-icon="diagram-3"]')).toBeVisible();
  await page.getByRole('button', { name: 'Export PDF', exact: true }).click();
  await expect(page.getByText('Export completed')).toBeVisible({ timeout: 180_000 });
}

test.describe('visual blocks in PDF export', () => {
  let context;

  test.skip(!hasPdfTools(), 'poppler-utils is required to audit the PDF.');

  test.beforeEach(async () => {
    context = createDokuE2EContext();
    await prepareDokuProfile(context, { workspaceViewMode: 'split' });
  });

  test.afterEach(async () => {
    await cleanupDokuE2EContext(context);
  });

  test('the export dialog renders diagrams off-screen and captures them', async () => {
    const documentPath = await createMarkdownFile(context, 'visual.md', DOCUMENT);
    const run = await launchDokuApp(context, documentPath);

    try {
      const { page } = run;
      await page.getByRole('button', { name: 'Export' }).click();
      const stage = page.getByTestId('export-offscreen-preview');
      await expect(stage).toBeAttached();
      await expect
        .poll(
          async () =>
            stage.evaluate((element) => ({
              visuals: element.querySelectorAll('.markdown-preview__visual').length,
              svgs: [...element.querySelectorAll('.markdown-preview__visual')].filter(
                (block) => block.querySelector('svg') && !block.querySelector('.visual-block--loading'),
              ).length,
            })),
          { timeout: 20_000 },
        )
        .toEqual({ visuals: 3, svgs: 3 });

      // Mermaid renders plain SVG text (no HTML labels) so it can be embedded.
      const mermaidForeign = await stage.evaluate(
        (element) => element.querySelectorAll('.markdown-preview__visual--mermaid foreignObject').length,
      );
      expect(mermaidForeign).toBe(0);
    } finally {
      await closeDokuApp(run.app);
    }
  });

  test('web/print PDF embeds the pictures instead of the source code', async () => {
    test.skip(!hasWeasyExportRuntime(), 'WeasyPrint runtime or Pandoc is not installed.');
    test.setTimeout(240_000);

    const documentPath = await createMarkdownFile(context, 'visual.md', DOCUMENT);
    const outputPath = join(context.rootDir, 'visual-weasy.pdf');
    const run = await launchDokuApp(context, documentPath);

    try {
      await stubSaveDialog(run.app, outputPath);
      await exportPdf(run.page, outputPath, 'Web/print');

      const images = readPdfImages(outputPath);
      expect(images.length).toBeGreaterThanOrEqual(3);
      for (const image of images) {
        // Every picture fits the text column (A4 minus margins ≈ 470 pt).
        expect(image.width).toBeGreaterThan(50);
      }

      const text = readPdfText(outputPath);
      expect(text).toContain('MARK_TITLE');
      expect(text).toContain('MARK_MIDDLE');
      expect(text).toContain('MARK_END');
      // The fences are gone: no diagram source is printed as code.
      expect(text).not.toContain('graph LR');
      expect(text).not.toContain('"chartType"');
      expect(text).not.toContain('## Ramo uno');

      expect(findOverflowingWords(readPdfWords(outputPath))).toEqual([]);
    } finally {
      await closeDokuApp(run.app);
    }
  });

  test('typographic PDF embeds the pictures as raster images', async () => {
    test.skip(!hasLatexExportRuntime(), 'Pandoc/LuaLaTeX runtime is not installed.');
    test.setTimeout(240_000);

    const documentPath = await createMarkdownFile(context, 'visual.md', DOCUMENT);
    const outputPath = join(context.rootDir, 'visual-latex.pdf');
    const run = await launchDokuApp(context, documentPath);

    try {
      await stubSaveDialog(run.app, outputPath);
      await exportPdf(run.page, outputPath, 'Typographic');

      const images = readPdfImages(outputPath);
      expect(images.length).toBeGreaterThanOrEqual(2);
      const text = readPdfText(outputPath);
      expect(text).toContain('MARK_TITLE');
      expect(text).toContain('MARK_END');
      expect(text).not.toContain('graph LR');
      expect(text).not.toContain('"chartType"');
      expect(findOverflowingWords(readPdfWords(outputPath), 4)).toEqual([]);
      for (const image of images) {
        expect(image.width).toBeLessThanOrEqual(A4_WIDTH_PT * 4);
      }
    } finally {
      await closeDokuApp(run.app);
    }
  });
});
