import { describe, expect, it } from 'vitest';
import { buildMarkdownTable, MARKDOWN_ACTION_SPECS } from './markdownActions.js';

describe('markdownActions', () => {
  it('builds a valid markdown table with requested dimensions', () => {
    const table = buildMarkdownTable(2, 3);

    expect(table).toBe(
      [
        '| Column 1 | Column 2 | Column 3 |',
        '| --- | --- | --- |',
        '| Value 1 | Value 2 | Value 3 |',
        '| Value 1 | Value 2 | Value 3 |',
      ].join('\n'),
    );
  });

  it('clamps table dimensions to safe bounds', () => {
    const table = buildMarkdownTable(0, 99);
    const lines = table.split('\n');

    expect(lines).toHaveLength(3);
    expect(lines[0]).toContain('Column 8');
  });

  it('keeps the quick action registry coherent for all actions', () => {
    expect(MARKDOWN_ACTION_SPECS.map((item) => item.id)).toEqual([
      'h1',
      'h2',
      'bold',
      'italic',
      'link',
      'image',
      'bullet-list',
      'ordered-list',
      'checklist',
      'quote',
      'inline-code',
      'code-block',
      'divider',
    ]);

    for (const action of MARKDOWN_ACTION_SPECS) {
      expect(action.id).toBeTruthy();
      expect(action.kind === 'replace' || action.kind === 'surround').toBe(true);

      if (action.kind === 'replace') {
        expect(action.text).toBeTruthy();
      }

      if (action.kind === 'surround') {
        expect(action.before).toBeDefined();
        expect(action.after).toBeDefined();
        expect(action.placeholder).toBeTruthy();
      }
    }
  });
});
