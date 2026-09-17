const { expect, test } = require('@playwright/test');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const {
  cleanupDokuE2EContext,
  closeDokuApp,
  createDokuE2EContext,
  createMarkdownFile,
  launchDokuApp,
  prepareDokuProfile,
} = require('./helpers/dokuApp.cjs');

/**
 * Regression suite: in the full preview the document MUST scroll with the
 * keyboard (arrows, PageUp/PageDown, Home/End, Space) no matter where the
 * focus ended up — right after launch, after switching mode from the toolbar,
 * after clicking the page. It must also never steal the keys from controls
 * that use them (zoom slider, zoom input, view-mode tabs).
 */

const LONG_DOCUMENT = [
  '# Documento lungo',
  '',
  ...Array.from({ length: 120 }, (_, index) => [
    `## Sezione ${index + 1}`,
    '',
    `Paragrafo ${index + 1}. Lorem ipsum dolor sit amet, consectetur adipiscing elit. ` +
      'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. ' +
      'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.',
    '',
  ]).flat(),
  'FINE_DOCUMENTO',
  '',
].join('\n');

/** Wide tables and an unbreakable word: the only way the A4 page overflows sideways. */
const WIDE_DOCUMENT = [
  readFileSync(join(__dirname, 'fixtures', 'a4-stress.md'), 'utf-8'),
  '',
  LONG_DOCUMENT.replace('# Documento lungo', '# Coda lunga'),
].join('\n');

const SCROLLER = '.workspace__preview-scroll';

async function readScrollState(page) {
  return page.evaluate((selector) => {
    const scroller = document.querySelector(selector);
    if (!scroller) {
      throw new Error(`Preview scroller not found: ${selector}`);
    }
    return {
      scrollTop: scroller.scrollTop,
      scrollLeft: scroller.scrollLeft,
      maxScrollTop: scroller.scrollHeight - scroller.clientHeight,
      maxScrollLeft: scroller.scrollWidth - scroller.clientWidth,
      clientHeight: scroller.clientHeight,
      activeElement: document.activeElement
        ? `${document.activeElement.tagName.toLowerCase()}${
            document.activeElement.className ? `.${String(document.activeElement.className).split(' ')[0]}` : ''
          }`
        : null,
    };
  }, SCROLLER);
}

async function waitForPreview(page) {
  await page.getByRole('group', { name: 'Preview zoom' }).waitFor({ state: 'visible' });
  await expect(page.locator('.markdown-preview__heading--1')).toHaveText('Documento lungo');
  // The page must be taller than the viewport, otherwise nothing can scroll.
  await expect.poll(async () => (await readScrollState(page)).maxScrollTop).toBeGreaterThan(500);
}

async function expectScrollTop(page, matcher) {
  await expect.poll(async () => (await readScrollState(page)).scrollTop).toEqual(matcher);
}

test.describe('preview keyboard scrolling', () => {
  let context;

  test.beforeEach(async () => {
    context = createDokuE2EContext();
  });

  test.afterEach(async () => {
    await cleanupDokuE2EContext(context);
  });

  test('scrolls with arrows, page keys, Home/End and Space right after launch', async () => {
    await prepareDokuProfile(context, { workspaceViewMode: 'preview' });
    const documentPath = await createMarkdownFile(context, 'long.md', LONG_DOCUMENT);
    const run = await launchDokuApp(context, documentPath);

    try {
      await waitForPreview(run.page);
      const initial = await readScrollState(run.page);
      expect(initial.scrollTop).toBe(0);

      // No click anywhere: the keyboard alone must move the page.
      await run.page.keyboard.press('ArrowDown');
      await expectScrollTop(run.page, expect.any(Number));
      const afterOneArrow = await readScrollState(run.page);
      expect(afterOneArrow.scrollTop).toBeGreaterThan(0);

      await run.page.keyboard.press('ArrowDown');
      await run.page.keyboard.press('ArrowDown');
      const afterThreeArrows = await readScrollState(run.page);
      expect(afterThreeArrows.scrollTop).toBeGreaterThan(afterOneArrow.scrollTop);

      await run.page.keyboard.press('ArrowUp');
      const afterArrowUp = await readScrollState(run.page);
      expect(afterArrowUp.scrollTop).toBeLessThan(afterThreeArrows.scrollTop);
      expect(afterArrowUp.scrollTop).toBeGreaterThan(0);

      await run.page.keyboard.press('PageDown');
      const afterPageDown = await readScrollState(run.page);
      expect(afterPageDown.scrollTop - afterArrowUp.scrollTop).toBeGreaterThan(
        afterPageDown.clientHeight * 0.5,
      );

      await run.page.keyboard.press('PageUp');
      const afterPageUp = await readScrollState(run.page);
      expect(afterPageUp.scrollTop).toBeLessThan(afterPageDown.scrollTop);

      await run.page.keyboard.press('Space');
      const afterSpace = await readScrollState(run.page);
      expect(afterSpace.scrollTop).toBeGreaterThan(afterPageUp.scrollTop);

      await run.page.keyboard.press('Shift+Space');
      const afterShiftSpace = await readScrollState(run.page);
      expect(afterShiftSpace.scrollTop).toBeLessThan(afterSpace.scrollTop);

      await run.page.keyboard.press('End');
      const atEnd = await readScrollState(run.page);
      expect(Math.abs(atEnd.scrollTop - atEnd.maxScrollTop)).toBeLessThanOrEqual(2);
      await expect(run.page.getByText('FINE_DOCUMENTO')).toBeInViewport();

      await run.page.keyboard.press('Home');
      await expectScrollTop(run.page, 0);
      await expect(run.page.locator('.markdown-preview__heading--1')).toBeInViewport();
    } finally {
      await closeDokuApp(run.app);
    }
  });

  test('keeps scrolling after switching to preview from the toolbar', async () => {
    await prepareDokuProfile(context, { workspaceViewMode: 'split' });
    const documentPath = await createMarkdownFile(context, 'long.md', LONG_DOCUMENT);
    const run = await launchDokuApp(context, documentPath);

    try {
      const previewTab = run.page.getByRole('tab', { name: 'Preview' });
      await previewTab.click();
      await waitForPreview(run.page);

      // The focus leaves the tab list, so arrows scroll instead of changing mode.
      await expect
        .poll(async () => (await readScrollState(run.page)).activeElement)
        .toBe('div.workspace__preview-scroll');

      await run.page.keyboard.press('ArrowDown');
      await run.page.keyboard.press('ArrowDown');
      const state = await readScrollState(run.page);
      expect(state.scrollTop).toBeGreaterThan(0);
      await expect(previewTab).toHaveAttribute('aria-selected', 'true');
      await expect(run.page.getByRole('group', { name: 'Preview zoom' })).toBeVisible();

      await run.page.keyboard.press('ArrowLeft');
      await expect(previewTab).toHaveAttribute('aria-selected', 'true');
    } finally {
      await closeDokuApp(run.app);
    }
  });

  test('keeps scrolling after clicking on the page or on a toolbar button', async () => {
    await prepareDokuProfile(context, { workspaceViewMode: 'preview' });
    const documentPath = await createMarkdownFile(context, 'long.md', LONG_DOCUMENT);
    const run = await launchDokuApp(context, documentPath);

    try {
      await waitForPreview(run.page);

      await run.page.locator('.markdown-preview__heading--1').click();
      await run.page.keyboard.press('ArrowDown');
      const afterPageClick = await readScrollState(run.page);
      expect(afterPageClick.scrollTop).toBeGreaterThan(0);

      // A click on the zoom bar moves the focus to a button: still scrolls.
      const zoomBar = run.page.getByRole('group', { name: 'Preview zoom' });
      await zoomBar.getByRole('button', { name: 'Zoom in' }).click();
      await zoomBar.getByRole('button', { name: 'Zoom out' }).click();
      await run.page.keyboard.press('PageDown');
      const afterButtonClick = await readScrollState(run.page);
      expect(afterButtonClick.scrollTop).toBeGreaterThan(afterPageClick.scrollTop);

      await run.page.keyboard.press('Home');
      await expectScrollTop(run.page, 0);
    } finally {
      await closeDokuApp(run.app);
    }
  });

  test('scrolls horizontally with arrows only when the page is wider than the pane', async () => {
    await prepareDokuProfile(context, { workspaceViewMode: 'preview' });
    const documentPath = await createMarkdownFile(context, 'wide.md', WIDE_DOCUMENT);
    const run = await launchDokuApp(context, documentPath);

    try {
      await run.page.getByRole('group', { name: 'Preview zoom' }).waitFor({ state: 'visible' });
      await expect(run.page.locator('.markdown-preview__heading--1').first()).toContainText(
        'Stress A4',
      );

      // Wide tables and unbreakable words shrink to the column (nothing is
      // clipped, as in the PDF), so the page never overflows sideways on its
      // own: horizontal arrows are a no-op and do not steal the key.
      expect((await readScrollState(run.page)).maxScrollLeft).toBe(0);
      await run.page.keyboard.press('ArrowRight');
      expect((await readScrollState(run.page)).scrollLeft).toBe(0);

      // Force a sideways overflow (e.g. an oversized embedded visual block)
      // and the same keys must scroll horizontally.
      await run.page.evaluate(() => {
        const code = document.querySelector('.markdown-preview__code');
        code.style.minWidth = '3000px';
        code.style.whiteSpace = 'pre';
      });
      await expect
        .poll(async () => (await readScrollState(run.page)).maxScrollLeft)
        .toBeGreaterThan(0);

      await run.page.keyboard.press('ArrowRight');
      await run.page.keyboard.press('ArrowRight');
      const afterRight = await readScrollState(run.page);
      expect(afterRight.scrollLeft).toBeGreaterThan(0);

      await run.page.keyboard.press('ArrowLeft');
      const afterLeft = await readScrollState(run.page);
      expect(afterLeft.scrollLeft).toBeLessThan(afterRight.scrollLeft);

      // Vertical keys keep working meanwhile.
      await run.page.keyboard.press('ArrowDown');
      expect((await readScrollState(run.page)).scrollTop).toBeGreaterThan(0);
    } finally {
      await closeDokuApp(run.app);
    }
  });

  test('does not steal arrow keys from the zoom slider, the zoom input or the view tabs', async () => {
    await prepareDokuProfile(context, { workspaceViewMode: 'preview' });
    const documentPath = await createMarkdownFile(context, 'long.md', LONG_DOCUMENT);
    const run = await launchDokuApp(context, documentPath);

    try {
      await waitForPreview(run.page);
      const zoomBar = run.page.getByRole('group', { name: 'Preview zoom' });
      const zoomValue = zoomBar.getByRole('button', { name: 'Reset zoom' });

      // Slider owns its arrows: zoom changes, the page stays put.
      const slider = run.page.locator('.workspace__preview-zoom-slider');
      await slider.focus();
      await run.page.keyboard.press('ArrowUp');
      await expect(zoomValue).toHaveText('105%');
      expect((await readScrollState(run.page)).scrollTop).toBe(0);
      await run.page.keyboard.press('ArrowDown');
      await expect(zoomValue).toHaveText('100%');
      expect((await readScrollState(run.page)).scrollTop).toBe(0);

      // Number input owns its arrows too.
      await zoomValue.dblclick();
      const zoomInput = run.page.locator('.workspace__preview-zoom-input');
      await expect(zoomInput).toBeFocused();
      await run.page.keyboard.press('ArrowUp');
      expect((await readScrollState(run.page)).scrollTop).toBe(0);
      await run.page.keyboard.press('Escape');

      // View-mode tab list: arrows move between tabs, never scroll.
      const previewTab = run.page.getByRole('tab', { name: 'Preview' });
      await previewTab.focus();
      await run.page.keyboard.press('ArrowDown');
      expect((await readScrollState(run.page)).scrollTop).toBe(0);

      // Back on the page, scrolling works again.
      await run.page.getByRole('tab', { name: 'Preview' }).click();
      await waitForPreview(run.page);
      await run.page.keyboard.press('ArrowDown');
      await expect.poll(async () => (await readScrollState(run.page)).scrollTop).toBeGreaterThan(0);
    } finally {
      await closeDokuApp(run.app);
    }
  });

  test('keeps scrolling in immersive preview mode', async () => {
    await prepareDokuProfile(context, { workspaceViewMode: 'preview' });
    const documentPath = await createMarkdownFile(context, 'long.md', LONG_DOCUMENT);
    const run = await launchDokuApp(context, documentPath);

    try {
      await waitForPreview(run.page);
      await run.page.getByRole('button', { name: 'Immersive mode' }).click();
      await expect(run.page.locator('.workspace')).toHaveClass(/workspace--immersive/);

      await run.page.keyboard.press('ArrowDown');
      await run.page.keyboard.press('PageDown');
      expect((await readScrollState(run.page)).scrollTop).toBeGreaterThan(0);

      await run.page.keyboard.press('Escape');
      await expect(run.page.locator('.workspace')).not.toHaveClass(/workspace--immersive/);
      await run.page.keyboard.press('Home');
      await expectScrollTop(run.page, 0);
    } finally {
      await closeDokuApp(run.app);
    }
  });
});
