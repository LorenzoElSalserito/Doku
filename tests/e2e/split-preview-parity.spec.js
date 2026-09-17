const { expect, test } = require('@playwright/test');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const {
  cleanupDokuE2EContext,
  closeDokuApp,
  createDokuE2EContext,
  createMarkdownFile,
  launchDokuApp,
  prepareDokuProfile,
} = require('./helpers/dokuApp.cjs');

/**
 * Split and Preview must render the document the same way: identical
 * typography and block styling, and wide tables that shrink to the column
 * (wrapping cell text) instead of being clipped behind a horizontal scrollbar.
 */

const STRESS = readFileSync(join(__dirname, 'fixtures', 'a4-stress.md'), 'utf-8');

const SAMPLE = [
  '# Parità',
  '',
  'Paragrafo con `codice inline`, **grassetto** e un [link](https://example.com).',
  '',
  '## Sezione',
  '',
  '> Citazione su una riga',
  '',
  '- uno',
  '- due',
  '',
  '1. primo',
  '2. secondo',
  '',
  '```js',
  'const riga = "molto lunga ".repeat(40);',
  '```',
  '',
  '---',
  '',
  '| A | B | C |',
  '| --- | --- | --- |',
  '| 1 | 2 | 3 |',
  '',
].join('\n');

/** Style facts that must not depend on the view mode. */
async function readRenderingFacts(page) {
  return page.evaluate(() => {
    const pick = (selector, props) => {
      const element = document.querySelector(selector);
      if (!element) {
        return null;
      }
      const style = getComputedStyle(element);
      return Object.fromEntries(props.map((prop) => [prop, style.getPropertyValue(prop)]));
    };
    return {
      root: pick('.markdown-preview', ['font-family', 'font-size', 'line-height']),
      h1: pick('.markdown-preview__heading--1', ['font-size', 'margin-top', 'margin-bottom', 'font-family']),
      h2: pick('.markdown-preview__heading--2', ['font-size', 'border-bottom-width', 'padding-bottom']),
      paragraph: pick('.markdown-preview__paragraph', ['margin-bottom', 'line-height']),
      quote: pick('.markdown-preview__quote', ['padding-left', 'padding-top', 'border-left-width', 'margin-bottom']),
      list: pick('.markdown-preview__list', ['padding-left', 'margin-bottom']),
      code: pick('.markdown-preview__code', ['white-space', 'padding-top', 'border-radius', 'font-family', 'margin-bottom']),
      rule: pick('.markdown-preview__rule', ['margin-top']),
      tableWrap: pick('.markdown-preview__table-wrap', ['overflow-x', 'border-radius', 'margin-bottom']),
      table: pick('.markdown-preview__table', ['table-layout', 'font-size', 'border-collapse']),
      cell: pick('.markdown-preview__table td', ['overflow-wrap', 'word-break', 'padding-top', 'padding-left']),
      th: pick('.markdown-preview__table th', ['font-weight', 'padding-top']),
    };
  });
}

async function readTableGeometry(page) {
  return page.evaluate(() => {
    const pane = document.querySelector('.workspace__preview-scroll');
    const wraps = [...document.querySelectorAll('.markdown-preview__table-wrap')];
    const paneRect = pane.getBoundingClientRect();
    return wraps.map((wrap) => {
      const table = wrap.querySelector('table');
      const headers = [...table.querySelectorAll('th')];
      const rect = wrap.getBoundingClientRect();
      return {
        columns: headers.length,
        wrapScrollWidth: wrap.scrollWidth,
        wrapClientWidth: wrap.clientWidth,
        tableWidth: table.getBoundingClientRect().width,
        wrapWidth: rect.width,
        paneScrollWidth: pane.scrollWidth,
        paneClientWidth: pane.clientWidth,
        headersInsidePane: headers.every((header) => {
          const cell = header.getBoundingClientRect();
          return cell.left >= paneRect.left - 1 && cell.right <= paneRect.right + 1;
        }),
        headerTexts: headers.map((header) => header.textContent.trim()),
      };
    });
  });
}

test.describe('split / preview rendering parity', () => {
  let context;

  test.beforeEach(async () => {
    context = createDokuE2EContext();
  });

  test.afterEach(async () => {
    await cleanupDokuE2EContext(context);
  });

  test('wide tables shrink to the column in Split exactly like in Preview', async () => {
    await prepareDokuProfile(context, {
      workspaceViewMode: 'split',
      workspace: { leftPanelWidth: 280, rightPanelWidth: 340, leftPanelCollapsed: true, rightPanelCollapsed: true },
    });
    const documentPath = await createMarkdownFile(context, 'stress.md', STRESS);
    const run = await launchDokuApp(context, documentPath);

    try {
      const { page } = run;
      await expect(page.locator('.markdown-preview__table').first()).toBeVisible();

      const split = await readTableGeometry(page);
      expect(split.length).toBeGreaterThanOrEqual(3);
      for (const [index, table] of split.entries()) {
        // Every header cell is inside the pane: nothing is clipped or hidden.
        expect(table.headersInsidePane, `split table ${index} headers visible`).toBe(true);
        expect(table.wrapScrollWidth, `split table ${index} no horizontal scroll`).toBeLessThanOrEqual(table.wrapClientWidth + 1);
        expect(table.tableWidth, `split table ${index} fits`).toBeLessThanOrEqual(table.wrapWidth + 1);
      }
      expect(split[0].columns).toBe(8);
      expect(split[1].columns).toBe(14);
      // The pane itself does not scroll sideways either: long URLs and
      // unbreakable words wrap inside the column like in the exported PDF.
      expect(split[0].paneScrollWidth).toBeLessThanOrEqual(split[0].paneClientWidth + 1);
      const overflowing = await page.evaluate(() => {
        const pane = document.querySelector('.workspace__preview-scroll');
        const limit = pane.getBoundingClientRect().right + 1;
        return [...pane.querySelectorAll('.markdown-preview > *')]
          .filter((block) => block.getBoundingClientRect().right > limit || block.scrollWidth > block.clientWidth + 1)
          .map((block) => `${block.tagName}: ${(block.textContent || '').slice(0, 30)}`);
      });
      expect(overflowing).toEqual([]);

      await page.getByRole('tab', { name: 'Preview' }).click();
      await page.getByRole('group', { name: 'Preview zoom' }).waitFor({ state: 'visible' });
      const preview = await readTableGeometry(page);
      expect(preview.map((table) => table.columns)).toEqual(split.map((table) => table.columns));
      expect(preview.map((table) => table.headerTexts)).toEqual(split.map((table) => table.headerTexts));
      for (const [index, table] of preview.entries()) {
        expect(table.headersInsidePane, `preview table ${index} headers visible`).toBe(true);
        expect(table.wrapScrollWidth).toBeLessThanOrEqual(table.wrapClientWidth + 1);
      }
    } finally {
      await closeDokuApp(run.app);
    }
  });

  test('every block type shares the same styling between Split and Preview', async () => {
    await prepareDokuProfile(context, { workspaceViewMode: 'split' });
    const documentPath = await createMarkdownFile(context, 'sample.md', SAMPLE);
    const run = await launchDokuApp(context, documentPath);

    try {
      const { page } = run;
      await expect(page.locator('.markdown-preview__table')).toBeVisible();
      const split = await readRenderingFacts(page);
      for (const [name, facts] of Object.entries(split)) {
        expect(facts, `${name} rendered in split`).not.toBeNull();
      }
      // Split-specific guarantees.
      expect(split.tableWrap['overflow-x']).toBe('visible');
      expect(split.cell['overflow-wrap']).toBe('anywhere');
      expect(split.code['white-space']).toBe('pre-wrap');
      expect(split.table['table-layout']).toBe('auto');

      await page.getByRole('tab', { name: 'Preview' }).click();
      await page.getByRole('group', { name: 'Preview zoom' }).waitFor({ state: 'visible' });
      const preview = await readRenderingFacts(page);

      expect(preview).toEqual(split);
    } finally {
      await closeDokuApp(run.app);
    }
  });

  test('keeps the split preview readable in the dark theme', async () => {
    await prepareDokuProfile(context, { theme: 'dark', workspaceViewMode: 'split' });
    const documentPath = await createMarkdownFile(context, 'sample.md', SAMPLE);
    const run = await launchDokuApp(context, documentPath);

    try {
      const { page } = run;
      await expect(page.locator('.markdown-preview__table')).toBeVisible();
      const colors = await page.evaluate(() => {
        const luminance = (color) => {
          const rgb = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(color);
          if (rgb) {
            const [r, g, b] = rgb.slice(1).map(Number);
            return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
          }
          const srgb = /color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/.exec(color);
          if (srgb) {
            const [r, g, b] = srgb.slice(1).map(Number);
            return 0.2126 * r + 0.7152 * g + 0.0722 * b;
          }
          throw new Error(`Unexpected color: ${color}`);
        };
        const pane = document.querySelector('.workspace__editor-pane--preview');
        const paragraph = document.querySelector('.markdown-preview__paragraph');
        const th = document.querySelector('.markdown-preview__table th');
        const code = document.querySelector('.markdown-preview__code');
        return {
          pane: luminance(getComputedStyle(pane).backgroundColor),
          paragraph: luminance(getComputedStyle(paragraph).color),
          th: luminance(getComputedStyle(th).color),
          codeBg: luminance(getComputedStyle(code).backgroundColor),
        };
      });
      // Dark surface, light ink: the split pane follows the app theme, not the paper page.
      expect(colors.pane).toBeLessThan(0.25);
      expect(colors.paragraph).toBeGreaterThan(0.45);
      expect(colors.th).toBeGreaterThan(0.6);
      expect(colors.codeBg).toBeLessThan(0.3);
    } finally {
      await closeDokuApp(run.app);
    }
  });
});
