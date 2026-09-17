// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeProvider } from '@doku/ui';
import { I18nProvider } from '../../i18n/I18nProvider.js';
import { GuideDialog } from './GuideDialog.js';

vi.mock('../workspace/MarkdownPreview.js', () => ({
  MarkdownPreview: ({ content }: { content: string }) => (
    <div data-testid="mock-markdown-preview">{content.slice(0, 40)}</div>
  ),
}));

function renderGuide(language: 'en' | 'it' = 'en') {
  return render(
    <I18nProvider language={language}>
      <ThemeProvider preference="light">
        <GuideDialog open onClose={vi.fn()} />
      </ThemeProvider>
    </I18nProvider>,
  );
}

describe('GuideDialog', () => {
  beforeEach(() => {
    HTMLDialogElement.prototype.showModal = vi.fn(function showModal(this: HTMLDialogElement) {
      this.open = true;
    });
    HTMLDialogElement.prototype.close = vi.fn(function close(this: HTMLDialogElement) {
      this.open = false;
    });
    window.sessionStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it('shows all nine sections with icons, including the markdown basics', () => {
    renderGuide();
    const nav = screen.getByRole('navigation', { name: 'Guide sections' });
    const titles = within(nav)
      .getAllByRole('button')
      .map((button) => button.querySelector('.guide-center__nav-title')?.textContent);
    expect(titles).toEqual([
      'Quick start',
      'UI tour',
      'Markdown basics',
      'Diagrams and charts',
      'Export to PDF',
      'Typography, theme and zoom',
      'Workspace, panels and data',
      'Shortcuts and rhythm',
      'Markdown manual',
    ]);
    for (const button of within(nav).getAllByRole('button')) {
      expect(button.querySelector('svg[data-icon]')).not.toBeNull();
    }
    expect(screen.getByText('9 sections')).toBeInTheDocument();
  });

  it('renders shortcuts as a keyboard table', () => {
    renderGuide();
    const nav = screen.getByRole('navigation', { name: 'Guide sections' });
    fireEvent.click(within(nav).getByRole('button', { name: /Shortcuts and rhythm/ }));
    const table = screen.getByRole('table');
    expect(within(table).getAllByRole('row')).toHaveLength(10);
    expect(within(table).getAllByText('Ctrl/Cmd').length).toBeGreaterThan(3);
    expect(within(table).getByText('Save the document')).toBeInTheDocument();
    expect(table.querySelectorAll('kbd').length).toBeGreaterThan(12);
  });

  it('filters sections by search text and reports the count', () => {
    renderGuide();
    const search = screen.getByLabelText('Search the guide');
    fireEvent.change(search, { target: { value: 'weasyprint' } });
    const nav = screen.getByRole('navigation', { name: 'Guide sections' });
    expect(within(nav).getAllByRole('button')).toHaveLength(1);
    expect(screen.getByText('1 sections')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Export to PDF' })).toBeInTheDocument();

    fireEvent.change(search, { target: { value: 'nothing-matches-this' } });
    expect(screen.getAllByText('No section matches the current search.').length).toBeGreaterThan(0);
  });

  it('is fully localised (Italian)', () => {
    renderGuide('it');
    const nav = screen.getByRole('navigation', { name: 'Sezioni guida' });
    expect(within(nav).getByRole('button', { name: /Diagrammi e grafici/ })).toBeInTheDocument();
    expect(within(nav).getByRole('button', { name: /Esporta in PDF/ })).toBeInTheDocument();
    expect(screen.getByText('9 sezioni')).toBeInTheDocument();
    fireEvent.click(within(nav).getByRole('button', { name: /Scorciatoie e ritmo/ }));
    expect(screen.getByText('Salva il documento')).toBeInTheDocument();
  });
});
