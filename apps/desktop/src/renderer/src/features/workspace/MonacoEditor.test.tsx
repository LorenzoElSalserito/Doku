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
});
