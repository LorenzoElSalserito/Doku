import { describe, expect, it } from 'vitest';
import {
  classifyCodeFence,
  extractFencedBlocks,
  findVisualBlocks,
} from './visualBlockParser.js';

describe('classifyCodeFence', () => {
  it('classifies mermaid fences', () => {
    const result = classifyCodeFence({ language: 'mermaid', source: 'flowchart TD\n  A --> B' });
    expect(result?.kind).toBe('mermaid');
  });

  it('classifies markmap fences', () => {
    const result = classifyCodeFence({ language: 'markmap', source: '# Root' });
    expect(result?.kind).toBe('markmap');
  });

  it('classifies and validates chart fences', () => {
    const valid = classifyCodeFence({
      language: 'chart',
      source: JSON.stringify({
        kind: 'chart',
        chartType: 'line',
        xKey: 'x',
        yKeys: ['y'],
        data: [{ x: 1, y: 2 }],
      }),
    });
    expect(valid?.kind).toBe('chart');
    if (valid?.kind === 'chart') {
      expect(valid.block.chartType).toBe('line');
    }
  });

  it('returns invalid block when chart JSON is malformed', () => {
    const broken = classifyCodeFence({ language: 'chart', source: '{ broken' });
    expect(broken?.kind).toBe('invalid');
  });

  it('returns invalid block when chart payload fails schema validation', () => {
    const bad = classifyCodeFence({ language: 'chart', source: '{}' });
    expect(bad?.kind).toBe('invalid');
  });

  it('returns null for plain code fences', () => {
    expect(classifyCodeFence({ language: 'ts', source: 'const x = 1;' })).toBeNull();
    expect(classifyCodeFence({ language: null, source: 'plain' })).toBeNull();
  });
});

describe('extractFencedBlocks / findVisualBlocks', () => {
  const markdown = [
    '# Doc',
    '',
    'Plain text paragraph.',
    '',
    '```ts',
    'const value = 1;',
    '```',
    '',
    '```mermaid',
    'flowchart TD',
    '  A --> B',
    '```',
    '',
    '```markmap',
    '# Root',
    '## Child',
    '```',
    '',
    '```chart',
    JSON.stringify({
      kind: 'chart',
      chartType: 'pie',
      xKey: 'name',
      yKeys: ['count'],
      data: [
        { name: 'A', count: 10 },
        { name: 'B', count: 5 },
      ],
    }),
    '```',
  ].join('\n');

  it('extracts every fenced block including non-visual ones', () => {
    const fences = extractFencedBlocks(markdown);
    expect(fences).toHaveLength(4);
    expect(fences.map((f) => f.language)).toEqual(['ts', 'mermaid', 'markmap', 'chart']);
  });

  it('produces only visual blocks via findVisualBlocks', () => {
    const blocks = findVisualBlocks(markdown);
    const kinds = blocks.map((b) => b.kind);
    expect(kinds).toEqual(['mermaid', 'markmap', 'chart']);
  });

  it('handles CRLF line endings consistently', () => {
    const crlf = markdown.replace(/\n/g, '\r\n');
    const blocks = findVisualBlocks(crlf);
    expect(blocks.map((b) => b.kind)).toEqual(['mermaid', 'markmap', 'chart']);
  });
});
