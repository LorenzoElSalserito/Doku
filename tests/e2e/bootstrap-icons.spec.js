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
 * Every UI glyph is a Bootstrap icon embedded in the renderer bundle: inline
 * `<svg data-icon>` with path data, rendered at a visible size, without any
 * network, font or stylesheet dependency.
 */

const SAMPLE = ['# Icone', '', 'Paragrafo di prova.', ''].join('\n');

/** Reads the Bootstrap icon rendered inside a locator (button, tab, span…). */
async function readIcon(locator) {
  return locator.evaluate((element) => {
    const svg = element.querySelector('svg[data-icon]');
    if (!svg) {
      return null;
    }
    const box = svg.getBoundingClientRect();
    return {
      name: svg.getAttribute('data-icon'),
      viewBox: svg.getAttribute('viewBox'),
      fill: svg.getAttribute('fill'),
      paths: svg.querySelectorAll('path').length,
      width: box.width,
      height: box.height,
      legacySvgs: element.querySelectorAll('svg:not([data-icon])').length,
      externalRefs: element.querySelectorAll('use, image, link').length,
    };
  });
}

async function expectBootstrapIcon(locator, expectedName) {
  await expect(locator).toBeVisible();
  const icon = await readIcon(locator);
  expect(icon, `no Bootstrap icon in ${expectedName ?? 'control'}`).not.toBeNull();
  if (expectedName) {
    expect(icon.name).toBe(expectedName);
  }
  expect(icon.viewBox).toBe('0 0 16 16');
  expect(icon.fill).toBe('currentColor');
  expect(icon.paths).toBeGreaterThan(0);
  expect(icon.width).toBeGreaterThan(8);
  expect(icon.height).toBeGreaterThan(8);
  expect(icon.legacySvgs).toBe(0);
  expect(icon.externalRefs).toBe(0);
  return icon;
}

async function readRendererResourceOrigins(page) {
  return page.evaluate(() => {
    const origins = new Set();
    for (const entry of performance.getEntriesByType('resource')) {
      if (/^https?:/i.test(entry.name)) {
        origins.add(new URL(entry.name).origin);
      }
    }
    for (const node of document.querySelectorAll('link[href], script[src], img[src]')) {
      const value = node.getAttribute('href') ?? node.getAttribute('src') ?? '';
      if (/^(https?:)?\/\//i.test(value)) {
        origins.add(value);
      }
    }
    for (const sheet of document.styleSheets) {
      if (sheet.href && /^https?:/i.test(sheet.href)) {
        origins.add(sheet.href);
      }
    }
    return [...origins];
  });
}

test.describe('embedded Bootstrap icons', () => {
  let context;

  test.beforeEach(async () => {
    context = createDokuE2EContext();
  });

  test.afterEach(async () => {
    await cleanupDokuE2EContext(context);
  });

  test('renders every toolbar and view control with an inline Bootstrap glyph', async () => {
    await prepareDokuProfile(context, { workspaceViewMode: 'split' });
    const documentPath = await createMarkdownFile(context, 'icons.md', SAMPLE);
    const run = await launchDokuApp(context, documentPath);

    try {
      const { page } = run;

      const save = await expectBootstrapIcon(page.getByRole('button', { name: 'Save', exact: true }), 'floppy');
      const saveAs = await expectBootstrapIcon(page.getByRole('button', { name: 'Save as' }), 'copy');
      expect(save.name).not.toBe(saveAs.name);
      await expectBootstrapIcon(page.getByRole('button', { name: 'Export' }), 'file-earmark-pdf');
      await expectBootstrapIcon(page.getByRole('button', { name: 'Guide' }), 'book');
      await expectBootstrapIcon(page.getByRole('button', { name: 'Preferences' }), 'gear');
      await expectBootstrapIcon(page.getByRole('button', { name: 'About' }), 'info-circle');
      await expectBootstrapIcon(page.getByRole('button', { name: /left panel/i }), 'layout-sidebar');
      await expectBootstrapIcon(page.getByRole('button', { name: /right panel/i }), 'layout-sidebar-reverse');

      await expectBootstrapIcon(page.getByRole('tab', { name: 'Write' }), 'pencil');
      await expectBootstrapIcon(page.getByRole('tab', { name: 'Preview' }), 'eye');
      await expectBootstrapIcon(page.getByRole('tab', { name: 'Split' }), 'layout-split');

      // File menu: chevron on the trigger, glyphs on the actions.
      const fileMenuTrigger = page.locator('.file-menu__trigger');
      await expectBootstrapIcon(fileMenuTrigger, 'chevron-down');
      await fileMenuTrigger.click();
      const menu = page.getByRole('menu');
      await expect(menu).toBeVisible();
      const menuItems = menu.getByRole('menuitem');
      await expectBootstrapIcon(menuItems.nth(0), 'file-earmark-plus');
      await expectBootstrapIcon(menuItems.nth(1), 'folder2-open');
      await page.keyboard.press('Escape');

      // Save-state badge in the header.
      await expectBootstrapIcon(page.locator('.workspace__save-indicator'), 'check-circle');

      // Nothing in the chrome still uses hand-drawn 24px SVGs.
      const legacy = await page.evaluate(
        () => document.querySelectorAll('button svg:not([data-icon]), [role="tab"] svg:not([data-icon])').length,
      );
      expect(legacy).toBe(0);

      const iconCount = await page.locator('svg[data-icon]').count();
      expect(iconCount).toBeGreaterThanOrEqual(12);
    } finally {
      await closeDokuApp(run.app);
    }
  });

  test('renders the quick actions, explorer and preview zoom glyphs', async () => {
    await prepareDokuProfile(context, {
      workspaceViewMode: 'preview',
      workspaceQuickActionsVisible: false,
      workspace: {
        leftPanelWidth: 280,
        rightPanelWidth: 340,
        leftPanelCollapsed: false,
        rightPanelCollapsed: true,
      },
    });
    const documentPath = await createMarkdownFile(context, 'icons.md', SAMPLE);
    const run = await launchDokuApp(context, documentPath);

    try {
      const { page } = run;

      // Preview zoom bar.
      const zoomBar = page.getByRole('group', { name: 'Preview zoom' });
      await zoomBar.waitFor({ state: 'visible' });
      await expectBootstrapIcon(zoomBar.getByRole('button', { name: 'Fit width' }), 'arrows-expand-vertical');
      await expectBootstrapIcon(zoomBar.getByRole('button', { name: 'Fit height' }), 'arrows-expand');
      await expectBootstrapIcon(zoomBar.getByRole('button', { name: 'Invert preview colours' }), 'circle-half');
      await expectBootstrapIcon(page.getByRole('button', { name: 'Immersive mode' }), 'arrows-fullscreen');

      // Workspace explorer: the open document is listed with a document glyph.
      const explorer = page.locator('.workspace-explorer');
      await expect(explorer).toBeVisible();
      const explorerIcons = await explorer.evaluate((element) =>
        [...element.querySelectorAll('svg[data-icon]')].map((svg) => svg.getAttribute('data-icon')),
      );
      expect(explorerIcons).toContain('file-earmark-text');

      // Quick actions: switch to Write, reveal the bar, every action has its own glyph.
      await page.getByRole('tab', { name: 'Write' }).click();
      await page.getByRole('button', { name: 'Show quick actions' }).click();
      const bar = page.locator('.workspace__quick-actions');
      await expect(bar).toBeVisible();
      const names = await bar.evaluate((element) =>
        [...element.querySelectorAll('svg[data-icon]')].map((svg) => svg.getAttribute('data-icon')),
      );
      for (const expected of [
        'type-h1',
        'type-h2',
        'type-bold',
        'type-italic',
        'link-45deg',
        'image',
        'list-ul',
        'list-ol',
        'list-check',
        'quote',
        'code',
        'code-square',
        'hr',
        'diagram-3',
        'diagram-2',
        'bar-chart',
        'table',
        'palette',
      ]) {
        expect(names, `quick action icon ${expected}`).toContain(expected);
      }
      const buttonsWithoutIcon = await bar.evaluate((element) =>
        [...element.querySelectorAll('button')].filter(
          (button) => !button.querySelector('svg[data-icon]') && !button.textContent?.trim(),
        ).length,
      );
      expect(buttonsWithoutIcon).toBe(0);
    } finally {
      await closeDokuApp(run.app);
    }
  });

  test('loads no external resource: icons, styles and scripts are all bundled', async () => {
    await prepareDokuProfile(context, { workspaceViewMode: 'split' });
    const documentPath = await createMarkdownFile(context, 'icons.md', SAMPLE);
    const run = await launchDokuApp(context, documentPath);

    try {
      const { page } = run;
      await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeVisible();
      // Give lazy chunks (Monaco, visual blocks) a moment to settle before auditing.
      await page.waitForTimeout(1500);

      const origins = await readRendererResourceOrigins(page);
      expect(origins).toEqual([]);

      const bundledIcons = await page.evaluate(() => {
        const icons = [...document.querySelectorAll('svg[data-icon]')];
        return {
          count: icons.length,
          allInline: icons.every(
            (svg) => svg.querySelectorAll('path').length > 0 && svg.querySelectorAll('use, image').length === 0,
          ),
          fontIcons: document.querySelectorAll('i.bi, [class^="bi-"], [class*=" bi-"]').length,
        };
      });
      expect(bundledIcons.count).toBeGreaterThan(0);
      expect(bundledIcons.allInline).toBe(true);
      expect(bundledIcons.fontIcons).toBe(0);
    } finally {
      await closeDokuApp(run.app);
    }
  });
});
