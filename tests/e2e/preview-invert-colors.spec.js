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

const SAMPLE = [
  '# Titolo',
  '',
  'Paragrafo di prova con un [link](https://example.com).',
  '',
  '| A | B |',
  '| --- | --- |',
  '| 1 | 2 |',
  '',
  '```js',
  'const x = 1;',
  '```',
  '',
  '> Citazione',
  '',
].join('\n');

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
    const page_ = document.querySelector('.markdown-preview');
    const code = document.querySelector('.markdown-preview__code');
    const table = document.querySelector('.markdown-preview__table th');
    const quote = document.querySelector('.markdown-preview__quote');
    const styles = window.getComputedStyle(page_);
    return {
      background: styles.backgroundColor,
      text: styles.color,
      codeBackground: code ? window.getComputedStyle(code).backgroundColor : null,
      tableHeaderBackground: table ? window.getComputedStyle(table).backgroundColor : null,
      quoteBackground: quote ? window.getComputedStyle(quote).backgroundColor : null,
      paneClasses: document.querySelector('.workspace__editor-pane--preview').className,
    };
  });
}

test.describe('preview colour inversion', () => {
  let context;

  test.beforeEach(async () => {
    context = createDokuE2EContext();
    await prepareDokuProfile(context, { workspaceViewMode: 'preview' });
  });

  test.afterEach(async () => {
    await cleanupDokuE2EContext(context);
  });

  test('inverts page and text colours, then restores them', async () => {
    const documentPath = await createMarkdownFile(context, 'sample.md', SAMPLE);
    const run = await launchDokuApp(context, documentPath);

    try {
      const zoomBar = run.page.getByRole('group', { name: 'Preview zoom' });
      await zoomBar.waitFor({ state: 'visible' });
      await expect(run.page.locator('.markdown-preview')).toBeVisible();

      const normal = await readPreviewColors(run.page);
      // Default printed page: dark ink on light paper.
      expect(luminance(normal.background)).toBeGreaterThan(0.8);
      expect(luminance(normal.text)).toBeLessThan(0.3);
      expect(normal.paneClasses).not.toContain('workspace__editor-pane--preview-inverted');

      await zoomBar.getByRole('button', { name: 'Invert preview colours' }).click();

      const inverted = await readPreviewColors(run.page);
      expect(luminance(inverted.background)).toBeLessThan(0.2);
      expect(luminance(inverted.text)).toBeGreaterThan(0.8);
      expect(inverted.paneClasses).toContain('workspace__editor-pane--preview-inverted');

      // Secondary surfaces follow the inversion, so nothing stays unreadable.
      expect(luminance(inverted.codeBackground)).toBeLessThan(0.3);
      expect(luminance(inverted.tableHeaderBackground)).toBeLessThan(0.3);
      expect(luminance(inverted.quoteBackground)).toBeLessThan(0.3);

      const restore = zoomBar.getByRole('button', { name: 'Restore preview colours' });
      await expect(restore).toHaveAttribute('aria-pressed', 'true');
      await restore.click();

      const restored = await readPreviewColors(run.page);
      expect(restored.background).toBe(normal.background);
      expect(restored.text).toBe(normal.text);
      expect(restored.codeBackground).toBe(normal.codeBackground);
      expect(restored.paneClasses).not.toContain('workspace__editor-pane--preview-inverted');
    } finally {
      await closeDokuApp(run.app);
    }
  });

  test('keeps zoom, content and document state working while inverted', async () => {
    const documentPath = await createMarkdownFile(context, 'sample.md', SAMPLE);
    const run = await launchDokuApp(context, documentPath);

    try {
      const zoomBar = run.page.getByRole('group', { name: 'Preview zoom' });
      await zoomBar.waitFor({ state: 'visible' });

      await zoomBar.getByRole('button', { name: 'Invert preview colours' }).click();
      await zoomBar.getByRole('button', { name: 'Zoom in' }).click();

      await expect(zoomBar.getByRole('button', { name: 'Reset zoom' })).toHaveText('110%');
      await expect(run.page.locator('.workspace__preview-zoom')).toHaveAttribute(
        'style',
        /zoom: 1\.1/,
      );

      // Content is still rendered, not hidden behind the inversion.
      await expect(run.page.locator('.markdown-preview__heading--1')).toHaveText('Titolo');
      await expect(run.page.locator('.markdown-preview__table td').first()).toHaveText('1');

      // The inversion is a view-only toggle: it must not be written to settings.
      const settings = await readSettings(context);
      expect(JSON.stringify(settings)).not.toContain('Inverted');
      expect(settings.workspaceViewMode).toBe('preview');
    } finally {
      await closeDokuApp(run.app);
    }
  });

  test('is offered only in the full preview view', async () => {
    const documentPath = await createMarkdownFile(context, 'sample.md', SAMPLE);
    const run = await launchDokuApp(context, documentPath);

    try {
      await run.page.getByRole('group', { name: 'Preview zoom' }).waitFor({ state: 'visible' });
      await expect(
        run.page.getByRole('button', { name: 'Invert preview colours' }),
      ).toBeVisible();

      // Switching to split view removes the zoom bar and the invert toggle.
      await run.page.getByRole('tab', { name: 'Split' }).click();
      await expect(
        run.page.getByRole('button', { name: 'Invert preview colours' }),
      ).toHaveCount(0);
      await expect(run.page.getByRole('group', { name: 'Preview zoom' })).toHaveCount(0);

      // Back to preview: the toggle returns in its default (non-inverted) state.
      await run.page.getByRole('tab', { name: 'Preview' }).click();
      const toggle = run.page.getByRole('button', { name: 'Invert preview colours' });
      await expect(toggle).toBeVisible();
      await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    } finally {
      await closeDokuApp(run.app);
    }
  });
});
