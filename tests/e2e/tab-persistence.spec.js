const { expect, test } = require('@playwright/test');
const { promises: fs } = require('node:fs');
const {
  cleanupDokuE2EContext,
  closeDokuApp,
  createDokuE2EContext,
  createMarkdownFile,
  launchDokuApp,
  openMarkdownFileInRunningApp,
  prepareDokuProfile,
  readLogEntries,
  readSettings,
  tabIdForPath,
} = require('./helpers/dokuApp.cjs');

test.describe('tab persistence', () => {
  let context;

  test.beforeEach(async () => {
    context = createDokuE2EContext();
    await prepareDokuProfile(context);
  });

  test.afterEach(async () => {
    await cleanupDokuE2EContext(context);
  });

  test('restores three opened tabs in order with the active tab after restart', async () => {
    const chapter1 = await createMarkdownFile(context, 'chapter-1.md', '# Chapter 1\n\nFirst file');
    const chapter2 = await createMarkdownFile(
      context,
      'chapter-2.md',
      '# Chapter 2\n\nSecond file',
    );
    const chapter3 = await createMarkdownFile(context, 'chapter-3.md', '# Chapter 3\n\nThird file');

    const firstRun = await launchDokuApp(context);

    await openMarkdownFileInRunningApp(context, chapter1);
    await expect(firstRun.page.getByRole('tab', { name: 'Chapter 1', exact: true })).toBeVisible();

    await openMarkdownFileInRunningApp(context, chapter2);
    await expect(firstRun.page.getByRole('tab', { name: 'Chapter 2', exact: true })).toBeVisible();

    await openMarkdownFileInRunningApp(context, chapter3);
    await expect(firstRun.page.getByRole('tab', { name: 'Chapter 3', exact: true })).toBeVisible();

    await firstRun.page.getByRole('tab', { name: 'Chapter 2', exact: true }).click();
    await expect(
      firstRun.page.getByRole('tab', { name: 'Chapter 2', exact: true }),
    ).toHaveAttribute('aria-selected', 'true');

    await expect
      .poll(async () => {
        const settings = await readSettings(context);
        return {
          activeSessionTabId: settings.activeSessionTabId,
          sessionTabPaths: settings.sessionTabs.map((summary) => summary.path),
        };
      })
      .toEqual({
        activeSessionTabId: tabIdForPath(chapter2),
        sessionTabPaths: [chapter1, chapter2, chapter3],
      });

    await closeDokuApp(firstRun.app);

    const secondRun = await launchDokuApp(context);
    const tablist = secondRun.page.getByRole('tablist', { name: 'Open documents' });
    await expect(secondRun.page.getByRole('tab', { name: 'Chapter 1', exact: true })).toBeVisible();
    await expect(secondRun.page.getByRole('tab', { name: 'Chapter 2', exact: true })).toBeVisible();
    await expect(secondRun.page.getByRole('tab', { name: 'Chapter 3', exact: true })).toBeVisible();

    await expect
      .poll(async () =>
        tablist.getByRole('tab').evaluateAll((tabs) => tabs.map((tab) => tab.textContent?.trim())),
      )
      .toEqual(['Chapter 1', 'Chapter 2', 'Chapter 3']);
    await expect(
      secondRun.page.getByRole('tab', { name: 'Chapter 2', exact: true }),
    ).toHaveAttribute('aria-selected', 'true');
    await expect(secondRun.page.locator('.view-lines')).toContainText('Second file');

    await expect
      .poll(async () =>
        secondRun.page.locator('.workspace-tabs').evaluate((element) => {
          const styles = window.getComputedStyle(element);
          return {
            position: styles.position,
            top: styles.top,
          };
        }),
      )
      .toEqual({
        position: 'sticky',
        top: '0px',
      });

    await closeDokuApp(secondRun.app);
  });

  test('restores a deleted active session file as a missing tab without blocking startup', async () => {
    const keptFile = await createMarkdownFile(
      context,
      'chapter-kept.md',
      '# Chapter Kept\n\nStill here',
    );
    const deletedFile = await createMarkdownFile(
      context,
      'chapter-deleted.md',
      '# Chapter Deleted\n\nGone',
    );
    const keptSummary = summaryForPath(keptFile, 'Chapter Kept');
    const deletedSummary = summaryForPath(deletedFile, 'Chapter Deleted');

    await prepareDokuProfile(context, {
      sessionTabs: [keptSummary, deletedSummary],
      activeSessionTabId: tabIdForPath(deletedFile),
      launcher: {
        recentDocuments: [keptSummary, deletedSummary],
        quickResumeId: deletedSummary.id,
      },
    });
    await fs.unlink(deletedFile);

    const run = await launchDokuApp(context);
    const missingTab = run.page.getByRole('tab', { name: /Chapter Deleted/ });

    await expect(missingTab).toBeVisible();
    await expect(missingTab).toHaveAttribute('aria-selected', 'true');
    await expect(missingTab.locator('..')).toHaveClass(/workspace-tabs__item--missing/);
    await expect(run.page.getByRole('alert')).toContainText(
      'The file is no longer available on disk.',
    );
    await expect(run.page.getByRole('tab', { name: 'Chapter Kept', exact: true })).toBeVisible();

    await expect
      .poll(async () => {
        const events = await readLogEntries(context);
        return {
          missing: events.some((entry) => entry.event === 'renderer:workspace-restore-tab-missing'),
          ready: events.some((entry) => entry.event === 'renderer:app-ready'),
          healthy: events.some((entry) => entry.event === 'startup:healthy'),
          workspaceReady: events.find((entry) => entry.event === 'renderer:workspace-ready')
            ?.context,
        };
      })
      .toMatchObject({
        missing: true,
        ready: true,
        healthy: true,
        workspaceReady: {
          tabs: 2,
          readyTabs: 1,
          missingTabs: 1,
          erroredTabs: 0,
          activeTabId: tabIdForPath(deletedFile),
          activeTabState: 'missing',
        },
      });

    const settings = await readSettings(context);
    expect(settings.sessionTabs.map((summary) => summary.path)).toEqual([keptFile, deletedFile]);
    expect(settings.activeSessionTabId).toBe(tabIdForPath(deletedFile));

    await closeDokuApp(run.app);
  });

  test('restores an empty draft session instead of quick-resuming the last file', async () => {
    const previousFile = await createMarkdownFile(
      context,
      'previous.md',
      '# Previous\n\nThis file must not be reopened as the active document',
    );
    const previousSummary = summaryForPath(previousFile, 'Previous');
    const draftSummary = {
      id: 'draft:empty-session',
      kind: 'draft',
      title: 'Untitled document',
      snippet: '',
      lastOpenedAt: '2026-05-18T12:30:00.000Z',
    };

    await prepareDokuProfile(context, {
      sessionTabs: [draftSummary],
      activeSessionTabId: 'document:draft:empty-session',
      launcher: {
        recentDocuments: [previousSummary],
        quickResumeId: previousSummary.id,
      },
    });

    const run = await launchDokuApp(context);

    await expect(run.page.getByRole('tab', { name: 'Untitled document', exact: true })).toBeVisible();
    await expect(run.page.getByRole('tab', { name: 'Untitled document', exact: true })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(run.page.locator('.view-lines')).toBeVisible();
    await expect(run.page.locator('.view-lines')).not.toContainText('Previous');
    await expect(run.page.getByRole('tab', { name: 'Previous', exact: true })).toHaveCount(0);

    await expect
      .poll(async () => {
        const events = await readLogEntries(context);
        return {
          restoredEmptyDraft: events.some((entry) => entry.event === 'renderer:workspace-restore-draft-empty'),
          ready: events.some((entry) => entry.event === 'renderer:app-ready'),
          healthy: events.some((entry) => entry.event === 'startup:healthy'),
          workspaceReady: events.find((entry) => entry.event === 'renderer:workspace-ready')?.context,
        };
      })
      .toMatchObject({
        restoredEmptyDraft: true,
        ready: true,
        healthy: true,
        workspaceReady: {
          tabs: 1,
          readyTabs: 1,
          missingTabs: 0,
          erroredTabs: 0,
          activeTabId: 'document:draft:empty-session',
          activeTabState: 'ready',
        },
      });

    await closeDokuApp(run.app);
  });
});

function summaryForPath(filePath, title) {
  return {
    id: filePath,
    kind: 'file',
    title,
    path: filePath,
    snippet: title,
    lastOpenedAt: '2026-05-18T12:00:00.000Z',
  };
}
