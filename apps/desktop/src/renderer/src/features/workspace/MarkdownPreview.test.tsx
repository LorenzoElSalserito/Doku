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
});
