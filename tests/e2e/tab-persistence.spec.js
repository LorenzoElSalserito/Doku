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
    const chapter2 = await createMarkdownFile(context, 'chapter-2.md', '# Chapter 2\n\nSecond file');
    const chapter3 = await createMarkdownFile(context, 'chapter-3.md', '# Chapter 3\n\nThird file');

    const firstRun = await launchDokuApp(context);

    await openMarkdownFileInRunningApp(context, chapter1);
    await expect(firstRun.page.getByRole('tab', { name: 'Chapter 1', exact: true })).toBeVisible();

    await openMarkdownFileInRunningApp(context, chapter2);
    await expect(firstRun.page.getByRole('tab', { name: 'Chapter 2', exact: true })).toBeVisible();

    await openMarkdownFileInRunningApp(context, chapter3);
    await expect(firstRun.page.getByRole('tab', { name: 'Chapter 3', exact: true })).toBeVisible();

    await firstRun.page.getByRole('tab', { name: 'Chapter 2', exact: true }).click();
    await expect(firstRun.page.getByRole('tab', { name: 'Chapter 2', exact: true })).toHaveAttribute(
      'aria-selected',
      'true',
    );

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
    await expect(secondRun.page.getByRole('tab', { name: 'Chapter 2', exact: true })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(secondRun.page.locator('.view-lines')).toContainText('Second file');

    await closeDokuApp(secondRun.app);
  });
});
