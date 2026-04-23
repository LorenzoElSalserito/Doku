import type { Dictionary } from '../../i18n/keys.js';

export type MarkdownActionId =
  | 'h1'
  | 'h2'
  | 'bold'
  | 'italic'
  | 'link'
  | 'image'
  | 'bullet-list'
  | 'ordered-list'
  | 'checklist'
  | 'quote'
  | 'inline-code'
  | 'code-block'
  | 'divider';

export type MarkdownActionSpec = {
  id: MarkdownActionId;
  label: (dict: Dictionary['workspace']['quickActions']) => string;
  kind: 'surround' | 'replace';
  before?: string;
  after?: string;
  placeholder?: string;
  text?: string;
  selectionStartOffset?: number;
  selectionEndOffset?: number;
};

export const MARKDOWN_ACTION_SPECS: MarkdownActionSpec[] = [
  {
    id: 'h1',
    label: (dict) => dict.h1,
    kind: 'replace',
    text: '# Heading',
    selectionStartOffset: 2,
    selectionEndOffset: 9,
  },
  {
    id: 'h2',
    label: (dict) => dict.h2,
    kind: 'replace',
    text: '## Section',
    selectionStartOffset: 3,
    selectionEndOffset: 10,
  },
  {
    id: 'bold',
    label: (dict) => dict.bold,
    kind: 'surround',
    before: '**',
    after: '**',
    placeholder: 'bold text',
  },
  {
    id: 'italic',
    label: (dict) => dict.italic,
    kind: 'surround',
    before: '*',
    after: '*',
    placeholder: 'italic text',
  },
  {
    id: 'link',
    label: (dict) => dict.link,
    kind: 'replace',
    text: '[Link label](https://example.com)',
    selectionStartOffset: 1,
    selectionEndOffset: 11,
  },
  {
    id: 'image',
    label: (dict) => dict.image,
    kind: 'replace',
    text: '![Image alt](./assets/image.png)',
    selectionStartOffset: 2,
    selectionEndOffset: 11,
  },
  {
    id: 'bullet-list',
    label: (dict) => dict.bulletList,
    kind: 'replace',
    text: '- Item one\n- Item two\n- Item three',
  },
  {
    id: 'ordered-list',
    label: (dict) => dict.orderedList,
    kind: 'replace',
    text: '1. First item\n2. Second item\n3. Third item',
  },
  {
    id: 'checklist',
    label: (dict) => dict.checklist,
    kind: 'replace',
    text: '- [ ] First task\n- [ ] Second task',
  },
  {
    id: 'quote',
    label: (dict) => dict.quote,
    kind: 'replace',
    text: '> Quoted note',
  },
  {
    id: 'inline-code',
    label: (dict) => dict.inlineCode,
    kind: 'surround',
    before: '`',
    after: '`',
    placeholder: 'code',
  },
  {
    id: 'code-block',
    label: (dict) => dict.codeBlock,
    kind: 'replace',
    text: '```ts\nconst value = true;\n```',
    selectionStartOffset: 6,
    selectionEndOffset: 24,
  },
  {
    id: 'divider',
    label: (dict) => dict.divider,
    kind: 'replace',
    text: '\n---\n',
  },
];

export function buildMarkdownTable(rows: number, columns: number): string {
  const safeRows = clamp(rows, 1, 12);
  const safeColumns = clamp(columns, 1, 8);

  const headers = Array.from({ length: safeColumns }, (_, index) => `Column ${index + 1}`);
  const separator = Array.from({ length: safeColumns }, () => '---');
  const bodyRows = Array.from({ length: safeRows }, () =>
    Array.from({ length: safeColumns }, (_, index) => `Value ${index + 1}`),
  );

  return [
    `| ${headers.join(' | ')} |`,
    `| ${separator.join(' | ')} |`,
    ...bodyRows.map((row) => `| ${row.join(' | ')} |`),
  ].join('\n');
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
