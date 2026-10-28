// @vitest-environment jsdom

import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { buildMarkdownTable } from './markdownActions.js';
import { MarkdownPreview } from './MarkdownPreview.js';

describe('MarkdownPreview', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders markdown tables as real table markup', () => {
    render(
      <MarkdownPreview
        emptyLabel="Empty"
        content={[
          '# Report',
          '',
          '| Name | Status |',
          '| --- | --- |',
          '| Alpha | Ready |',
          '| Beta | Blocked |',
        ].join('\n')}
      />,
    );

    const table = screen.getByRole('table');

    expect(within(table).getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
    expect(within(table).getByRole('columnheader', { name: 'Status' })).toBeInTheDocument();
    expect(within(table).getByRole('cell', { name: 'Alpha' })).toBeInTheDocument();
    expect(within(table).getByRole('cell', { name: 'Blocked' })).toBeInTheDocument();
  });

  it('nests lists, keeps ordered numbering and renders task boxes and footnotes', () => {
    const { container } = render(
      <MarkdownPreview
        emptyLabel="Empty"
        content={[
          '1. Primo',
          '2. Secondo con **16 sprint**',
          '   - figlio uno',
          '   - figlio due',
          '3. Terzo',
          '',
          '- [x] Fatto',
          '- [ ] Da fare',
          '',
          'Testo ~~barrato~~ con nota[^1] e https://example.org/auto.',
          '',
          '[^1]: Corpo della nota.',
        ].join('\n')}
      />,
    );

    const ordered = container.querySelector('ol.markdown-preview__list--ordered');
    expect(ordered).not.toBeNull();
    expect(ordered?.querySelectorAll(':scope > li')).toHaveLength(3);
    expect(ordered?.querySelector(':scope > li:nth-child(2) > ul')?.querySelectorAll('li')).toHaveLength(2);

    const tasks = container.querySelectorAll('li.markdown-preview__task');
    expect(tasks).toHaveLength(2);
    expect(tasks[0]?.querySelector('.doku-task--checked')).not.toBeNull();
    expect(tasks[1]?.querySelector('.doku-task--checked')).toBeNull();
    expect(tasks[1]?.textContent?.trim()).toBe('Da fare');

    expect(container.querySelector('del')?.textContent).toBe('barrato');
    expect(container.querySelector('a[href="https://example.org/auto"]')).not.toBeNull();
    expect(container.querySelector('.markdown-preview__footnote-ref a')?.textContent).toBe('1');
    expect(container.querySelector('.markdown-preview__footnotes li')?.textContent).toContain(
      'Corpo della nota.',
    );
  });

  it('sizes table columns with the shared layout and tags the mode', () => {
    const { container } = render(
      <MarkdownPreview
        emptyLabel="Empty"
        content={['| Area | Note |', '| --- | --- |', '| Editor | Testo descrittivo lungo che va a capo |'].join('\n')}
      />,
    );

    const wrap = container.querySelector('.markdown-preview__table-wrap');
    expect(wrap?.getAttribute('data-table-mode')).toBe('fit');
    const cols = container.querySelectorAll('colgroup col');
    expect(cols).toHaveLength(2);
    const widths = [...cols].map((col) => parseFloat((col as HTMLElement).style.width));
    expect(widths[0]! + widths[1]!).toBeCloseTo(100, 0);
    expect(widths[1]!).toBeGreaterThan(widths[0]!);
  });

  it('renders the table inserted by the quick action helper', () => {
    render(
      <MarkdownPreview
        emptyLabel="Empty"
        content={buildMarkdownTable(2, 3)}
      />,
    );

    const table = screen.getByRole('table');

    expect(within(table).getAllByRole('columnheader')).toHaveLength(3);
    expect(within(table).getAllByRole('row')).toHaveLength(3);
    expect(within(table).getAllByRole('cell', { name: 'Value 1' })).toHaveLength(2);
  });

  const visualLabels = {
    loading: 'Loading visual block…',
    fallback: 'Visual block',
    errorTitle: 'Invalid visual block',
  };

  it('routes mermaid fences to the visual block view (lazy fallback visible synchronously)', () => {
    render(
      <MarkdownPreview
        emptyLabel="Empty"
        visualLabels={visualLabels}
        content={['```mermaid', 'flowchart TD', '  A --> B', '```'].join('\n')}
      />,
    );

    expect(screen.getByTestId('visual-block-loading-mermaid')).toBeInTheDocument();
    // The plain code block renderer must NOT be used for mermaid fences.
    expect(screen.queryByText('flowchart TD')).not.toBeInTheDocument();
  });

  it('routes markmap fences to the visual block view', () => {
    render(
      <MarkdownPreview
        emptyLabel="Empty"
        visualLabels={visualLabels}
        content={['```markmap', '# Root', '## Child', '```'].join('\n')}
      />,
    );
    expect(screen.getByTestId('visual-block-loading-markmap')).toBeInTheDocument();
  });

  it('renders an inline error for invalid chart payloads instead of crashing the preview', () => {
    render(
      <MarkdownPreview
        emptyLabel="Empty"
        visualLabels={visualLabels}
        content={['```chart', '{ not json', '```'].join('\n')}
      />,
    );

    const error = screen.getByRole('alert');
    expect(error).toHaveTextContent('Invalid visual block');
  });

  it('keeps generic code fences (e.g. ts) untouched as <pre><code>', () => {
    render(
      <MarkdownPreview
        emptyLabel="Empty"
        visualLabels={visualLabels}
        content={['```ts', 'const x = 1;', '```'].join('\n')}
      />,
    );
    expect(screen.getByText('const x = 1;')).toBeInTheDocument();
  });
});
