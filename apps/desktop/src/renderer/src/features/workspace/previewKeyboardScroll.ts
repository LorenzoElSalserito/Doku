/**
 * Keyboard scrolling for the full-page preview.
 *
 * Chromium only routes arrow / page keys to a scroll container when that
 * container (or something inside it) owns the focus, or when it is the
 * document's own scroller. The preview lives in an inner `overflow: auto`
 * pane inside a fixed-height app shell, so without explicit handling the
 * keys land on `body` and nothing moves. This module implements the
 * scrolling itself so the behaviour never depends on where the focus ended
 * up after the user clicked a toolbar button or switched view mode.
 */

/** Pixels moved by a single arrow-key press. */
export const PREVIEW_KEYBOARD_LINE_STEP = 48;
/** Fraction of the viewport moved by PageUp / PageDown / Space. */
export const PREVIEW_KEYBOARD_PAGE_RATIO = 0.9;

/**
 * Elements whose own keyboard interaction must win over preview scrolling
 * (text fields, sliders, tab lists, menus, Monaco, open dialogs).
 */
const KEYBOARD_OWNER_SELECTOR = [
  'input',
  'textarea',
  'select',
  '[contenteditable=""]',
  '[contenteditable="true"]',
  '[contenteditable="plaintext-only"]',
  '.monaco-editor',
  '[role="tab"]',
  '[role="tablist"]',
  '[role="slider"]',
  '[role="menu"]',
  '[role="menuitem"]',
  '[role="menuitemcheckbox"]',
  '[role="menuitemradio"]',
  '[role="listbox"]',
  '[role="option"]',
  '[role="combobox"]',
  '[role="tree"]',
  '[role="treeitem"]',
  '[role="grid"]',
  '[role="gridcell"]',
  '[role="spinbutton"]',
  'dialog[open]',
].join(', ');

export interface PreviewScrollKeyboardEventLike {
  key: string;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
}

export interface PreviewScrollMetrics {
  clientHeight: number;
  clientWidth: number;
  scrollHeight: number;
  scrollWidth: number;
}

export type PreviewScrollCommand =
  | { axis: 'vertical'; kind: 'relative'; amount: number }
  | { axis: 'vertical'; kind: 'absolute'; position: 'start' | 'end' }
  | { axis: 'horizontal'; kind: 'relative'; amount: number };

/**
 * Whether a key event that reached `window` should scroll the preview.
 *
 * Returns true when the focus sits on the page shell (`body`, `html`, the
 * container itself, a plain button) and false when it sits inside a control
 * that consumes arrow keys for its own purpose.
 */
export function shouldPreviewHandleKeyboardScroll(
  target: EventTarget | null,
  container: HTMLElement,
): boolean {
  if (!target || target === container) {
    return true;
  }

  if (typeof Document !== 'undefined' && target instanceof Document) {
    return true;
  }

  if (!(target instanceof Element)) {
    return false;
  }

  const doc = container.ownerDocument;
  if (target === doc.body || target === doc.documentElement) {
    return true;
  }

  return target.closest(KEYBOARD_OWNER_SELECTOR) === null;
}

/**
 * Translates a key press into a scroll command, or null when the key is not a
 * navigation key (or is combined with a modifier that gives it another
 * meaning, e.g. Ctrl+Home in an editor).
 */
export function resolvePreviewScrollCommand(
  event: PreviewScrollKeyboardEventLike,
  metrics: PreviewScrollMetrics,
): PreviewScrollCommand | null {
  if (event.altKey || event.ctrlKey || event.metaKey) {
    return null;
  }

  const pageStep = Math.max(Math.round(metrics.clientHeight * PREVIEW_KEYBOARD_PAGE_RATIO), 1);
  const horizontallyScrollable = metrics.scrollWidth > metrics.clientWidth + 1;

  switch (event.key) {
    case 'ArrowDown':
    case 'Down':
      return { axis: 'vertical', kind: 'relative', amount: PREVIEW_KEYBOARD_LINE_STEP };
    case 'ArrowUp':
    case 'Up':
      return { axis: 'vertical', kind: 'relative', amount: -PREVIEW_KEYBOARD_LINE_STEP };
    case 'PageDown':
      return { axis: 'vertical', kind: 'relative', amount: pageStep };
    case 'PageUp':
      return { axis: 'vertical', kind: 'relative', amount: -pageStep };
    case ' ':
    case 'Spacebar':
      return { axis: 'vertical', kind: 'relative', amount: event.shiftKey ? -pageStep : pageStep };
    case 'Home':
      return event.shiftKey ? null : { axis: 'vertical', kind: 'absolute', position: 'start' };
    case 'End':
      return event.shiftKey ? null : { axis: 'vertical', kind: 'absolute', position: 'end' };
    case 'ArrowRight':
    case 'Right':
      return horizontallyScrollable
        ? { axis: 'horizontal', kind: 'relative', amount: PREVIEW_KEYBOARD_LINE_STEP }
        : null;
    case 'ArrowLeft':
    case 'Left':
      return horizontallyScrollable
        ? { axis: 'horizontal', kind: 'relative', amount: -PREVIEW_KEYBOARD_LINE_STEP }
        : null;
    default:
      return null;
  }
}

/**
 * Applies a key press to the container. Returns true when the key was a
 * navigation key and the container was scrolled (so the caller should
 * `preventDefault()`), false when the key should keep its default meaning.
 */
export function scrollPreviewWithKeyboard(
  container: HTMLElement,
  event: PreviewScrollKeyboardEventLike,
): boolean {
  const command = resolvePreviewScrollCommand(event, container);
  if (!command) {
    return false;
  }

  if (command.axis === 'horizontal') {
    const maxLeft = Math.max(container.scrollWidth - container.clientWidth, 0);
    container.scrollLeft = clampScroll(container.scrollLeft + command.amount, maxLeft);
    return true;
  }

  const maxTop = Math.max(container.scrollHeight - container.clientHeight, 0);
  if (command.kind === 'absolute') {
    container.scrollTop = command.position === 'start' ? 0 : maxTop;
    return true;
  }

  container.scrollTop = clampScroll(container.scrollTop + command.amount, maxTop);
  return true;
}

function clampScroll(value: number, max: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(Math.max(value, 0), max);
}
