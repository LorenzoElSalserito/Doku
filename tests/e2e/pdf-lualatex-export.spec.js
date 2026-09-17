const { promises: fs } = require('node:fs');
const { join } = require('node:path');
const { expect, test } = require('@playwright/test');
const {
  cleanupDokuE2EContext,
  closeDokuApp,
  createDokuE2EContext,
  createMarkdownFile,
  hasLatexExportRuntime,
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
  readPdfFonts,
  readPdfPageCount,
  readPdfPageSize,
  readPdfText,
  readPdfWords,
  textBandForPage,
} = require('./helpers/pdfAudit.cjs');

const STRESS_MARKDOWN_PATH = join(__dirname, 'fixtures/a4-stress.md');

/** Exports the open document with the typographic (LuaLaTeX) profile. */
async function exportLatexPdf(page, outputPath) {
  await page.getByRole('button', { name: 'Export' }).click();
  const profiles = page.getByRole('tablist', { name: 'PDF profile' });
  await profiles.waitFor({ state: 'visible' });
  await profiles.getByRole('tab', { name: 'Typographic' }).click();
  await page.getByRole('button', { name: 'Export PDF', exact: true }).click();

  await expect(page.getByText('Export completed')).toBeVisible({ timeout: 180_000 });
  await expect(page.getByText(outputPath)).toBeVisible();
}

test.describe('A4 PDF export (typographic / LuaLaTeX profile)', () => {
  let context;
  let markdown;

  test.skip(!hasLatexExportRuntime(), 'Pandoc/LuaLaTeX runtime is not installed.');
  test.skip(!hasPdfTools(), 'poppler-utils is required to audit the PDF.');

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

  test('keeps every element inside the A4 text band: wide tables, code, long words', async () => {
    test.setTimeout(240_000);

    const documentPath = await createMarkdownFile(context, 'stress.md', markdown);
    const outputPath = join(context.rootDir, 'stress-latex.pdf');
    const run = await launchDokuApp(context, documentPath);

    try {
      await stubSaveDialog(run.app, outputPath);
      await exportLatexPdf(run.page, outputPath);

      const size = readPdfPageSize(outputPath);
      expect(size.width).toBeCloseTo(A4_WIDTH_PT, 0);
      expect(size.height).toBeCloseTo(A4_HEIGHT_PT, 0);
      expect(readPdfPageCount(outputPath)).toBeGreaterThan(1);

      // Nothing lost: every marker survives, including cells of the 8- and
      // 14-column tables and the unbreakable tokens.
      const pdfText = readPdfText(outputPath);
      const words = readPdfWords(outputPath);
      expect(findMissingMarkers(markdown, pdfText, words)).toEqual([]);

      // Nothing clipped: every glyph sits inside its page's binding-safe band
      // (microtype's optical margin alignment may protrude a hyphen by ~2.5pt).
      expect(words.length).toBeGreaterThan(100);
      expect(
        findOverflowingWords(words, 4).map((word) => ({
          page: word.page,
          text: word.text,
          xMax: Number(word.xMax.toFixed(1)),
          band: textBandForPage(word.page),
        })),
      ).toEqual([]);

      // The long table repeats its header across pages (longtable).
      const headerPages = new Set(
        words.filter((word) => word.text.includes('MARK_TH_REPEAT')).map((word) => word.page),
      );
      expect(headerPages.size).toBeGreaterThanOrEqual(2);
    } finally {
      await closeDokuApp(run.app);
    }
  });

  test('renders bold with the bundled variable font and keeps the document font', async () => {
    test.setTimeout(180_000);

    const short = [
      '# Titolo MARK_T',
      '',
      'Testo con **grassetto MARK_B** e `codice MARK_C`.',
      '',
      '> Citazione MARK_Q',
      '',
      '```',
      'riga di codice lunghissima che deve andare a capo senza uscire dalla pagina MARK_CODE_LONG_' +
        'x'.repeat(120),
      '```',
      '',
    ].join('\n');

    const documentPath = await createMarkdownFile(context, 'short.md', short);
    const outputPath = join(context.rootDir, 'short-latex.pdf');
    const run = await launchDokuApp(context, documentPath);

    try {
      await stubSaveDialog(run.app, outputPath);
      await exportLatexPdf(run.page, outputPath);

      const fonts = readPdfFonts(outputPath);
      // Default typography is the unified Inter (variable) for body, headings
      // and code — like the preview: the regular face plus at least one
      // synthesised instance (bold weight) must be embedded.
      expect(fonts.some((name) => /Inter/.test(name))).toBe(true);
      expect(fonts.filter((name) => /Inter/.test(name)).length).toBeGreaterThanOrEqual(2);

      const pdfText = readPdfText(outputPath);
      expect(findMissingMarkers(short, pdfText)).toEqual([]);
      expect(findOverflowingWords(readPdfWords(outputPath), 4)).toEqual([]);
    } finally {
      await closeDokuApp(run.app);
    }
  });
});
