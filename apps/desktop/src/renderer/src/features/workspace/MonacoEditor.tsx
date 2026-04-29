import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import 'monaco-editor/esm/vs/basic-languages/markdown/markdown.contribution';
import { useTheme } from '@doku/ui';

interface MonacoEditorProps {
  value: string;
  onChange: (value: string) => void;
  onScrollChange?: (state: { scrollTop: number; scrollHeight: number; viewportHeight: number }) => void;
}

export interface MonacoEditorHandle {
  focus: () => void;
  insertText: (text: string) => void;
  replaceSelection: (
    text: string,
    options?: {
      selectionStartOffset?: number;
      selectionEndOffset?: number;
    },
  ) => void;
  surroundSelection: (options: { before: string; after: string; placeholder: string }) => void;
}

export const MonacoEditor = forwardRef<MonacoEditorHandle, MonacoEditorProps>(function MonacoEditor(
  { value, onChange, onScrollChange },
  ref,
) {
  const { resolved, themeKey } = useTheme();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const changeSubscriptionRef = useRef<monaco.IDisposable | null>(null);
  const scrollSubscriptionRef = useRef<monaco.IDisposable | null>(null);
  const horizontalScrollSubscriptionRef = useRef<monaco.IDisposable | null>(null);
  const onChangeRef = useRef(onChange);
  const onScrollChangeRef = useRef(onScrollChange);
  const initialValueRef = useRef(value);
  const resolvedThemeRef = useRef(resolved);
  const applyReplacement = useCallback(
    (
      text: string,
      options?: {
        selectionStartOffset?: number;
        selectionEndOffset?: number;
      },
    ) => {
      const editor = editorRef.current;
      const model = editor?.getModel();
      const selection = editor?.getSelection();
      if (!editor || !model || !selection) {
        return;
      }

      const startOffset = model.getOffsetAt(selection.getStartPosition());
      editor.executeEdits('doku-quick-action', [
        {
          range: selection,
          text,
          forceMoveMarkers: true,
        },
      ]);

      const selectionStartOffset = options?.selectionStartOffset ?? text.length;
      const selectionEndOffset = options?.selectionEndOffset ?? selectionStartOffset;
      const nextStart = model.getPositionAt(startOffset + selectionStartOffset);
      const nextEnd = model.getPositionAt(startOffset + selectionEndOffset);
      editor.setSelection(
        new monaco.Selection(
          nextStart.lineNumber,
          nextStart.column,
          nextEnd.lineNumber,
          nextEnd.column,
        ),
      );
      editor.revealPositionInCenterIfOutsideViewport(nextEnd);
      editor.focus();
    },
    [],
  );

  useImperativeHandle(
    ref,
    () => ({
      focus: () => {
        editorRef.current?.focus();
      },
      insertText: (text: string) => {
        applyReplacement(text);
      },
      replaceSelection: (text, options) => {
        applyReplacement(text, options);
      },
      surroundSelection: ({ before, after, placeholder }) => {
        const editor = editorRef.current;
        const model = editor?.getModel();
        const selection = editor?.getSelection();
        if (!editor || !model || !selection) {
          return;
        }

        const selectedText = model.getValueInRange(selection);
        const innerText = selectedText || placeholder;
        const replacement = `${before}${innerText}${after}`;
        const startOffset = before.length;
        const endOffset = before.length + innerText.length;
        applyReplacement(replacement, {
          selectionStartOffset: startOffset,
          selectionEndOffset: endOffset,
        });
      },
    }),
    [applyReplacement],
  );

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    onScrollChangeRef.current = onScrollChange;
  }, [onScrollChange]);

  useEffect(() => {
    initialValueRef.current = value;
  }, [value]);

  useEffect(() => {
    resolvedThemeRef.current = resolved;
  }, [resolved]);

  useEffect(() => {
    const styles = getComputedStyle(document.documentElement);
    monaco.editor.defineTheme('doku-light', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'comment', foreground: normalizeColor(styles.getPropertyValue('--color-text-muted')) },
        { token: 'string', foreground: normalizeColor(styles.getPropertyValue('--color-accent-strong')) },
      ],
      colors: {
        'editor.background': styles.getPropertyValue('--color-surface').trim(),
        'editor.foreground': styles.getPropertyValue('--color-text-primary').trim(),
        'editorLineNumber.foreground': styles.getPropertyValue('--color-text-muted').trim(),
        'editorLineNumber.activeForeground': styles.getPropertyValue('--color-text-secondary').trim(),
        'editorCursor.foreground': styles.getPropertyValue('--color-accent').trim(),
        'editor.selectionBackground': styles.getPropertyValue('--color-accent-soft').trim(),
        'editor.inactiveSelectionBackground': styles.getPropertyValue('--color-border-subtle').trim(),
      },
    });
    monaco.editor.defineTheme('doku-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: normalizeColor(styles.getPropertyValue('--color-text-muted')) },
        { token: 'string', foreground: normalizeColor(styles.getPropertyValue('--color-accent-strong')) },
      ],
      colors: {
        'editor.background': styles.getPropertyValue('--color-surface').trim(),
        'editor.foreground': styles.getPropertyValue('--color-text-primary').trim(),
        'editorLineNumber.foreground': styles.getPropertyValue('--color-text-muted').trim(),
        'editorLineNumber.activeForeground': styles.getPropertyValue('--color-text-secondary').trim(),
        'editorCursor.foreground': styles.getPropertyValue('--color-accent').trim(),
        'editor.selectionBackground': styles.getPropertyValue('--color-accent-soft').trim(),
        'editor.inactiveSelectionBackground': styles.getPropertyValue('--color-border-subtle').trim(),
      },
    });

    monaco.editor.setTheme(resolved === 'dark' ? 'doku-dark' : 'doku-light');
  }, [resolved, themeKey]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    editorRef.current = monaco.editor.create(container, {
      value: initialValueRef.current,
      language: 'markdown',
      theme: resolvedThemeRef.current === 'dark' ? 'doku-dark' : 'doku-light',
      minimap: { enabled: false },
      lineNumbers: 'on',
      wordWrap: 'on',
      wordWrapOverride1: 'on',
      wordWrapOverride2: 'on',
      wrappingIndent: 'none',
      wrappingStrategy: 'advanced',
      scrollPredominantAxis: true,
      scrollBeyondLastLine: false,
      automaticLayout: true,
      padding: getEditorPadding(),
      ...getEditorTypography(),
      smoothScrolling: true,
      tabSize: 2,
      insertSpaces: true,
      guides: {
        indentation: false,
      },
      overviewRulerBorder: false,
      glyphMargin: false,
      folding: false,
      renderLineHighlight: 'gutter',
      scrollbar: {
        alwaysConsumeMouseWheel: false,
        horizontal: 'hidden',
        horizontalScrollbarSize: 0,
        horizontalSliderSize: 0,
        handleMouseWheel: true,
      },
    });

    lockHorizontalScroll(editorRef.current);

    changeSubscriptionRef.current = editorRef.current.onDidChangeModelContent(() => {
      onChangeRef.current(editorRef.current?.getValue() ?? '');
    });

    const emitScrollSnapshot = () => {
      const editor = editorRef.current;
      const domNode = editor?.getDomNode();
      if (!editor || !domNode) {
        return;
      }

      onScrollChangeRef.current?.({
        scrollTop: editor.getScrollTop(),
        scrollHeight: editor.getScrollHeight(),
        viewportHeight: domNode.clientHeight,
      });
    };

    scrollSubscriptionRef.current = editorRef.current.onDidScrollChange(() => {
      emitScrollSnapshot();
    });
    horizontalScrollSubscriptionRef.current = editorRef.current.onDidScrollChange(() => {
      lockHorizontalScroll(editorRef.current);
    });

    const scheduleWheelSync = () => {
      window.requestAnimationFrame(() => {
        lockHorizontalScroll(editorRef.current);
        emitScrollSnapshot();
      });
    };

    container.addEventListener('wheel', scheduleWheelSync, { passive: true });
    container.addEventListener('touchmove', scheduleWheelSync, { passive: true });
    emitScrollSnapshot();

    return () => {
      container.removeEventListener('wheel', scheduleWheelSync);
      container.removeEventListener('touchmove', scheduleWheelSync);
      changeSubscriptionRef.current?.dispose();
      scrollSubscriptionRef.current?.dispose();
      horizontalScrollSubscriptionRef.current?.dispose();
      editorRef.current?.dispose();
      changeSubscriptionRef.current = null;
      scrollSubscriptionRef.current = null;
      horizontalScrollSubscriptionRef.current = null;
      editorRef.current = null;
    };
  }, []);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) {
      return;
    }

    editor.updateOptions({
      padding: getEditorPadding(),
      ...getEditorTypography(),
      wordWrap: 'on',
      wordWrapOverride1: 'on',
      wordWrapOverride2: 'on',
      wrappingIndent: 'none',
      wrappingStrategy: 'advanced',
      scrollPredominantAxis: true,
      scrollbar: {
        alwaysConsumeMouseWheel: false,
        horizontal: 'hidden',
        horizontalScrollbarSize: 0,
        horizontalSliderSize: 0,
        handleMouseWheel: true,
      },
    });
    lockHorizontalScroll(editor);
  }, [themeKey]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) {
      return;
    }

    if (editor.getValue() !== value) {
      editor.setValue(value);
      lockHorizontalScroll(editor);
    }
  }, [value]);

  return <div ref={containerRef} className="monaco-editor-host" />;
});

function normalizeColor(value: string): string {
  return value.trim().replace('#', '');
}

function lockHorizontalScroll(editor: monaco.editor.IStandaloneCodeEditor | null): void {
  if (!editor) {
    return;
  }

  editor.setScrollLeft(0);
  const domNode = editor.getDomNode();
  const scrollable = domNode?.querySelector<HTMLElement>('.monaco-scrollable-element');
  if (scrollable) {
    scrollable.scrollLeft = 0;
  }
}

function getEditorTypography(): { fontFamily: string; fontSize: number; lineHeight: number } {
  const rootStyles = getComputedStyle(document.documentElement);
  const rootFontSize = parseCssPx(rootStyles.fontSize, 16);
  const metricScale = Number.parseFloat(rootStyles.getPropertyValue('--font-metric-scale')) || 1;
  const fontSize = clamp(Math.round(rootFontSize * metricScale), 11, 28);

  return {
    fontFamily: rootStyles.getPropertyValue('--font-sans').trim() || 'Inter, sans-serif',
    fontSize,
    lineHeight: Math.round(fontSize * 1.65),
  };
}

function getEditorPadding(): { top: number; bottom: number } {
  const rootFontSize = parseCssPx(getComputedStyle(document.documentElement).fontSize, 16);
  const padding = Math.round(rootFontSize * 1.5);
  return { top: padding, bottom: padding };
}

function parseCssPx(value: string, fallback: number): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
