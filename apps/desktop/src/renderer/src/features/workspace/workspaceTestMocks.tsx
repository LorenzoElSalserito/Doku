// Test-only module: stands in for ./MonacoEditor.js in the Workspace tests.
import { forwardRef, useImperativeHandle } from 'react';
import { vi } from 'vitest';

export const monacoRefState = {
  surroundSelection: vi.fn(),
  replaceSelection: vi.fn(),
  insertText: vi.fn(),
  focus: vi.fn(),
  layout: vi.fn(),
  scrollBy: vi.fn(),
};

export const MonacoEditor = forwardRef(function MockMonacoEditor(
  props: {
    value: string;
    onChange: (value: string) => void;
    onScrollChange?: (state: {
      scrollTop: number;
      scrollHeight: number;
      viewportHeight: number;
    }) => void;
  },
  ref,
) {
  useImperativeHandle(ref, () => monacoRefState);
  return (
    <textarea
      aria-label="Markdown editor"
      data-testid="mock-monaco-editor"
      value={props.value}
      onChange={(event) => props.onChange(event.currentTarget.value)}
    />
  );
});
