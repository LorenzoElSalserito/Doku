// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import {
  PREVIEW_KEYBOARD_LINE_STEP,
  resolvePreviewScrollCommand,
  scrollPreviewWithKeyboard,
  shouldPreviewHandleKeyboardScroll,
} from './previewKeyboardScroll.js';

const METRICS = { clientHeight: 600, clientWidth: 800, scrollHeight: 3000, scrollWidth: 800 };

function key(keyName: string, modifiers: Partial<Record<'alt' | 'ctrl' | 'meta' | 'shift', boolean>> = {}) {
  return {
    key: keyName,
    altKey: modifiers.alt ?? false,
    ctrlKey: modifiers.ctrl ?? false,
    metaKey: modifiers.meta ?? false,
    shiftKey: modifiers.shift ?? false,
  };
}

function createScroller(overrides: Partial<typeof METRICS> = {}): HTMLDivElement {
  const element = document.createElement('div');
  const metrics = { ...METRICS, ...overrides };
  for (const [name, value] of Object.entries(metrics)) {
    Object.defineProperty(element, name, { configurable: true, value });
  }
  document.body.appendChild(element);
  return element;
}

describe('resolvePreviewScrollCommand', () => {
  it('maps arrow keys to line steps', () => {
    expect(resolvePreviewScrollCommand(key('ArrowDown'), METRICS)).toEqual({
      axis: 'vertical',
      kind: 'relative',
      amount: PREVIEW_KEYBOARD_LINE_STEP,
    });
    expect(resolvePreviewScrollCommand(key('ArrowUp'), METRICS)).toEqual({
      axis: 'vertical',
      kind: 'relative',
      amount: -PREVIEW_KEYBOARD_LINE_STEP,
    });
  });

  it('maps page keys and space to most of a viewport', () => {
    expect(resolvePreviewScrollCommand(key('PageDown'), METRICS)).toEqual({
      axis: 'vertical',
      kind: 'relative',
      amount: 540,
    });
    expect(resolvePreviewScrollCommand(key('PageUp'), METRICS)).toEqual({
      axis: 'vertical',
      kind: 'relative',
      amount: -540,
    });
    expect(resolvePreviewScrollCommand(key(' '), METRICS)).toEqual({
      axis: 'vertical',
      kind: 'relative',
      amount: 540,
    });
    expect(resolvePreviewScrollCommand(key(' ', { shift: true }), METRICS)).toEqual({
      axis: 'vertical',
      kind: 'relative',
      amount: -540,
    });
  });

  it('maps Home and End to the document edges', () => {
    expect(resolvePreviewScrollCommand(key('Home'), METRICS)).toEqual({
      axis: 'vertical',
      kind: 'absolute',
      position: 'start',
    });
    expect(resolvePreviewScrollCommand(key('End'), METRICS)).toEqual({
      axis: 'vertical',
      kind: 'absolute',
      position: 'end',
    });
  });

  it('only scrolls horizontally when the page overflows sideways', () => {
    expect(resolvePreviewScrollCommand(key('ArrowRight'), METRICS)).toBeNull();
    expect(resolvePreviewScrollCommand(key('ArrowLeft'), METRICS)).toBeNull();

    const wide = { ...METRICS, scrollWidth: 1600 };
    expect(resolvePreviewScrollCommand(key('ArrowRight'), wide)).toEqual({
      axis: 'horizontal',
      kind: 'relative',
      amount: PREVIEW_KEYBOARD_LINE_STEP,
    });
    expect(resolvePreviewScrollCommand(key('ArrowLeft'), wide)).toEqual({
      axis: 'horizontal',
      kind: 'relative',
      amount: -PREVIEW_KEYBOARD_LINE_STEP,
    });
  });

  it('leaves modified keys and non-navigation keys alone', () => {
    expect(resolvePreviewScrollCommand(key('ArrowDown', { ctrl: true }), METRICS)).toBeNull();
    expect(resolvePreviewScrollCommand(key('ArrowDown', { meta: true }), METRICS)).toBeNull();
    expect(resolvePreviewScrollCommand(key('ArrowDown', { alt: true }), METRICS)).toBeNull();
    expect(resolvePreviewScrollCommand(key('Home', { shift: true }), METRICS)).toBeNull();
    expect(resolvePreviewScrollCommand(key('a'), METRICS)).toBeNull();
    expect(resolvePreviewScrollCommand(key('Enter'), METRICS)).toBeNull();
    expect(resolvePreviewScrollCommand(key('Tab'), METRICS)).toBeNull();
  });
});

describe('scrollPreviewWithKeyboard', () => {
  it('moves and clamps the vertical scroll position', () => {
    const scroller = createScroller();

    expect(scrollPreviewWithKeyboard(scroller, key('ArrowDown'))).toBe(true);
    expect(scroller.scrollTop).toBe(PREVIEW_KEYBOARD_LINE_STEP);

    expect(scrollPreviewWithKeyboard(scroller, key('PageDown'))).toBe(true);
    expect(scroller.scrollTop).toBe(PREVIEW_KEYBOARD_LINE_STEP + 540);

    expect(scrollPreviewWithKeyboard(scroller, key('End'))).toBe(true);
    expect(scroller.scrollTop).toBe(2400);

    expect(scrollPreviewWithKeyboard(scroller, key('ArrowDown'))).toBe(true);
    expect(scroller.scrollTop).toBe(2400);

    expect(scrollPreviewWithKeyboard(scroller, key('Home'))).toBe(true);
    expect(scroller.scrollTop).toBe(0);

    expect(scrollPreviewWithKeyboard(scroller, key('ArrowUp'))).toBe(true);
    expect(scroller.scrollTop).toBe(0);
  });

  it('moves horizontally only on a page wider than the viewport', () => {
    const narrow = createScroller();
    expect(scrollPreviewWithKeyboard(narrow, key('ArrowRight'))).toBe(false);
    expect(narrow.scrollLeft).toBe(0);

    const wide = createScroller({ scrollWidth: 1000 });
    expect(scrollPreviewWithKeyboard(wide, key('ArrowRight'))).toBe(true);
    expect(wide.scrollLeft).toBe(PREVIEW_KEYBOARD_LINE_STEP);
    for (let index = 0; index < 10; index += 1) {
      scrollPreviewWithKeyboard(wide, key('ArrowRight'));
    }
    expect(wide.scrollLeft).toBe(200);
    expect(scrollPreviewWithKeyboard(wide, key('ArrowLeft'))).toBe(true);
    expect(wide.scrollLeft).toBe(200 - PREVIEW_KEYBOARD_LINE_STEP);
  });

  it('reports unhandled keys without touching the scroll position', () => {
    const scroller = createScroller();
    scroller.scrollTop = 100;
    expect(scrollPreviewWithKeyboard(scroller, key('Enter'))).toBe(false);
    expect(scrollPreviewWithKeyboard(scroller, key('ArrowDown', { ctrl: true }))).toBe(false);
    expect(scroller.scrollTop).toBe(100);
  });
});

describe('shouldPreviewHandleKeyboardScroll', () => {
  it('accepts the shell, the scroller and plain buttons as targets', () => {
    const scroller = createScroller();
    const button = document.createElement('button');
    document.body.appendChild(button);
    const link = document.createElement('a');
    scroller.appendChild(link);

    expect(shouldPreviewHandleKeyboardScroll(null, scroller)).toBe(true);
    expect(shouldPreviewHandleKeyboardScroll(document, scroller)).toBe(true);
    expect(shouldPreviewHandleKeyboardScroll(document.body, scroller)).toBe(true);
    expect(shouldPreviewHandleKeyboardScroll(document.documentElement, scroller)).toBe(true);
    expect(shouldPreviewHandleKeyboardScroll(scroller, scroller)).toBe(true);
    expect(shouldPreviewHandleKeyboardScroll(button, scroller)).toBe(true);
    expect(shouldPreviewHandleKeyboardScroll(link, scroller)).toBe(true);
  });

  it('yields to controls that own their arrow keys', () => {
    const scroller = createScroller();
    const owners: Element[] = [];

    const input = document.createElement('input');
    owners.push(input);
    const textarea = document.createElement('textarea');
    owners.push(textarea);
    const editable = document.createElement('div');
    editable.setAttribute('contenteditable', 'true');
    owners.push(editable);
    const monaco = document.createElement('div');
    monaco.className = 'monaco-editor';
    const monacoInner = document.createElement('span');
    monaco.appendChild(monacoInner);
    owners.push(monacoInner);
    const tab = document.createElement('button');
    tab.setAttribute('role', 'tab');
    owners.push(tab);
    const slider = document.createElement('input');
    slider.type = 'range';
    owners.push(slider);
    const menuItem = document.createElement('button');
    menuItem.setAttribute('role', 'menuitem');
    owners.push(menuItem);
    const dialog = document.createElement('dialog');
    dialog.setAttribute('open', '');
    const dialogButton = document.createElement('button');
    dialog.appendChild(dialogButton);
    owners.push(dialogButton);

    for (const owner of owners) {
      document.body.appendChild(owner === monacoInner ? monaco : owner === dialogButton ? dialog : owner);
      expect(shouldPreviewHandleKeyboardScroll(owner, scroller)).toBe(false);
    }
  });
});
