const { expect, test } = require('@playwright/test');
const { basename } = require('node:path');
const { promises: fs } = require('node:fs');
const { join } = require('node:path');
const {
  cleanupDokuE2EContext,
  closeDokuApp,
  createDokuE2EContext,
  createMarkdownFile,
  launchDokuApp,
  prepareDokuProfile,
} = require('./helpers/dokuApp.cjs');

const DONATE_URL = 'https://www.paypal.me/lorenzodemarco92';

const PANELS_OPEN = {
  leftPanelWidth: 280,
  rightPanelWidth: 340,
  leftPanelCollapsed: false,
  rightPanelCollapsed: false,
};

async function seedWorkspace(context) {
  await fs.mkdir(join(context.documentsDir, 'capitoli'), { recursive: true });
  await createMarkdownFile(context, 'capitoli/capitolo-2.md', '# Capitolo 2\n\nTesto.');
  await createMarkdownFile(context, 'note.md', '# Note\n\nTesto.');
  return createMarkdownFile(context, 'romanzo.md', `# Romanzo\n\n${'Parole '.repeat(120)}`);
}

/** Records every URL the main process is asked to open externally. */
async function captureExternalOpens(app) {
  await app.evaluate(({ shell }) => {
    globalThis.__dokuOpened = [];
    shell.openExternal = async (url) => {
      globalThis.__dokuOpened.push(url);
    };
  });
  return () => app.evaluate(() => globalThis.__dokuOpened);
}

test.describe('side rails and About dialog', () => {
  let context;

  test.beforeEach(async () => {
    context = createDokuE2EContext();
  });

  test.afterEach(async () => {
    await cleanupDokuE2EContext(context);
  });

  test('left rail: folder name as title, compact tree with chevrons and active row', async () => {
    await prepareDokuProfile(context, { workspaceViewMode: 'split', workspace: PANELS_OPEN });
    const documentPath = await seedWorkspace(context);
    const run = await launchDokuApp(context, documentPath);

    try {
      const { page } = run;
      const left = page.getByRole('complementary', { name: 'Left panel' });
      await expect(left).toBeVisible();

      // The card title is the current folder, not a generic label.
      await expect(left.locator('.workspace__panel-title')).toHaveText(basename(context.documentsDir));
      await expect(left.getByText('Current folder')).toBeVisible();
      // No placeholder paragraph wastes rail space any more.
      await expect(left.locator('.workspace__panel-body')).toHaveCount(0);

      const tree = left.getByRole('tree', { name: 'Workspace' });
      await expect(tree).toBeVisible();
      const activeRow = tree.getByRole('treeitem', { name: /romanzo\.md/ });
      await expect(activeRow).toHaveAttribute('aria-current', 'page');
      await expect(activeRow).toHaveClass(/workspace-explorer__item--active/);

      // Directories carry a chevron that rotates when collapsed/expanded.
      const folderRow = tree.getByRole('treeitem', { name: /capitoli/ });
      await expect(folderRow).toHaveAttribute('aria-expanded', 'true');
      await expect(folderRow.locator('.workspace-explorer__chevron svg[data-icon="chevron-right"]')).toBeVisible();
      await expect(folderRow.locator('.workspace-explorer__chevron')).toHaveClass(/--open/);
      await expect(tree.getByRole('treeitem', { name: /capitolo-2\.md/ })).toBeVisible();
      await folderRow.click();
      await expect(folderRow).toHaveAttribute('aria-expanded', 'false');
      await expect(folderRow.locator('.workspace-explorer__chevron')).not.toHaveClass(/--open/);
      await expect(tree.getByRole('treeitem', { name: /capitolo-2\.md/ })).toHaveCount(0);
      await folderRow.click();
      await expect(tree.getByRole('treeitem', { name: /capitolo-2\.md/ })).toBeVisible();

      // Rows are compact and flat: no 38px card rows.
      const rowHeight = await activeRow.evaluate((element) => element.getBoundingClientRect().height);
      expect(rowHeight).toBeLessThanOrEqual(34);

      // Actions carry Bootstrap glyphs and keep their accessible names.
      await expect(left.getByRole('button', { name: 'New file' }).locator('svg[data-icon="file-earmark-plus"]')).toBeVisible();
      await expect(left.getByRole('button', { name: 'New folder' }).locator('svg[data-icon="folder-plus"]')).toBeVisible();

      // The explorer card fills the rail height and the tree scrolls inside it.
      const geometry = await left.evaluate((rail) => {
        const card = rail.querySelector('.workspace__panel-card--explorer');
        const treeElement = rail.querySelector('.workspace-explorer');
        return {
          railHeight: rail.getBoundingClientRect().height,
          cardHeight: card.getBoundingClientRect().height,
          treeOverflow: getComputedStyle(treeElement).overflowY,
        };
      });
      expect(geometry.cardHeight).toBeGreaterThan(geometry.railHeight * 0.9);
      expect(geometry.treeOverflow).toBe('auto');
    } finally {
      await closeDokuApp(run.app);
    }
  });

  test('right rail: minimal project card, recent list and session rows without wrapping', async () => {
    await prepareDokuProfile(context, {
      workspaceViewMode: 'split',
      workspace: PANELS_OPEN,
      launcher: {
        recentDocuments: [
          {
            id: 'recent-1',
            kind: 'file',
            title: 'Capitolo 2',
            path: join(context.documentsDir, 'capitoli', 'capitolo-2.md'),
            snippet: 'Testo del secondo capitolo che è piuttosto lungo e va troncato con i puntini',
            lastOpenedAt: '2026-09-17T10:00:00.000Z',
          },
        ],
        quickResumeId: null,
      },
    });
    const documentPath = await seedWorkspace(context);
    const run = await launchDokuApp(context, documentPath);

    try {
      const { page } = run;
      const right = page.getByRole('complementary', { name: 'Right panel' });
      await expect(right).toBeVisible();

      // Minimal project card: eyebrow + metric tiles, no tagline, no placeholder copy.
      await expect(right.getByText('Project')).toBeVisible();
      await expect(right.getByText('Your Second Mind')).toHaveCount(0);
      await expect(right.getByText('A quiet desk for your manuscript')).toHaveCount(0);
      await expect(right.locator('.workspace__panel-body')).toHaveCount(0);

      const metrics = right.locator('.workspace__metric');
      await expect(metrics).toHaveCount(2);
      await expect(metrics.nth(0)).toContainText('Words');
      await expect(metrics.nth(0).locator('dd')).toHaveText(/^\d[\d.,]*$/);
      await expect(metrics.nth(1)).toContainText('Characters');

      // Headings appear once each (no eyebrow/heading duplication).
      await expect(right.getByText('Recent documents')).toHaveCount(1);
      await expect(right.getByText('Current session')).toHaveCount(1);

      const recent = right.locator('.workspace__recent-item');
      await expect(recent).toHaveCount(1);
      await expect(recent.locator('svg[data-icon="file-earmark-text"]')).toBeVisible();
      await expect(recent.locator('.workspace__recent-title')).toHaveText('Capitolo 2');
      const truncated = await recent.locator('.workspace__recent-meta').evaluate((element) => ({
        overflow: getComputedStyle(element).textOverflow,
        singleLine: element.getBoundingClientRect().height < 30,
      }));
      expect(truncated.overflow).toBe('ellipsis');
      expect(truncated.singleLine).toBe(true);

      const rows = right.locator('.workspace__session-row');
      await expect(rows).toHaveCount(4);
      for (let index = 0; index < 4; index += 1) {
        const value = rows.nth(index).locator('dd');
        await expect(value).not.toHaveText('');
        const height = await value.evaluate((element) => element.getBoundingClientRect().height);
        expect(height, `session value ${index} wraps`).toBeLessThan(30);
      }
      await expect(right.locator('.workspace__session-status svg[data-icon]')).toBeVisible();
      await expect(right.locator('.workspace__session-note')).toHaveText('Saved');
    } finally {
      await closeDokuApp(run.app);
    }
  });

  test('About dialog: tagline and donation call to action open PayPal', async () => {
    await prepareDokuProfile(context, { workspaceViewMode: 'split' });
    const documentPath = await seedWorkspace(context);
    const run = await launchDokuApp(context, documentPath);

    try {
      const { page } = run;
      const readOpened = await captureExternalOpens(run.app);

      await page.getByRole('button', { name: 'About' }).click();
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      await expect(dialog.getByText('Your Second Mind')).toBeVisible();
      await expect(dialog.getByText('A local editorial studio for Markdown writing.')).toHaveCount(0);

      const support = dialog.locator('.info-dialog__support');
      await expect(support).toBeVisible();
      await expect(support.getByRole('heading', { name: 'Support Doku' })).toBeVisible();
      await expect(support.locator('svg[data-icon="heart-fill"]')).toBeVisible();

      const cta = support.getByRole('button', { name: 'Support me with a donation' });
      await expect(cta).toBeVisible();
      await expect(cta.locator('svg[data-icon="gift"]')).toBeVisible();
      const ctaBox = await cta.boundingBox();
      expect(ctaBox.height).toBeGreaterThanOrEqual(40);
      // The plain "Donations" footer button is gone: the CTA is the single entry point.
      await expect(dialog.getByRole('button', { name: 'Donations' })).toHaveCount(0);
      await expect(dialog.getByRole('button', { name: 'Report a bug' })).toBeVisible();

      await cta.click();
      await expect.poll(readOpened).toEqual([DONATE_URL]);
    } finally {
      await closeDokuApp(run.app);
    }
  });

  test('tagline and donation copy are localised (Italian)', async () => {
    await prepareDokuProfile(context, {
      language: 'it',
      workspaceViewMode: 'split',
      workspace: PANELS_OPEN,
    });
    const documentPath = await seedWorkspace(context);
    const run = await launchDokuApp(context, documentPath, { readyLabel: 'Documenti aperti' });

    try {
      const { page } = run;
      await expect(page.getByText('La tua seconda mente')).toHaveCount(0);
      await page.getByRole('button', { name: 'Informazioni' }).click();
      const dialog = page.getByRole('dialog');
      await expect(dialog.getByText('La tua seconda mente')).toBeVisible();
      await expect(dialog.getByRole('heading', { name: 'Sostieni Doku' })).toBeVisible();
      await expect(dialog.getByRole('button', { name: 'Sostienimi donando' })).toBeVisible();
    } finally {
      await closeDokuApp(run.app);
    }
  });
});
