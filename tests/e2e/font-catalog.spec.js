const { expect, test } = require('@playwright/test');
const {
  cleanupDokuE2EContext,
  closeDokuApp,
  createDokuE2EContext,
  createMarkdownFile,
  launchDokuApp,
  prepareDokuProfile,
  readSettings,
} = require('./helpers/dokuApp.cjs');

/**
 * The bundled font catalog: every family is selectable, and choosing one loads
 * the glyphs from the app bundle (no system font, no network) and applies them
 * to the interface, the editor and the preview.
 */

const NEW_FAMILIES = [
  'Source Sans 3',
  'Work Sans',
  'Nunito',
  'Manrope',
  'EB Garamond',
  'Crimson Pro',
  'Playfair Display',
  'Source Code Pro',
  'Inconsolata',
  'Lexend',
  'Noto Sans',
  'Montserrat',
  'Raleway',
  'Rubik',
  'Karla',
  'Public Sans',
  'Outfit',
  'DM Sans',
  'Figtree',
  'Noto Serif',
  'Literata',
  'Bitter',
  'Alegreya',
  'Vollkorn',
  'Newsreader',
  'Cormorant Garamond',
  'Red Hat Mono',
  'Atkinson Hyperlegible Next',
];

async function readFontState(page, family) {
  return page.evaluate(async (name) => {
    await document.fonts.ready;
    const loaded = [...document.fonts].filter((face) => face.family.replace(/^"|"$/g, '') === name);
    const bodyFamily = getComputedStyle(document.body).fontFamily;
    const preview = document.querySelector('.markdown-preview');
    return {
      loadedFaces: loaded.length,
      loadedStatus: loaded.map((face) => face.status),
      bodyFamily,
      previewFamily: preview ? getComputedStyle(preview).fontFamily : null,
      check: document.fonts.check(`16px "${name}"`),
    };
  }, family);
}

test.describe('bundled font catalog', () => {
  let context;

  test.beforeEach(async () => {
    context = createDokuE2EContext();
    await prepareDokuProfile(context, { workspaceViewMode: 'split' });
  });

  test.afterEach(async () => {
    await cleanupDokuE2EContext(context);
  });

  test('lists all 42 families with localised descriptions in Preferences', async () => {
    const documentPath = await createMarkdownFile(context, 'font.md', '# Font\n\nTesto di prova.');
    const run = await launchDokuApp(context, documentPath);

    try {
      const { page } = run;
      await page.getByRole('button', { name: 'Preferences' }).click();
      const select = page.locator('#settings-font-family');
      await select.waitFor({ state: 'visible' });
      const options = await select.locator('option').allTextContents();
      expect(options).toHaveLength(42);
      for (const family of NEW_FAMILIES) {
        expect(options).toContain(family);
      }

      // The specimen under the select is localised copy, not the catalog's raw text.
      await select.selectOption('Playfair Display');
      const preview = page.locator('.font-select-preview').first();
      await expect(preview).toHaveText('Editorial long-form prose');
      await expect(preview).toHaveCSS('font-family', /Playfair Display/);
    } finally {
      await closeDokuApp(run.app);
    }
  });

  test('applies a newly bundled font to the interface and preview from the app bundle', async () => {
    const documentPath = await createMarkdownFile(context, 'font.md', '# Font\n\nTesto di prova.');
    const run = await launchDokuApp(context, documentPath);

    try {
      const { page } = run;
      await page.getByRole('button', { name: 'Preferences' }).click();
      const select = page.locator('#settings-font-family');
      await select.waitFor({ state: 'visible' });
      await select.selectOption('Lexend');
      await expect
        .poll(async () => (await readSettings(context)).typography.uiFontFamily)
        .toBe('Lexend');
      await page.getByRole('button', { name: 'Done', exact: true }).click();

      await expect.poll(async () => (await readFontState(page, 'Lexend')).check).toBe(true);
      const state = await readFontState(page, 'Lexend');
      expect(state.loadedFaces).toBeGreaterThan(0);
      expect(state.loadedStatus).toContain('loaded');
      expect(state.bodyFamily).toMatch(/Lexend/);
      expect(state.previewFamily).toMatch(/Lexend/);

      // The glyphs come from the bundled @font-face, never from a remote host.
      const remoteFonts = await page.evaluate(() =>
        performance
          .getEntriesByType('resource')
          .map((entry) => entry.name)
          .filter((name) => /^https?:/i.test(name)),
      );
      expect(remoteFonts).toEqual([]);
    } finally {
      await closeDokuApp(run.app);
    }
  });

  test('every new family resolves to a loadable bundled face', async () => {
    const documentPath = await createMarkdownFile(context, 'font.md', '# Font\n\nTesto di prova.');
    const run = await launchDokuApp(context, documentPath);

    try {
      const { page } = run;
      const results = await page.evaluate(async (families) => {
        const out = {};
        for (const family of families) {
          try {
            const faces = await document.fonts.load(`16px "${family}"`);
            out[family] = faces.length > 0 && document.fonts.check(`16px "${family}"`);
          } catch (error) {
            out[family] = `error: ${String(error)}`;
          }
        }
        return out;
      }, NEW_FAMILIES);
      for (const family of NEW_FAMILIES) {
        expect(results[family], family).toBe(true);
      }
    } finally {
      await closeDokuApp(run.app);
    }
  });
});
