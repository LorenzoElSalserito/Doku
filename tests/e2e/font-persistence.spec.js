const { expect, test } = require('@playwright/test');
const {
  cleanupDokuE2EContext,
  closeDokuApp,
  createDokuE2EContext,
  createMarkdownFile,
  launchDokuApp,
  openMarkdownFileInRunningApp,
  prepareDokuProfile,
  readSettings,
} = require('./helpers/dokuApp.cjs');

test.describe('font persistence', () => {
  let context;

  test.beforeEach(async () => {
    context = createDokuE2EContext();
    await prepareDokuProfile(context);
  });

  test.afterEach(async () => {
    await cleanupDokuE2EContext(context);
  });

  test('keeps the chosen font after opening a file and after restart', async () => {
    const note = await createMarkdownFile(context, 'note.md', '# Note\n\nContent');

    const firstRun = await launchDokuApp(context);

    // Open settings and pick "Lora".
    await firstRun.page.getByRole('button', { name: 'Settings' }).click();
    const fontSelect = firstRun.page.locator('#settings-font-family');
    await fontSelect.waitFor({ state: 'visible' });
    await fontSelect.selectOption('Lora');

    // Wait until the renderer has flushed the typography update to disk.
    await expect
      .poll(async () => (await readSettings(context)).typography.uiFontFamily)
      .toBe('Lora');

    // Close the settings dialog.
    await firstRun.page.getByRole('button', { name: 'Close', exact: true }).click();

    // Open an existing file from outside the app — this triggers a launcher
    // update racing with anything else still pending on the settings file.
    await openMarkdownFileInRunningApp(context, note);
    await expect(firstRun.page.getByRole('tab', { name: 'note', exact: true })).toBeVisible();

    // Bug 1 regression: typography must NOT have been clobbered by the
    // launcher update.
    await expect
      .poll(async () => (await readSettings(context)).typography.uiFontFamily)
      .toBe('Lora');

    await closeDokuApp(firstRun.app);

    // Bug 3 regression: typography survives a clean restart.
    const secondRun = await launchDokuApp(context);
    const persisted = await readSettings(context);
    expect(persisted.typography.uiFontFamily).toBe('Lora');
    await closeDokuApp(secondRun.app);
  });

  test('recovers font choice from a leftover temp file when settings.json is corrupted', async () => {
    const fs = require('node:fs/promises');
    const path = require('node:path');

    // Simulate a crash mid-rename: a valid temp file plus a corrupted
    // settings.json. The repository should recover the font from the temp
    // file at startup instead of falling back to the default.
    const settingsPath = path.join(context.dataDir, 'settings.json');
    const tempPath = path.join(context.dataDir, 'settings.json.tmp-9999-1');
    const goodSettings = JSON.parse(await fs.readFile(settingsPath, 'utf-8'));
    goodSettings.typography = {
      profile: 'professional',
      uiFontFamily: 'Merriweather',
      pdfFontFamily: 'Merriweather',
      monospaceFontFamily: 'Merriweather',
      accessibilityFontFamily: 'Merriweather',
      accessibilityMode: false,
    };
    await fs.writeFile(tempPath, JSON.stringify(goodSettings, null, 2), 'utf-8');
    await fs.writeFile(settingsPath, '{ "broken":', 'utf-8');

    const run = await launchDokuApp(context);
    const recovered = await readSettings(context);
    expect(recovered.typography.uiFontFamily).toBe('Merriweather');
    await closeDokuApp(run.app);
  });
});
