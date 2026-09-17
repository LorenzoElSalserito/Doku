const { expect, test } = require('@playwright/test');
const {
  cleanupDokuE2EContext,
  closeDokuApp,
  createDokuE2EContext,
  createMarkdownFile,
  launchDokuApp,
  prepareDokuProfile,
} = require('./helpers/dokuApp.cjs');

/**
 * The in-app Guide: nine sections with icons, search with a live count,
 * shortcuts as a keyboard table, live rendering of the visual-block examples,
 * the full manual with a sticky outline — and a dialog whose scrollbars stay
 * inside the card.
 */

const SECTION_TITLES = [
  'Quick start',
  'UI tour',
  'Markdown basics',
  'Diagrams and charts',
  'Export to PDF',
  'Typography, theme and zoom',
  'Workspace, panels and data',
  'Shortcuts and rhythm',
  'Markdown manual',
];

async function openGuide(page) {
  await page.getByRole('button', { name: 'Guide' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('heading', { level: 2, name: 'Guide Center' })).toBeVisible();
  return dialog;
}

/** Scroll containers must be the card surfaces, never the transparent <dialog>. */
async function readScrollOwners(page) {
  return page.evaluate(() => {
    const dialog = document.querySelector('dialog[open]');
    const body = dialog.querySelector('.doku-dialog__body');
    const dialogRect = dialog.getBoundingClientRect();
    const bodyRect = body.getBoundingClientRect();
    return {
      dialogScrolls: dialog.scrollHeight > dialog.clientHeight + 1,
      dialogOverflowY: getComputedStyle(dialog).overflowY,
      bodyInsideDialog:
        Math.abs(bodyRect.right - dialogRect.right) < 2 && Math.abs(bodyRect.left - dialogRect.left) < 2,
      contentOverflowY: getComputedStyle(dialog.querySelector('.doku-dialog__content')).overflowY,
    };
  });
}

test.describe('Guide Center', () => {
  let context;

  test.beforeEach(async () => {
    context = createDokuE2EContext();
    await prepareDokuProfile(context, { workspaceViewMode: 'split' });
  });

  test.afterEach(async () => {
    await cleanupDokuE2EContext(context);
  });

  test('lists every section with an icon and switches content on click', async () => {
    const documentPath = await createMarkdownFile(context, 'g.md', '# G\n\nTesto.');
    const run = await launchDokuApp(context, documentPath);

    try {
      const { page } = run;
      const dialog = await openGuide(page);
      const nav = dialog.getByRole('navigation', { name: 'Guide sections' });
      const items = nav.locator('.guide-center__nav-item');
      await expect(items).toHaveCount(SECTION_TITLES.length);
      for (const [index, title] of SECTION_TITLES.entries()) {
        await expect(items.nth(index).locator('.guide-center__nav-title')).toHaveText(title);
        await expect(items.nth(index).locator('svg[data-icon]')).toBeVisible();
      }
      await expect(dialog.getByText('9 sections')).toBeVisible();

      // Markdown basics was previously defined but never shown: now it is.
      await items.nth(2).click();
      await expect(dialog.getByRole('heading', { level: 3, name: 'Markdown basics' })).toBeVisible();
      await expect(dialog.locator('.guide-center__snippet')).toContainText('# Chapter one');
      await expect(dialog.locator('.guide-center__preview-frame .markdown-preview__heading--1')).toHaveText('Chapter one');
      await expect(items.nth(2)).toHaveAttribute('aria-current', 'true');

      // Export section explains both profiles.
      await items.nth(4).click();
      await expect(dialog.getByRole('heading', { level: 3, name: 'Export to PDF' })).toBeVisible();
      await expect(dialog.locator('.guide-center__list li')).toHaveCount(4);
      await expect(dialog.locator('.guide-center__list')).toContainText('LuaLaTeX');
      await expect(dialog.locator('.guide-center__list')).toContainText('WeasyPrint');
    } finally {
      await closeDokuApp(run.app);
    }
  });

  test('renders the shortcuts as a keyboard table and the diagram examples live', async () => {
    const documentPath = await createMarkdownFile(context, 'g.md', '# G');
    const run = await launchDokuApp(context, documentPath);

    try {
      const { page } = run;
      const dialog = await openGuide(page);
      const nav = dialog.getByRole('navigation', { name: 'Guide sections' });

      await nav.getByRole('button', { name: /Shortcuts and rhythm/ }).click();
      const table = dialog.locator('.guide-center__shortcuts');
      await expect(table).toBeVisible();
      await expect(table.locator('tbody tr')).toHaveCount(9);
      await expect(table.locator('kbd').first()).toHaveText('Ctrl/Cmd');
      await expect(table).toContainText('Save the document');
      await expect(table).toContainText('Scroll the preview page');

      await nav.getByRole('button', { name: /Diagrams and charts/ }).click();
      await expect(dialog.getByRole('heading', { level: 3, name: 'Diagrams and charts' })).toBeVisible();
      const preview = dialog.locator('.guide-center__preview-frame');
      await expect(preview.locator('.markdown-preview__visual')).toHaveCount(3);
      await expect
        .poll(
          async () =>
            preview.evaluate(
              (element) =>
                [...element.querySelectorAll('.markdown-preview__visual')].filter(
                  (block) => block.querySelector('svg') && !block.querySelector('.visual-block--loading'),
                ).length,
            ),
          { timeout: 20_000 },
        )
        .toBe(3);
      await expect(dialog.getByRole('button', { name: 'Copy snippet' })).toBeVisible();
    } finally {
      await closeDokuApp(run.app);
    }
  });

  test('search filters sections with a live count and the manual keeps a sticky outline', async () => {
    const documentPath = await createMarkdownFile(context, 'g.md', '# G');
    const run = await launchDokuApp(context, documentPath);

    try {
      const { page } = run;
      const dialog = await openGuide(page);
      const search = dialog.getByLabel('Search the guide');
      await expect(search).toBeFocused();

      await search.fill('WeasyPrint');
      const items = dialog.locator('.guide-center__nav-item');
      await expect(items).toHaveCount(1);
      await expect(dialog.getByText('1 sections')).toBeVisible();
      await expect(dialog.getByRole('heading', { level: 3, name: 'Export to PDF' })).toBeVisible();

      await search.fill('zzzz-nessun-risultato');
      await expect(dialog.getByText('No section matches the current search.').first()).toBeVisible();

      await search.fill('');
      await expect(items).toHaveCount(SECTION_TITLES.length);

      await items.nth(8).click();
      await expect(dialog.getByRole('heading', { level: 3, name: 'Markdown manual' })).toBeVisible();
      const outline = dialog.getByRole('navigation', { name: 'Contents' });
      await expect(outline).toBeVisible();
      await expect(outline.locator('.guide-center__article-link').first()).toHaveText('Summary');
      await expect(dialog.locator('.guide-center__article-index')).toHaveCSS('position', 'sticky');

      // Jumping to a chapter scrolls the article, not the whole dialog.
      await outline.getByRole('button', { name: 'Tables', exact: true }).click();
      await expect
        .poll(async () =>
          dialog.locator('.guide-center__content').evaluate((element) => element.scrollTop),
        )
        .toBeGreaterThan(200);
    } finally {
      await closeDokuApp(run.app);
    }
  });

  test('dialog scrollbars stay inside the card: guide, export and preferences', async () => {
    const documentPath = await createMarkdownFile(context, 'g.md', '# G\n\n' + 'Riga.\n\n'.repeat(40));
    const run = await launchDokuApp(context, documentPath);

    try {
      const { page } = run;
      await page.setViewportSize({ width: 1100, height: 620 });

      await openGuide(page);
      let owners = await readScrollOwners(page);
      expect(owners.dialogScrolls).toBe(false);
      expect(owners.dialogOverflowY).toBe('visible');
      expect(owners.bodyInsideDialog).toBe(true);
      // The guide fills the card: only its two columns scroll, each inside.
      expect(owners.contentOverflowY).toBe('hidden');
      const guideColumns = await page.evaluate(() => ({
        nav: getComputedStyle(document.querySelector('.guide-center__nav')).overflowY,
        content: getComputedStyle(document.querySelector('.guide-center__content')).overflowY,
      }));
      expect(guideColumns).toEqual({ nav: 'auto', content: 'auto' });
      await page.keyboard.press('Escape');

      await page.getByRole('button', { name: 'Export' }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      owners = await readScrollOwners(page);
      expect(owners.dialogScrolls).toBe(false);
      expect(owners.contentOverflowY).toBe('auto');
      await page.keyboard.press('Escape');

      await page.getByRole('button', { name: 'Preferences' }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      owners = await readScrollOwners(page);
      expect(owners.dialogScrolls).toBe(false);
      expect(owners.bodyInsideDialog).toBe(true);
      // A short viewport forces the preferences content to scroll: inside the card.
      const contentScrolls = await page.evaluate(() => {
        const content = document.querySelector('dialog[open] .doku-dialog__content');
        return content.scrollHeight > content.clientHeight;
      });
      expect(contentScrolls).toBe(true);
    } finally {
      await closeDokuApp(run.app);
    }
  });
});
