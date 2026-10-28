const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { spawnSync } = require('node:child_process');
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
  findMissingMarkers,
  findOverflowingWords,
  hasPdfTools,
  readPdfPageCount,
  readPdfText,
  readPdfWords,
} = require('./helpers/pdfAudit.cjs');

/**
 * Both PDF profiles must be the printed twin of the preview page: a realistic
 * document (tables of every width, task lists, nested lists, code, footnote)
 * exports with no clipped text, no word split across lines inside a table
 * that fits, the same column proportions as the preview, and real ink on the
 * page (a regression once turned the whole body near-white).
 */

const FIDELITY = readFileSync(join(__dirname, 'fixtures', 'fidelity.md'), 'utf-8');

// Words that must stay whole in every rendering: the table layout gives each
// column at least the width of its longest token.
const WHOLE_WORDS = [
  'Settembre',
  'Pianificato',
  'Packaging',
  'Certificato',
  '2026-11-15',
  'incrementale',
];

const PROFILES = [
  { tab: 'Typographic', name: 'lualatex', available: hasLatexExportRuntime },
  { tab: 'Web/print', name: 'weasy', available: hasWeasyExportRuntime },
];

async function exportPdf(page, profileTab) {
  await page.getByRole('button', { name: 'Export' }).click();
  const profiles = page.getByRole('tablist', { name: 'PDF profile' });
  await profiles.waitFor({ state: 'visible' });
  await profiles.getByRole('tab', { name: profileTab }).click();
  await page.getByRole('button', { name: 'Export PDF', exact: true }).click();
  await expect(page.getByText('Export completed')).toBeVisible({ timeout: 180_000 });
  await page.keyboard.press('Escape');
}

/** Fraction of dark pixels on the first page: a faint-text regression gives ~0. */
function measureInk(pdfPath, outDir) {
  const prefix = join(outDir, 'ink');
  const render = spawnSync('pdftoppm', [
    '-r',
    '40',
    '-f',
    '1',
    '-l',
    '1',
    '-gray',
    pdfPath,
    prefix,
  ]);
  if (render.status !== 0) {
    throw new Error(`pdftoppm failed: ${render.stderr}`);
  }
  const file = require('node:fs')
    .readdirSync(outDir)
    .find((name) => name.startsWith('ink') && name.endsWith('.pgm'));
  const bytes = readFileSync(join(outDir, file));
  // Binary PGM: "P5\n<w> <h>\n255\n" followed by one byte per pixel.
  let headerEnd = 0;
  let fields = 0;
  while (fields < 4 && headerEnd < bytes.length) {
    if (/\s/.test(String.fromCharCode(bytes[headerEnd]))) {
      fields += 1;
      while (headerEnd + 1 < bytes.length && /\s/.test(String.fromCharCode(bytes[headerEnd + 1])))
        headerEnd += 1;
    }
    headerEnd += 1;
  }
  let dark = 0;
  for (let index = headerEnd; index < bytes.length; index += 1) {
    if (bytes[index] < 140) dark += 1;
  }
  return dark / (bytes.length - headerEnd);
}

/** Header cell x-positions of the seven column table as fractions of its width. */
async function previewColumnFractions(page) {
  return page.evaluate(() => {
    const tables = [...document.querySelectorAll('.markdown-preview__table')];
    const table = tables.find((candidate) => candidate.querySelectorAll('th').length === 7);
    const rect = table.getBoundingClientRect();
    return [...table.querySelectorAll('th')].map(
      (cell) => (cell.getBoundingClientRect().left - rect.left) / rect.width,
    );
  });
}

/**
 * Header cell x-positions of the seven column table in the PDF, as fractions
 * of the table width. The header row is located through its first label
 * ("Requisito"); the other cells are the words on that row, left to right,
 * whatever chunks a narrow header label was wrapped into.
 */
function pdfColumnFractions(words) {
  const first = words.find((entry) => entry.text === 'Requisito');
  if (!first) throw new Error('Header "Requisito" not found in the PDF');
  const lineHeight = first.yMax - first.yMin;
  const sameRow = words.filter(
    (entry) =>
      entry.page === first.page &&
      Math.abs(entry.yMin - first.yMin) < lineHeight * 0.6 &&
      entry.xMin >= first.xMin - 1,
  );
  const cells = sameRow.sort((a, b) => a.xMin - b.xMin);
  // Keep one word per column: a header that wrapped ("Respo" / "nsabile")
  // still starts a column with its first chunk on this row.
  const starts = [];
  for (const word of cells) {
    if (starts.length === 0 || word.xMin - starts[starts.length - 1].xMin > lineHeight) {
      starts.push(word);
    }
  }
  if (starts.length !== 7) {
    throw new Error(
      `Expected 7 header cells, found ${starts.length}: ${starts.map((w) => w.text).join(' | ')}`,
    );
  }
  const left = starts[0].xMin;
  const right = Math.max(...words.filter((w) => w.page === first.page).map((w) => w.xMax));
  return starts.map((word) => (word.xMin - left) / (right - left));
}

test.describe('PDF fidelity with the preview', () => {
  let context;

  test.skip(!hasPdfTools(), 'poppler-utils is required to audit the PDF.');

  test.beforeEach(async () => {
    context = createDokuE2EContext();
    await prepareDokuProfile(context, { workspaceViewMode: 'preview' });
  });

  test.afterEach(async () => {
    await cleanupDokuE2EContext(context);
  });

  for (const profile of PROFILES) {
    test(`${profile.name}: tables fit the page, words stay whole, columns match the preview`, async () => {
      test.skip(!profile.available(), `${profile.name} runtime is not installed.`);
      test.setTimeout(300_000);

      const documentPath = await createMarkdownFile(context, 'fidelity.md', FIDELITY);
      const outputPath = join(context.rootDir, `${profile.name}.pdf`);
      const run = await launchDokuApp(context, documentPath);

      try {
        const { page } = run;
        await page.getByRole('group', { name: 'Preview zoom' }).waitFor({ state: 'visible' });
        await expect(page.locator('.markdown-preview__visual svg')).toBeVisible({
          timeout: 30_000,
        });
        const previewFractions = await previewColumnFractions(page);

        await stubSaveDialog(run.app, outputPath);
        await exportPdf(page, profile.tab);

        const text = readPdfText(outputPath);
        const words = readPdfWords(outputPath);
        expect(readPdfPageCount(outputPath)).toBeGreaterThanOrEqual(3);

        // Nothing clipped, nothing lost.
        expect(findOverflowingWords(words)).toEqual([]);
        expect(findMissingMarkers(FIDELITY, text, words)).toEqual([]);

        // Words in fitting columns are never split across lines.
        for (const word of WHOLE_WORDS) {
          expect(
            words.some((entry) => entry.text.replace(/[.,;:]$/, '') === word),
            `${word} whole`,
          ).toBe(true);
        }

        // Task boxes and footnotes are rendered (no raw markers in the text).
        expect(text).not.toMatch(/\[[ x]\] /);
        expect(text).not.toContain('[^1]');
        expect(text).toContain('MARK_FOOTNOTE');

        // Real ink on the page.
        expect(measureInk(outputPath, context.rootDir)).toBeGreaterThan(0.008);

        // The seven column table has the preview's proportions.
        const pdfFractions = pdfColumnFractions(words);
        for (let index = 1; index < previewFractions.length; index += 1) {
          expect(
            Math.abs(pdfFractions[index] - previewFractions[index]),
            `column ${index}`,
          ).toBeLessThan(0.05);
        }
      } finally {
        await closeDokuApp(run.app);
      }
    });
  }
});
