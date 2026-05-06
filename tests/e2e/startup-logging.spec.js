const { expect, test } = require('@playwright/test');
const {
  cleanupDokuE2EContext,
  closeDokuApp,
  createDokuE2EContext,
  launchDokuApp,
  prepareDokuProfile,
  readLogEntries,
} = require('./helpers/dokuApp.cjs');

test.describe('startup logging', () => {
  let context;

  test.beforeEach(async () => {
    context = createDokuE2EContext();
    await prepareDokuProfile(context);
  });

  test.afterEach(async () => {
    await cleanupDokuE2EContext(context);
  });

  test('records the definitive boot path with ordered process metadata', async () => {
    const run = await launchDokuApp(context);

    await expect
      .poll(async () => (await readLogEntries(context)).map((entry) => entry.event))
      .toEqual(
        expect.arrayContaining([
          'startup:process-created',
          'startup:crash-reporter-started',
          'startup:crash-state-mark-starting',
          'startup:crash-state-loaded',
          'startup:electron-ready',
          'startup:settings-read-started',
          'startup:settings-read-finished',
          'startup:ipc-registration-finished',
          'startup:main-window-create-started',
          'startup:main-window-create-finished',
          'startup:bootstrap-completed',
          'window:created',
          'window:did-finish-load',
          'renderer:settings-loaded',
        ]),
      );

    const entries = await readLogEntries(context);
    const first = entries.find((entry) => entry.event === 'startup:process-created');
    expect(first).toMatchObject({
      level: 'info',
      sessionId: expect.any(String),
      sequence: 1,
      process: {
        name: 'main',
        pid: expect.any(Number),
        platform: process.platform,
        arch: process.arch,
        electron: expect.any(String),
        appVersion: expect.any(String),
      },
      context: {
        elapsedSinceProcessStartMs: expect.any(Number),
        rssBytes: expect.any(Number),
        appDataDir: context.dataDir,
      },
    });

    const sessionIds = new Set(entries.map((entry) => entry.sessionId));
    expect(sessionIds.size).toBe(1);

    const sequences = entries.map((entry) => entry.sequence);
    expect(sequences).toEqual([...sequences].sort((left, right) => left - right));
    expect(new Set(sequences).size).toBe(sequences.length);

    const settingsLoaded = entries.find((entry) => entry.event === 'renderer:settings-loaded');
    expect(settingsLoaded).toMatchObject({
      context: {
        firstRunCompleted: true,
        recentDocuments: 0,
      },
    });

    await closeDokuApp(run.app);

    await expect
      .poll(async () => (await readLogEntries(context)).map((entry) => entry.event))
      .toEqual(expect.arrayContaining(['app:before-quit']));
  });
});
