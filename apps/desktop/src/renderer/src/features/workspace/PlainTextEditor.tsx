import { forwardRef, useCallback, useImperativeHandle, useRef } from 'react';
import type { MonacoEditorHandle } from './MonacoEditor.js';

/** Textarea fallback used in safe mode or when Monaco fails to start. */
interface TextEditorProps {
  value: string;
  onChange: (value: string) => void;
  onScrollChange?: (state: {
    scrollTop: number;
    scrollHeight: number;
    viewportHeight: number;
  }) => void;
}

export const PlainTextEditor = forwardRef<MonacoEditorHandle, TextEditorProps>(
  function PlainTextEditor({ value, onChange, onScrollChange }, ref) {
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);

    const emitScrollSnapshot = useCallback(() => {
      const textarea = textareaRef.current;
      if (!textarea) {
        return;
      }
      onScrollChange?.({
        scrollTop: textarea.scrollTop,
        scrollHeight: textarea.scrollHeight,
        viewportHeight: textarea.clientHeight,
      });
    }, [onScrollChange]);

    const replaceSelection = useCallback(
      (
        text: string,
        options?: {
          selectionStartOffset?: number;
          selectionEndOffset?: number;
        },
      ) => {
        const textarea = textareaRef.current;
        if (!textarea) {
          return;
        }

        const selectionStart = textarea.selectionStart;
        const selectionEnd = textarea.selectionEnd;
        const nextValue = `${value.slice(0, selectionStart)}${text}${value.slice(selectionEnd)}`;
        onChange(nextValue);

        requestAnimationFrame(() => {
          const nextTextarea = textareaRef.current;
          if (!nextTextarea) {
            return;
          }
          const startOffset = options?.selectionStartOffset ?? text.length;
          const endOffset = options?.selectionEndOffset ?? startOffset;
          nextTextarea.selectionStart = selectionStart + startOffset;
          nextTextarea.selectionEnd = selectionStart + endOffset;
          nextTextarea.focus();
        });
      },
      [onChange, value],
    );

    useImperativeHandle(
      ref,
      () => ({
        focus: () => textareaRef.current?.focus(),
        layout: () => undefined,
        scrollBy: (deltaY) => {
          if (textareaRef.current) {
            textareaRef.current.scrollTop += deltaY;
            emitScrollSnapshot();
          }
        },
        insertText: (text) => replaceSelection(text),
        replaceSelection,
        surroundSelection: ({ before, after, placeholder }) => {
          const textarea = textareaRef.current;
          if (!textarea) {
            return;
          }
          const selectedText = value.slice(textarea.selectionStart, textarea.selectionEnd);
          const innerText = selectedText || placeholder;
          replaceSelection(`${before}${innerText}${after}`, {
            selectionStartOffset: before.length,
            selectionEndOffset: before.length + innerText.length,
          });
        },
      }),
      [emitScrollSnapshot, replaceSelection, value],
    );

    return (
      <textarea
        ref={textareaRef}
        className="workspace__plain-editor"
        value={value}
        spellCheck={false}
        onChange={(event) => onChange(event.currentTarget.value)}
        onScroll={emitScrollSnapshot}
      />
    );
  },
);
