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
  hasPdfTools,
  readPdfFonts,
  readPdfPageSize,
  readPdfWords,
} = require('./helpers/pdfAudit.cjs');

/**
 * The web/print (WeasyPrint) PDF must be the printed twin of the preview
 * page: same type scale, same fonts, same A4 sheet with the preview's
 * binding margins.
 */

const SAMPLE = [
  '# Titolo MARK_H1',
  '',
  'Paragrafo del corpo MARK_BODY con **grassetto** e `codice MARK_CODE`.',
  '',
  '## Sezione MARK_H2',
  '',
  '### Sottosezione MARK_H3',
  '',
  '> Citazione MARK_Q',
  '',
  '| A | B |',
  '| --- | --- |',
  '| MARK_CELL | 2 |',
  '',
].join('\n');

async function exportWeasyPdf(page, outputPath) {
  await page.getByRole('button', { name: 'Export' }).click();
  const profiles = page.getByRole('tablist', { name: 'PDF profile' });
  await profiles.waitFor({ state: 'visible' });
  await profiles.getByRole('tab', { name: 'Web/print' }).click();
  await page.getByRole('button', { name: 'Export PDF', exact: true }).click();
  await expect(page.getByText('Export completed')).toBeVisible({ timeout: 120_000 });
}

function wordHeight(words, marker) {
  const word = words.find((entry) => entry.text.includes(marker));
  if (!word) {
    throw new Error(`Marker ${marker} not found in the PDF`);
  }
  return word.yMax - word.yMin;
}

test.describe('preview ↔ web/print PDF parity', () => {
  let context;

  test.skip(!hasWeasyExportRuntime(), 'WeasyPrint runtime or Pandoc is not installed.');
  test.skip(!hasPdfTools(), 'poppler-utils is required to audit the PDF.');

  test.beforeEach(async () => {
    context = createDokuE2EContext();
    await prepareDokuProfile(context, {
      workspaceViewMode: 'preview',
      typography: {
        profile: 'professional',
        uiFontFamily: 'Lora',
        pdfFontFamily: 'Lora',
        monospaceFontFamily: 'Lora',
        accessibilityFontFamily: 'Lora',
        accessibilityMode: false,
      },
    });
  });

  test.afterEach(async () => {
    await cleanupDokuE2EContext(context);
  });

  test('type scale, fonts and page geometry match the preview page', async () => {
    test.setTimeout(180_000);

    const documentPath = await createMarkdownFile(context, 'parity.md', SAMPLE);
    const outputPath = join(context.rootDir, 'parity.pdf');
    const run = await launchDokuApp(context, documentPath);

    try {
      const { page } = run;
      await page.getByRole('group', { name: 'Preview zoom' }).waitFor({ state: 'visible' });

      // Preview facts: font sizes relative to the body, fonts, page geometry.
      const preview = await page.evaluate(() => {
        const px = (selector) =>
          parseFloat(getComputedStyle(document.querySelector(selector)).fontSize);
        const body = px('.markdown-preview__paragraph');
        const pageElement = document.querySelector('.markdown-preview');
        const style = getComputedStyle(pageElement);
        return {
          h1Ratio: px('.markdown-preview__heading--1') / body,
          h2Ratio: px('.markdown-preview__heading--2') / body,
          h3Ratio: px('.markdown-preview__heading--3') / body,
          bodyFont: getComputedStyle(document.querySelector('.markdown-preview__paragraph')).fontFamily,
          pageWidthPx: pageElement.getBoundingClientRect().width,
          paddingLeft: style.paddingLeft,
          paddingRight: style.paddingRight,
          paddingTop: style.paddingTop,
        };
      });
      expect(preview.h1Ratio).toBeCloseTo(2.2, 1);
      expect(preview.h2Ratio).toBeCloseTo(1.55, 1);
      expect(preview.h3Ratio).toBeCloseTo(1.25, 1);
      expect(preview.bodyFont).toMatch(/Lora/);
      // A4 sheet at 96 dpi: 794 px wide; 26 mm / 16 mm / 20 mm margins.
      expect(preview.pageWidthPx).toBeCloseTo(794, 0);
      expect(parseFloat(preview.paddingLeft)).toBeCloseTo((26 / 25.4) * 96, 0);
      expect(parseFloat(preview.paddingRight)).toBeCloseTo((16 / 25.4) * 96, 0);
      expect(parseFloat(preview.paddingTop)).toBeCloseTo((20 / 25.4) * 96, 0);

      await stubSaveDialog(run.app, outputPath);
      await exportWeasyPdf(page, outputPath);

      // PDF facts.
      const size = readPdfPageSize(outputPath);
      expect(size.width).toBeCloseTo(A4_WIDTH_PT, 0);
      expect(size.height).toBeCloseTo(A4_HEIGHT_PT, 0);

      const words = readPdfWords(outputPath);
      const body = wordHeight(words, 'MARK_BODY');
      // Glyph boxes scale with the font size: the same 2.2 / 1.55 / 1.25 scale.
      expect(wordHeight(words, 'MARK_H1') / body).toBeCloseTo(preview.h1Ratio, 0);
      expect(wordHeight(words, 'MARK_H2') / body).toBeCloseTo(preview.h2Ratio, 0);
      expect(wordHeight(words, 'MARK_H3') / body).toBeCloseTo(preview.h3Ratio, 0);
      expect(wordHeight(words, 'MARK_H1') / body).toBeGreaterThan(1.9);
      expect(wordHeight(words, 'MARK_H1') / body).toBeLessThan(2.5);

      // Same left edge as the preview page: 26 mm binding gutter on page 1.
      const leftEdge = Math.min(...words.filter((word) => word.page === 1).map((word) => word.xMin));
      expect(leftEdge).toBeCloseTo((26 / 25.4) * 72, -1);

      // The chosen font (Lora) is embedded — the PDF uses the preview's font.
      const fonts = readPdfFonts(outputPath);
      expect(fonts.some((name) => /Lora/.test(name))).toBe(true);
    } finally {
      await closeDokuApp(run.app);
    }
  });
});
