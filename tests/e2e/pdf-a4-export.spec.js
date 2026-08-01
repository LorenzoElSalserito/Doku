const { promises: fs } = require('node:fs');
const { join } = require('node:path');
const { expect, test } = require('@playwright/test');
const {
  cleanupDokuE2EContext,
  closeDokuApp,
  createDokuE2EContext,
  createMarkdownFile,
  hasWeasyExportRuntime,
  launchDokuApp,
  prepareDokuProfile,
  stubSaveDialog,
} = require('./helpers/dokuApp.cjs');
const {
  A4_HEIGHT_PT,
  A4_WIDTH_PT,
  findMissingMarkers,
  findOverflowingWords,
  hasPdfTools,
  readPdfPageCount,
  readPdfPageSize,
  readPdfText,
  readPdfWords,
  textBandForPage,
} = require('./helpers/pdfAudit.cjs');

const STRESS_MARKDOWN_PATH = join(__dirname, 'fixtures/a4-stress.md');

/** Exports the open document with the web/print (WeasyPrint) profile. */
async function exportWeasyPdf(page, outputPath) {
  await page.getByRole('button', { name: 'Export' }).click();
  const profiles = page.getByRole('tablist', { name: 'PDF profile' });
  await profiles.waitFor({ state: 'visible' });
  await profiles.getByRole('tab', { name: 'Web/print' }).click();
  await page.getByRole('button', { name: 'Export PDF', exact: true }).click();

  await expect(page.getByText('Export completed')).toBeVisible({ timeout: 120_000 });
  await expect(page.getByText(outputPath)).toBeVisible();
}

test.describe('A4 PDF export (web/print profile)', () => {
  let context;
  let markdown;

  test.skip(!hasWeasyExportRuntime(), 'WeasyPrint runtime or Pandoc is not installed.');
  test.skip(!hasPdfTools(), 'poppler-utils (pdftotext/pdfinfo) is required to audit the PDF.');

  test.beforeAll(async () => {
    markdown = await fs.readFile(STRESS_MARKDOWN_PATH, 'utf-8');
  });

  test.beforeEach(async () => {
    context = createDokuE2EContext();
    await prepareDokuProfile(context, { workspaceViewMode: 'preview' });
  });

  test.afterEach(async () => {
    await cleanupDokuE2EContext(context);
  });

  test('keeps every markdown element inside the binding-safe A4 text band', async () => {
    test.setTimeout(180_000);

    const documentPath = await createMarkdownFile(context, 'stress.md', markdown);
    const outputPath = join(context.rootDir, 'stress.pdf');
    const run = await launchDokuApp(context, documentPath);

    try {
      await stubSaveDialog(run.app, outputPath);
      await exportWeasyPdf(run.page, outputPath);

      const stats = await fs.stat(outputPath);
      expect(stats.size).toBeGreaterThan(1000);

      // Geometry: real A4, more than one page, mirrored binding margins.
      const size = readPdfPageSize(outputPath);
      expect(size.width).toBeCloseTo(A4_WIDTH_PT, 0);
      expect(size.height).toBeCloseTo(A4_HEIGHT_PT, 0);
      expect(readPdfPageCount(outputPath)).toBeGreaterThan(1);

      // No content loss: every marker in the source survives into the PDF.
      const pdfText = readPdfText(outputPath);
      expect(findMissingMarkers(markdown, pdfText)).toEqual([]);

      // No clipping: every glyph box sits inside its page's text band.
      const words = readPdfWords(outputPath);
      expect(words.length).toBeGreaterThan(100);
      expect(
        findOverflowingWords(words).map((word) => ({
          page: word.page,
          text: word.text,
          xMin: Number(word.xMin.toFixed(1)),
          xMax: Number(word.xMax.toFixed(1)),
          band: textBandForPage(word.page),
        })),
      ).toEqual([]);
    } finally {
      await closeDokuApp(run.app);
    }
  });

  test('mirrors the binding gutter between recto and verso pages', async () => {
    test.setTimeout(180_000);

    const documentPath = await createMarkdownFile(context, 'stress.md', markdown);
    const outputPath = join(context.rootDir, 'stress.pdf');
    const run = await launchDokuApp(context, documentPath);

    try {
      await stubSaveDialog(run.app, outputPath);
      await exportWeasyPdf(run.page, outputPath);

      const words = readPdfWords(outputPath);
      const leftEdgeOf = (page) =>
        Math.min(...words.filter((word) => word.page === page).map((word) => word.xMin));

      const recto = leftEdgeOf(1);
      const verso = leftEdgeOf(2);

      // Recto binds on the left (26mm), verso on the left edge is the outer
      // margin (16mm): the gutter is ~10mm (28pt) wider on recto pages.
      expect(recto - verso).toBeGreaterThan(20);
      expect(recto).toBeGreaterThan(70);
      expect(verso).toBeLessThan(50);
    } finally {
      await closeDokuApp(run.app);
    }
  });

  test('repeats the table header when a long table spans pages', async () => {
    test.setTimeout(180_000);

    const documentPath = await createMarkdownFile(context, 'stress.md', markdown);
    const outputPath = join(context.rootDir, 'stress.pdf');
    const run = await launchDokuApp(context, documentPath);

    try {
      await stubSaveDialog(run.app, outputPath);
      await exportWeasyPdf(run.page, outputPath);

      const words = readPdfWords(outputPath);
      const headerPages = new Set(
        words.filter((word) => word.text.includes('MARK_TH_REPEAT')).map((word) => word.page),
      );

      // The long table crosses a page boundary, so its header must be drawn
      // at least twice.
      expect(headerPages.size).toBeGreaterThanOrEqual(2);
    } finally {
      await closeDokuApp(run.app);
    }
  });

  test('exports a short document without losing content either', async () => {
    test.setTimeout(120_000);

    const short = [
      '# Nota breve MARK_SHORT_TITLE',
      '',
      'Paragrafo semplice MARK_SHORT_BODY.',
      '',
      '| A | B |',
      '| --- | --- |',
      '| 1 | MARK_SHORT_CELL |',
      '',
      '```bash',
      'echo "MARK_SHORT_CODE"',
      '```',
      '',
    ].join('\n');

    const documentPath = await createMarkdownFile(context, 'short.md', short);
    const outputPath = join(context.rootDir, 'short.pdf');
    const run = await launchDokuApp(context, documentPath);

    try {
      await stubSaveDialog(run.app, outputPath);
      await exportWeasyPdf(run.page, outputPath);

      expect(readPdfPageCount(outputPath)).toBe(1);
      expect(findMissingMarkers(short, readPdfText(outputPath))).toEqual([]);
      expect(findOverflowingWords(readPdfWords(outputPath))).toEqual([]);
    } finally {
      await closeDokuApp(run.app);
    }
  });
});
