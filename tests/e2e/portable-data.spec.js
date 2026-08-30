const { promises: fs } = require('node:fs');
const { join } = require('node:path');
const { expect, test } = require('@playwright/test');
const {
  cleanupDokuE2EContext,
  closeDokuApp,
  createDokuE2EContext,
  launchDokuAppWithEnv,
  prepareDokuProfile,
} = require('./helpers/dokuApp.cjs');

test.describe('portable data isolation', () => {
  let context;

  test.beforeEach(async () => {
    context = createDokuE2EContext();
  });

  test.afterEach(async () => {
    await cleanupDokuE2EContext(context);
  });

  test('persists app and Electron state in AppUser beside the portable executable', async () => {
    const appUserDir = join(context.rootDir, 'AppUser');
    const electronDir = join(appUserDir, 'Electron');
    await prepareDokuProfile({ ...context, dataDir: appUserDir }, { theme: 'dark' });

    const env = {
      ...process.env,
      PORTABLE_EXECUTABLE_DIR: context.rootDir,
      PORTABLE_EXECUTABLE_FILE: join(context.rootDir, 'Doku.exe'),
    };
    delete env.DOKU_DATA_DIR;

    const firstRun = await launchDokuAppWithEnv(context, env);
    const diagnostics = await firstRun.page.evaluate(() => window.doku.system.diagnostics());

    expect(diagnostics.appDataDir).toBe(appUserDir);
    expect(diagnostics.electronUserDataDir).toBe(electronDir);
    await expect.poll(async () => fs.stat(join(appUserDir, 'logs')).then(() => true)).toBe(true);
    await expect.poll(async () => fs.stat(join(electronDir, 'Session')).then(() => true)).toBe(true);
    await expect.poll(async () => fs.stat(join(electronDir, 'Crashpad')).then(() => true)).toBe(true);
    await closeDokuApp(firstRun.app);

    const persistedBeforeRestart = JSON.parse(
      await fs.readFile(join(appUserDir, 'settings.json'), 'utf8'),
    );
    expect(persistedBeforeRestart.theme).toBe('dark');

    const secondRun = await launchDokuAppWithEnv(context, env);
    const secondDiagnostics = await secondRun.page.evaluate(() => window.doku.system.diagnostics());
    expect(secondDiagnostics).toMatchObject({
      appDataDir: appUserDir,
      electronUserDataDir: electronDir,
    });
    await closeDokuApp(secondRun.app);
  });
});
