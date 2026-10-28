const { expect, test } = require('@playwright/test');
const { promises: fs } = require('node:fs');
const { join, relative } = require('node:path');
const {
  cleanupDokuE2EContext,
  closeDokuApp,
  createDokuE2EContext,
  launchDokuApp,
  openVault,
  prepareDokuProfile,
} = require('./helpers/dokuApp.cjs');

/**
 * Sprint K0.3 harness check: the fixture vaults copy into a temporary folder
 * intact, and today's Doku (all v2 flags off) opens a note from each of them
 * with its folder listed in the explorer, exactly as any other Markdown file.
 */

const PANELS_OPEN = {
  leftPanelWidth: 280,
  rightPanelWidth: 340,
  leftPanelCollapsed: false,
  rightPanelCollapsed: true,
};

const VAULTS = [
  { name: 'vault-small', note: 'index.md', heading: 'Vault index', sibling: 'Orphan' },
  { name: 'vault-logseq', note: 'pages/Atomic Notes.md', heading: null, sibling: 'Alice' },
  { name: 'vault-obsidian', note: 'Notes/Welcome.md', heading: 'Welcome', sibling: 'Second Brain' },
];

async function listFiles(dir) {
  const entries = await fs.readdir(dir, { recursive: true, withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => relative(dir, join(entry.parentPath ?? entry.path, entry.name)))
    .sort();
}

test.describe('fixture vaults', () => {
  let context;

  test.beforeEach(async () => {
    context = createDokuE2EContext();
    await prepareDokuProfile(context, { workspaceViewMode: 'split', workspace: PANELS_OPEN });
  });

  test.afterEach(async () => {
    await cleanupDokuE2EContext(context);
  });

  test('vault-small has thirty notes, a canvas, a PDF and an image', async () => {
    const { vaultDir } = await openVault(context, 'vault-small');
    const files = await listFiles(vaultDir);
    const notes = files.filter((file) => file.endsWith('.md') && file !== 'README.md');
    expect(notes).toHaveLength(30);
    expect(files).toContain(join('canvas', 'Atlas Board.canvas'));
    expect(files).toContain(join('assets', 'Fixture Paper.pdf'));
    expect(files).toContain(join('assets', 'cover.png'));
    for (const note of notes) {
      const text = await fs.readFile(join(vaultDir, note), 'utf-8');
      expect(text, note).toMatch(/^---\nfixture: "/);
    }
  });

  for (const vault of VAULTS) {
    test(`${vault.name}: a note opens with its folder in the explorer`, async () => {
      const { vaultDir, notePath } = await openVault(context, vault.name);
      expect(await listFiles(vaultDir)).toEqual(
        await listFiles(join(__dirname, 'fixtures', vault.name)),
      );

      const run = await launchDokuApp(context, notePath(vault.note));
      try {
        const { page } = run;
        const left = page.getByRole('complementary', { name: 'Left panel' });
        await expect(left).toBeVisible();
        await expect(left.getByText(vault.sibling, { exact: false }).first()).toBeVisible();
        if (vault.heading) {
          await expect(
            page.locator('.markdown-preview').getByRole('heading', { name: vault.heading }),
          ).toBeVisible();
        }
      } finally {
        await closeDokuApp(run.app);
      }
    });
  }
});
