const { expect, test } = require('@playwright/test');
const {
  cleanupDokuE2EContext,
  closeDokuApp,
  createDokuE2EContext,
  createMarkdownFile,
  launchDokuApp,
  prepareDokuProfile,
  tabIdForPath,
} = require('./helpers/dokuApp.cjs');

const TAB_COUNT = 12;
// A tab in the middle of the strip: it must be scrolled into view on restore.
const ACTIVE_INDEX = 7;

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

async function activeTabVisibility(page) {
  return page.evaluate(() => {
    const strip = document.querySelector('.workspace-tabs');
    const active = document.querySelector('.workspace-tabs__item--active');
    if (!strip || !active) {
      return { fullyVisible: false };
    }
    const stripRect = strip.getBoundingClientRect();
    const activeRect = active.getBoundingClientRect();
    return {
      fullyVisible:
        activeRect.left >= stripRect.left - 1 && activeRect.right <= stripRect.right + 1,
      stripLeft: stripRect.left,
      stripRight: stripRect.right,
      activeLeft: activeRect.left,
      activeRight: activeRect.right,
    };
  });
}

async function measureHeader(page) {
  return page.evaluate(() => {
    const rect = (selector) => {
      const element = document.querySelector(selector);
      if (!element) {
        return null;
      }
      const { left, right, width } = element.getBoundingClientRect();
      return { left, right, width };
    };
    const strip = document.querySelector('.workspace-tabs');
    return {
      viewportWidth: window.innerWidth,
      documentScrollWidth: document.documentElement.scrollWidth,
      topbar: rect('.workspace__topbar'),
      header: rect('.workspace__header'),
      headerSide: rect('.workspace__header-side'),
      strip: strip
        ? {
            ...rect('.workspace-tabs'),
            scrollWidth: strip.scrollWidth,
            clientWidth: strip.clientWidth,
          }
        : null,
    };
  });
}

test.describe('tab strip overflow', () => {
  let context;

  test.beforeEach(async () => {
    context = createDokuE2EContext();
    await prepareDokuProfile(context);
  });

  test.afterEach(async () => {
    await cleanupDokuE2EContext(context);
  });

  test('many open documents scroll inside the tab strip instead of widening the header', async () => {
    const summaries = [];
    for (let index = 1; index <= TAB_COUNT; index += 1) {
      const title = `Very Long Document Title Number ${index}`;
      const filePath = await createMarkdownFile(
        context,
        `document-${index}.md`,
        `# ${title}\n\nBody ${index}`,
      );
      summaries.push(summaryForPath(filePath, title));
    }

    await prepareDokuProfile(context, {
      sessionTabs: summaries,
      activeSessionTabId: tabIdForPath(summaries[ACTIVE_INDEX].path),
      launcher: {
        recentDocuments: summaries.slice(0, 5),
        quickResumeId: summaries[0].id,
      },
    });

    const run = await launchDokuApp(context);
    const { page } = run;
    const tablist = page.getByRole('tablist', { name: 'Open documents' });
    await expect(tablist.getByRole('tab')).toHaveCount(TAB_COUNT);

    const metrics = await measureHeader(page);
    const tolerance = 1;

    // The restored active tab is fully visible inside the strip (browser behaviour).
    await expect.poll(() => activeTabVisibility(page)).toMatchObject({ fullyVisible: true });

    // The window never grows horizontally: nothing in the shell overflows the viewport.
    expect(metrics.documentScrollWidth).toBeLessThanOrEqual(metrics.viewportWidth + tolerance);
    expect(metrics.topbar.right).toBeLessThanOrEqual(metrics.viewportWidth + tolerance);
    expect(metrics.header.right).toBeLessThanOrEqual(metrics.viewportWidth + tolerance);

    // The right-hand header actions stay reachable on screen.
    expect(metrics.headerSide.right).toBeLessThanOrEqual(metrics.viewportWidth + tolerance);
    expect(metrics.headerSide.left).toBeGreaterThanOrEqual(0);

    // The strip itself is the scroll container: it overflows internally, like a browser tab bar.
    expect(metrics.strip.right).toBeLessThanOrEqual(metrics.headerSide.left + tolerance);
    expect(metrics.strip.scrollWidth).toBeGreaterThan(metrics.strip.clientWidth);

    // Overflow affordances: the "next" scroll button appears, and it scrolls the strip.
    const nextButton = page.locator('.workspace-tabs__nav--next');
    await expect(nextButton).toBeVisible();
    await nextButton.click();
    await expect
      .poll(() => page.locator('.workspace-tabs').evaluate((element) => element.scrollLeft))
      .toBeGreaterThan(0);
    await expect(page.locator('.workspace-tabs__nav--prev')).toBeVisible();

    // Activating the last tab brings it into view without changing the strip's width.
    const lastTitle = summaries[TAB_COUNT - 1].title;
    await page.getByRole('tab', { name: lastTitle, exact: true }).click();
    await expect(page.getByRole('tab', { name: lastTitle, exact: true })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect.poll(() => activeTabVisibility(page)).toMatchObject({ fullyVisible: true });
    await expect
      .poll(async () => {
        const after = await measureHeader(page);
        return {
          stripWidth: Math.round(after.strip.width),
          headerRight: Math.round(after.header.right),
        };
      })
      .toEqual({
        stripWidth: Math.round(metrics.strip.width),
        headerRight: Math.round(metrics.header.right),
      });

    await closeDokuApp(run.app);
  });
});
