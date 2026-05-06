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
