import { useEffect, useRef } from 'react';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import 'monaco-editor/esm/vs/basic-languages/markdown/markdown.contribution';
import { useTheme } from '@doku/ui';

interface MonacoEditorProps {
  value: string;
  onChange: (value: string) => void;
  onScrollChange?: (state: { scrollTop: number; scrollHeight: number; viewportHeight: number }) => void;
}

export function MonacoEditor({ value, onChange, onScrollChange }: MonacoEditorProps) {
  const { resolved, themeKey } = useTheme();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const changeSubscriptionRef = useRef<monaco.IDisposable | null>(null);
  const scrollSubscriptionRef = useRef<monaco.IDisposable | null>(null);
  const onChangeRef = useRef(onChange);
  const onScrollChangeRef = useRef(onScrollChange);
  const initialValueRef = useRef(value);
  const resolvedThemeRef = useRef(resolved);

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
      scrollBeyondLastLine: false,
      automaticLayout: true,
      padding: { top: 24, bottom: 24 },
      fontFamily: 'var(--font-sans)',
      fontSize: 15,
      lineHeight: 25,
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
      scrollbar: { alwaysConsumeMouseWheel: false },
    });

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

    const scheduleWheelSync = () => {
      window.requestAnimationFrame(() => {
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
      editorRef.current?.dispose();
      changeSubscriptionRef.current = null;
      scrollSubscriptionRef.current = null;
      editorRef.current = null;
    };
  }, []);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) {
      return;
    }

    if (editor.getValue() !== value) {
      editor.setValue(value);
    }
  }, [value]);

  return <div ref={containerRef} className="monaco-editor-host" />;
}

function normalizeColor(value: string): string {
  return value.trim().replace('#', '');
}
