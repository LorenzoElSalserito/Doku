import { describe, expect, it } from 'vitest';
import {
  A4_TABLE_WIDTH_EM,
  chunkToken,
  layoutTableColumns,
  longestTokenEm,
  TABLE_PADDING_EM,
  textWidthEm,
  tokenFits,
} from './tableColumnLayout.js';

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

describe('tableColumnLayout', () => {
  it('estimates widths per glyph class, by characters not bytes', () => {
    expect(textWidthEm('ill')).toBeLessThan(textWidthEm('MMM'));
    expect(textWidthEm('Priorità')).toBeCloseTo(textWidthEm('Priorita'), 0);
    expect(longestTokenEm('Priorità alta')).toBeCloseTo(textWidthEm('Priorità'), 6);
    expect(longestTokenEm('')).toBe(0);
  });

  it('splits only tokens that do not fit, into chunks that do', () => {
    expect(chunkToken('Packaging', 6)).toBeNull();
    const chunks = chunkToken('MARK_TD_R1_VERY_LONG', 4);
    expect(chunks).not.toBeNull();
    expect(chunks!.join('')).toBe('MARK_TD_R1_VERY_LONG');
    for (const chunk of chunks!) {
      expect(tokenFits(chunk, 4), chunk).toBe(true);
    }
  });

  it('fits columns without splitting words when the minima fit the page', () => {
    const layout = layoutTableColumns(
      [
        { header: 'Area', cells: ['Editor', 'Export PDF', 'Packaging'] },
        { header: 'Stato', cells: ['Stabile', 'In revisione', 'Certificato'] },
        {
          header: 'Note',
          cells: ['Monaco con wrapping forzato, nessuna scrollbar orizzontale nel flusso di scrittura.'],
        },
      ],
      A4_TABLE_WIDTH_EM,
    );

    expect(layout.mode).toBe('fit');
    expect(sum(layout.fractions)).toBeCloseTo(1, 6);
    // "Packaging" and "Certificato" never have to break.
    expect(tokenFits('Packaging', layout.contentWidthsEm[0]!)).toBe(true);
    expect(tokenFits('Certificato', layout.contentWidthsEm[1]!)).toBe(true);
    // The prose column takes the leftover width.
    expect(layout.fractions[2]).toBeGreaterThan(0.5);
  });

  it('keeps short columns readable in a seven column table on A4', () => {
    const layout = layoutTableColumns(
      [
        { header: 'Requisito', cells: ['Indice incrementale', 'Query e viste', 'Canvas'] },
        {
          header: 'Descrizione estesa',
          cells: [
            "L'indice deve aggiornarsi entro 100 ms dal salvataggio di una nota, senza bloccare l'interfaccia.",
            'Tabella, kanban, calendario e galleria generate da una query salvata in un file Markdown.',
          ],
        },
        { header: 'Responsabile', cells: ['Team core', 'Team UI'] },
        { header: 'Priorità', cells: ['Alta', 'Media'] },
        { header: 'Scadenza', cells: ['2026-11-15', '2027-01-31'] },
        { header: 'Stato', cells: ['In corso', 'Pianificato'] },
        { header: 'Riferimento', cells: ['[[V2.4]]', '[[V2.10]]'] },
      ],
      A4_TABLE_WIDTH_EM,
    );

    // Seven columns with a prose column: whatever the mode, every real word
    // still fits its column on one line.
    expect(sum(layout.fractions)).toBeCloseTo(1, 6);
    expect(tokenFits('incrementale', layout.contentWidthsEm[0]!)).toBe(true);
    expect(tokenFits('2026-11-15', layout.contentWidthsEm[4]!)).toBe(true);
    expect(tokenFits('Pianificato', layout.contentWidthsEm[5]!)).toBe(true);
    expect(tokenFits('Media', layout.contentWidthsEm[3]!)).toBe(true);
    // The prose column gives up width but keeps a readable line.
    expect(layout.contentWidthsEm[1]!).toBeGreaterThan(5);
  });

  it('keeps a numeric table in fit mode with month names intact', () => {
    const layout = layoutTableColumns(
      [
        { header: 'Mese', cells: ['Luglio', 'Agosto', 'Settembre', 'Totale'] },
        { header: 'Note create', cells: ['1.240', '980', '1.512', '3.732'] },
        { header: 'Note modificate', cells: ['3.871', '2.904', '4.420', '11.195'] },
        { header: 'Export PDF', cells: ['212', '187', '265', '664'] },
        { header: 'Errori', cells: ['3', '1', '0', '4'] },
        { header: 'Tempo medio export (s)', cells: ['4,8', '4,6', '4,2', '4,5'] },
      ],
      A4_TABLE_WIDTH_EM,
    );
    expect(layout.mode).toBe('fit');
    expect(layout.paddingEm).toBe(1.2);
    expect(tokenFits('Settembre', layout.contentWidthsEm[0]!)).toBe(true);
  });

  it('falls back to dense mode with equal columns when minima overflow equally', () => {
    const columns = Array.from({ length: 14 }, (_, index) => ({
      header: `c${index + 1}`,
      cells: ['supercalifragilistichespiralidoso'],
    }));
    const layout = layoutTableColumns(columns, A4_TABLE_WIDTH_EM);

    expect(layout.mode).toBe('dense');
    expect(sum(layout.fractions)).toBeCloseTo(1, 6);
    // Equal content gives equal columns.
    expect(Math.max(...layout.fractions) - Math.min(...layout.fractions)).toBeLessThan(1e-9);
  });

  it('gives a wide prose column more room than a numeric one in dense mode', () => {
    const layout = layoutTableColumns(
      [
        { header: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', cells: ['x'.repeat(120)] },
        { header: 'n', cells: ['1'] },
      ],
      20,
    );

    expect(layout.mode).toBe('dense');
    expect(layout.fractions[0]).toBeGreaterThan(layout.fractions[1]);
    // The narrow column never drops below the floor of three characters.
    expect(layout.contentWidthsEm[1]!).toBeGreaterThan(1.5);
  });

  it('exposes the A4 text column width in em of the table font', () => {
    expect(A4_TABLE_WIDTH_EM).toBeCloseTo(45.6, 0);
    expect(TABLE_PADDING_EM).toBeGreaterThan(0);
  });

  it('handles empty tables and header-only tables', () => {
    expect(layoutTableColumns([], 40)).toEqual({ mode: 'fit', fractions: [], contentWidthsEm: [], paddingEm: 1.2 });
    const headerOnly = layoutTableColumns([{ header: 'Solo', cells: [] }, { header: 'Intestazione', cells: [] }], 40);
    expect(sum(headerOnly.fractions)).toBeCloseTo(1, 6);
  });
});
