const { expect, test } = require('@playwright/test');
const {
  cleanupDokuE2EContext,
  closeDokuApp,
  createDokuE2EContext,
  createMarkdownFile,
  launchDokuApp,
  prepareDokuProfile,
} = require('./helpers/dokuApp.cjs');

const SAMPLE = ['# Titolo', '', 'Paragrafo di prova.', ''].join('\n');

/** Parses "rgb(r, g, b)" / "rgba(r, g, b, a)" into a relative luminance. */
function luminance(color) {
  const match = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(color);
  if (!match) {
    throw new Error(`Unexpected color value: ${color}`);
  }
  const [red, green, blue] = match.slice(1).map(Number);
  return (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;
}

async function readPreviewColors(page) {
  return page.evaluate(() => {
    const styles = window.getComputedStyle(document.querySelector('.markdown-preview'));
    return {
      background: styles.backgroundColor,
      text: styles.color,
      theme: document.documentElement.dataset.theme,
      paneClasses: document.querySelector('.workspace__editor-pane--preview').className,
    };
  });
}

async function expectDarkPreview(page) {
  await expect
    .poll(async () => (await readPreviewColors(page)).paneClasses)
    .toContain('workspace__editor-pane--preview-inverted');
  const colors = await readPreviewColors(page);
  expect(luminance(colors.background)).toBeLessThan(0.2);
  expect(luminance(colors.text)).toBeGreaterThan(0.8);
}

async function expectLightPreview(page) {
  await expect
    .poll(async () => (await readPreviewColors(page)).paneClasses)
    .not.toContain('workspace__editor-pane--preview-inverted');
  const colors = await readPreviewColors(page);
  expect(luminance(colors.background)).toBeGreaterThan(0.8);
  expect(luminance(colors.text)).toBeLessThan(0.3);
}

async function selectTheme(page, name) {
  await page.getByRole('button', { name: 'Preferences' }).click();
  const themes = page.getByRole('tablist', { name: 'Theme' });
  await themes.waitFor({ state: 'visible' });
  await themes.getByRole('tab', { name }).click();
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await expect.poll(async () => (await readPreviewColors(page)).theme).toBe(name.toLowerCase());
}

test.describe('preview follows the app theme', () => {
  let context;

  test.afterEach(async () => {
    await cleanupDokuE2EContext(context);
  });

  test('opens inverted when the app theme is dark', async () => {
    context = createDokuE2EContext();
    await prepareDokuProfile(context, { workspaceViewMode: 'preview', theme: 'dark' });
    const documentPath = await createMarkdownFile(context, 'sample.md', SAMPLE);
    const run = await launchDokuApp(context, documentPath);

    try {
      const zoomBar = run.page.getByRole('group', { name: 'Preview zoom' });
      await zoomBar.waitFor({ state: 'visible' });
      await expectDarkPreview(run.page);

      // The button reflects the automatic state instead of fighting it.
      await expect(zoomBar.getByRole('button', { name: 'Restore preview colours' })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
    } finally {
      await closeDokuApp(run.app);
    }
  });

  test('switches with the theme while the preview stays open', async () => {
    context = createDokuE2EContext();
    await prepareDokuProfile(context, { workspaceViewMode: 'preview', theme: 'light' });
    const documentPath = await createMarkdownFile(context, 'sample.md', SAMPLE);
    const run = await launchDokuApp(context, documentPath);

    try {
      await run.page.getByRole('group', { name: 'Preview zoom' }).waitFor({ state: 'visible' });
      await expectLightPreview(run.page);

      await selectTheme(run.page, 'Dark');
      await expectDarkPreview(run.page);

      await selectTheme(run.page, 'Light');
      await expectLightPreview(run.page);
    } finally {
      await closeDokuApp(run.app);
    }
  });

  test('a theme change takes over a manual inversion', async () => {
    context = createDokuE2EContext();
    await prepareDokuProfile(context, { workspaceViewMode: 'preview', theme: 'light' });
    const documentPath = await createMarkdownFile(context, 'sample.md', SAMPLE);
    const run = await launchDokuApp(context, documentPath);

    try {
      const zoomBar = run.page.getByRole('group', { name: 'Preview zoom' });
      await zoomBar.waitFor({ state: 'visible' });

      // Manual override on a light theme: dark preview.
      await zoomBar.getByRole('button', { name: 'Invert preview colours' }).click();
      await expectDarkPreview(run.page);

      // Switching to dark keeps it dark (the override is dropped, the theme wins)…
      await selectTheme(run.page, 'Dark');
      await expectDarkPreview(run.page);

      // …and going back to light restores the paper page, override included.
      await selectTheme(run.page, 'Light');
      await expectLightPreview(run.page);
    } finally {
      await closeDokuApp(run.app);
    }
  });
});
