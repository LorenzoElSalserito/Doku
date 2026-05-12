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
  const requiredStartupEvents = [
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
    'renderer:splash-ready',
    'window:show-requested',
    'window:show',
    'renderer:renderer-settings-resolved',
    'renderer:monaco-editor-ready',
    'renderer:app-ready',
    'startup:healthy',
  ];

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
      .poll(async () => {
        const events = (await readLogEntries(context)).map((entry) => entry.event);
        return requiredStartupEvents.filter((event) => !events.includes(event));
      })
      .toEqual([]);

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

    const settingsLoaded = entries.find((entry) => entry.event === 'renderer:renderer-settings-resolved');
    expect(settingsLoaded).toMatchObject({
      context: {
        firstRunCompleted: true,
        recentDocuments: 0,
      },
    });

    const eventIndex = (event) => entries.findIndex((entry) => entry.event === event);
    expect(eventIndex('renderer:splash-ready')).toBeGreaterThan(-1);
    expect(eventIndex('window:show-requested')).toBeGreaterThan(eventIndex('renderer:splash-ready'));
    expect(eventIndex('window:show')).toBeGreaterThan(eventIndex('window:show-requested'));
    expect(eventIndex('renderer:app-ready')).toBeGreaterThan(eventIndex('renderer:splash-ready'));
    expect(eventIndex('startup:healthy')).toBeGreaterThan(eventIndex('renderer:app-ready'));
    expect(entries.some((entry) => entry.event.startsWith('splash:'))).toBe(false);

    const showRequested = entries.find((entry) => entry.event === 'window:show-requested');
    expect(showRequested).toMatchObject({
      context: {
        reason: 'renderer-splash-ready',
      },
    });

    const appReady = entries.find((entry) => entry.event === 'renderer:app-ready');
    expect(appReady).toMatchObject({
      context: {
        editor: 'monaco',
        editorGate: 'monaco-ready',
        editorReadiness: 'ready',
      },
    });

    await closeDokuApp(run.app);

    await expect
      .poll(async () => (await readLogEntries(context)).map((entry) => entry.event))
      .toEqual(expect.arrayContaining(['app:before-quit']));
  });
});
