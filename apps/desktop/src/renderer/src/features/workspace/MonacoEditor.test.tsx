// @vitest-environment jsdom

import { render } from '@testing-library/react';
import { ThemeProvider } from '@doku/ui';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MonacoEditor } from './MonacoEditor.js';

const monacoMock = vi.hoisted(() => {
  const scrollableElement = document.createElement('div');
  scrollableElement.className = 'monaco-scrollable-element';
  scrollableElement.scrollLeft = 80;
  const domNode = document.createElement('div');
  domNode.appendChild(scrollableElement);

  const editorInstance = {
    onDidChangeModelContent: vi.fn(() => ({ dispose: vi.fn() })),
    onDidScrollChange: vi.fn(() => ({ dispose: vi.fn() })),
    getScrollTop: vi.fn(() => 0),
    getScrollHeight: vi.fn(() => 100),
    getDomNode: vi.fn(() => domNode),
    getValue: vi.fn(() => 'long line'),
    setValue: vi.fn(),
    setScrollLeft: vi.fn(),
    updateOptions: vi.fn(),
    layout: vi.fn(),
    dispose: vi.fn(),
  };

  return {
    scrollableElement,
    editorInstance,
    editor: {
      create: vi.fn(() => editorInstance),
      defineTheme: vi.fn(),
      setTheme: vi.fn(),
    },
    Selection: vi.fn(),
  };
});

vi.mock('monaco-editor/esm/vs/editor/editor.api', () => monacoMock);
vi.mock('monaco-editor/esm/vs/basic-languages/markdown/markdown.contribution', () => ({}));

describe('MonacoEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.documentElement.removeAttribute('style');
    Object.defineProperty(document, 'fonts', {
      configurable: true,
      value: undefined,
    });
  });

  it('keeps markdown lines wrapped and disables the horizontal scrollbar', () => {
    render(
      <ThemeProvider preference="light">
        <MonacoEditor value="long line" onChange={vi.fn()} />
      </ThemeProvider>,
    );

    expect(monacoMock.editor.create).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      expect.objectContaining({
        wordWrap: 'on',
        wordWrapOverride1: 'on',
        wordWrapOverride2: 'on',
        wrappingIndent: 'none',
        wrappingStrategy: 'advanced',
        scrollPredominantAxis: true,
        scrollbar: expect.objectContaining({
          horizontal: 'hidden',
          horizontalScrollbarSize: 0,
          horizontalSliderSize: 0,
        }),
      }),
    );
    expect(monacoMock.editorInstance.setScrollLeft).toHaveBeenCalledWith(0);
    expect(monacoMock.scrollableElement.scrollLeft).toBe(0);
  });

  it('reapplies the horizontal scroll lock when the document value changes', () => {
    const view = render(
      <ThemeProvider preference="light">
        <MonacoEditor value="first file" onChange={vi.fn()} />
      </ThemeProvider>,
    );

    monacoMock.editorInstance.getValue.mockReturnValue('first file');
    monacoMock.scrollableElement.scrollLeft = 120;
    monacoMock.editorInstance.setScrollLeft.mockClear();

    view.rerender(
      <ThemeProvider preference="light">
        <MonacoEditor value="second file with a very long markdown line" onChange={vi.fn()} />
      </ThemeProvider>,
    );

    expect(monacoMock.editorInstance.setValue).toHaveBeenCalledWith(
      'second file with a very long markdown line',
    );
    expect(monacoMock.editorInstance.setScrollLeft).toHaveBeenCalledWith(0);
    expect(monacoMock.scrollableElement.scrollLeft).toBe(0);
  });

  it('normalizes rgba theme colors to Monaco-compatible hex alpha colors', () => {
    document.documentElement.style.setProperty('--color-surface', '#1a1a1e');
    document.documentElement.style.setProperty('--color-text-primary', '#e8e6e2');
    document.documentElement.style.setProperty('--color-text-secondary', '#9a9590');
    document.documentElement.style.setProperty('--color-text-muted', '#6f6a66');
    document.documentElement.style.setProperty('--color-accent', '#00a3ee');
    document.documentElement.style.setProperty('--color-accent-strong', '#66cfff');
    document.documentElement.style.setProperty('--color-accent-soft', 'rgba(102, 207, 255, 0.16)');
    document.documentElement.style.setProperty('--color-border-subtle', '#232328');

    render(
      <ThemeProvider preference="dark">
        <MonacoEditor value="selected text" onChange={vi.fn()} />
      </ThemeProvider>,
    );

    expect(monacoMock.editor.defineTheme).toHaveBeenCalledWith(
      'doku-dark',
      expect.objectContaining({
        colors: expect.objectContaining({
          'editor.selectionBackground': '#66cfff29',
          'editor.background': '#1a1a1e',
          'editor.foreground': '#e8e6e2',
        }),
      }),
    );
  });

  it('refreshes editor typography when browser fonts finish loading', () => {
    const fontEvents = new EventTarget();
    Object.defineProperty(document, 'fonts', {
      configurable: true,
      value: {
        ready: Promise.resolve(),
        addEventListener: vi.fn((type: string, listener: EventListener) => {
          fontEvents.addEventListener(type, listener);
        }),
        removeEventListener: vi.fn((type: string, listener: EventListener) => {
          fontEvents.removeEventListener(type, listener);
        }),
      },
    });

    render(
      <ThemeProvider preference="light">
        <MonacoEditor value="font reload" onChange={vi.fn()} />
      </ThemeProvider>,
    );

    monacoMock.editorInstance.updateOptions.mockClear();
    monacoMock.editorInstance.layout.mockClear();

    fontEvents.dispatchEvent(new Event('loadingdone'));

    expect(monacoMock.editorInstance.updateOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        fontFamily: expect.any(String),
        fontSize: expect.any(Number),
        lineHeight: expect.any(Number),
      }),
    );
    expect(monacoMock.editorInstance.layout).toHaveBeenCalled();
  });
});
