/**
 * Column sizing shared by the preview and the PDF exports.
 *
 * The same algorithm lives in `packages/infrastructure/src/export/tableWidths.lua`
 * (pandoc filter for LuaLaTeX and WeasyPrint). Keep the two in sync: the
 * preview page and the exported sheet have the same text column (A4, 168 mm),
 * so identical fractions give identical wrapping in all three renderings.
 *
 * Model: every column needs at least its longest unbreakable body token
 * (`min`) and would like its longest line (`max`).
 *
 * 1. "fit": with the regular cell padding every column gets at least its
 *    minimum and the leftover width is shared in proportion to how much each
 *    column wants to grow. No word is ever split.
 * 2. "dense": the minima overflow with regular padding, so the cells use the
 *    tight padding. If that is enough the widths are distributed as in fit
 *    mode and still no word has to break. If even that overflows, prose
 *    columns (long lines, which wrap anyway) give up width first, down to a
 *    readable line, then every column shares what is left; tokens may then
 *    break where needed, as in the exported PDF.
 *
 * Text widths are estimated per glyph class (capitals, digits and underscores
 * are wide, i/l/t and punctuation narrow) with a safety factor, so a word
 * always has room whatever bundled family is in use; the same estimate
 * decides where LaTeX may break a token that truly cannot fit.
 */

/** Safety factor on estimated widths when allocating columns. */
export const TABLE_WIDTH_SAFETY = 1.08;
/** Regular cell padding (0.6 em per side) and the tight one of dense tables (0.35 em). */
export const TABLE_PADDING_EM = 1.2;
export const TABLE_DENSE_PADDING_EM = 0.7;
/** Room kept beyond the estimated word width, against glyph-width estimates. */
export const TABLE_SAFETY_EM = 0.25;
export const TABLE_MAX_LINE_CHARS = 48;
export const TABLE_MIN_CHARS = 3;
/** Columns whose longest line is longer than this are prose: they wrap anyway. */
export const TABLE_PROSE_CHARS = 24;
/** A prose column keeps at least this many characters per line while giving up width. */
export const TABLE_PROSE_MIN_CHARS = 10;

export type TableLayoutMode = 'fit' | 'dense';

export interface TableColumnText {
  header: string;
  cells: string[];
}

export interface TableColumnLayout {
  mode: TableLayoutMode;
  /** Column widths as fractions of the available width, summing to 1. */
  fractions: number[];
  /** Width available to text in each column (em of the table font). */
  contentWidthsEm: number[];
  /** Horizontal padding per column (both sides) in em, for the mode in use. */
  paddingEm: number;
}

const NARROW = new Set(['i', 'j', 'l', 't', 'f', 'r', '.', ',', "'", ';', ':', '!', '|', '`']);
const WIDE_LOWER = new Set(['m', 'w']);
const WIDE_UPPER = new Set(['M', 'W']);
const BRACKETS = new Set(['(', ')', '[', ']', '{', '}', '/', '\\']);

/** Estimated advance width of one glyph in em of a proportional text face. */
export function glyphWidthEm(char: string): number {
  if (char === ' ') return 0.28;
  if (NARROW.has(char)) return 0.3;
  if (WIDE_LOWER.has(char)) return 0.82;
  if (WIDE_UPPER.has(char)) return 0.95;
  if (char === '-') return 0.36;
  if (BRACKETS.has(char)) return 0.38;
  if (char === '_') return 0.55;
  if (/[0-9]/.test(char)) return 0.56;
  if (/[A-Z]/.test(char)) return 0.7;
  if (/[a-z]/.test(char)) return 0.52;
  if (/\p{Lu}/u.test(char)) return 0.72;
  return 0.58;
}

/** Estimated width of a text run in em. */
export function textWidthEm(text: string): number {
  let width = 0;
  for (const char of text) {
    width += glyphWidthEm(char);
  }
  return width;
}

/** Width of the widest unbreakable token of a text, in em. */
export function longestTokenEm(text: string): number {
  let longest = 0;
  for (const token of text.split(/\s+/)) {
    const width = textWidthEm(token);
    if (width > longest) {
      longest = width;
    }
  }
  return longest;
}

/** Whether a token fits on one line of a column of the given content width. */
export function tokenFits(token: string, contentWidthEm: number): boolean {
  return textWidthEm(token) * TABLE_WIDTH_SAFETY <= contentWidthEm;
}

/**
 * Splits a token that does not fit into chunks that do (greedy, by estimated
 * width), for LaTeX discretionary break points. Returns null when it fits.
 */
export function chunkToken(token: string, contentWidthEm: number): string[] | null {
  if (tokenFits(token, contentWidthEm)) {
    return null;
  }
  const limit = Math.max(contentWidthEm / TABLE_WIDTH_SAFETY, glyphWidthEm('W') * TABLE_MIN_CHARS);
  const chunks: string[] = [];
  let current = '';
  let width = 0;
  for (const char of token) {
    const advance = glyphWidthEm(char);
    if (current && width + advance > limit) {
      chunks.push(current);
      current = '';
      width = 0;
    }
    current += char;
    width += advance;
  }
  if (current) chunks.push(current);
  return chunks;
}

interface ColumnMeasure {
  /** Widest unbreakable body token, em. */
  tokenEm: number;
  /** Longest line (capped), em. */
  lineEm: number;
  /** Longest line in characters, to tell prose columns apart. */
  lineChars: number;
}

const MIN_TOKEN_EM = TABLE_MIN_CHARS * 0.6;
const MAX_LINE_EM = TABLE_MAX_LINE_CHARS * 0.55;

function measure(columns: TableColumnText[]): ColumnMeasure[] {
  return columns.map((column) => {
    const bodyTokens = column.cells.map(longestTokenEm);
    const tokenEm = bodyTokens.length > 0 ? Math.max(...bodyTokens) : longestTokenEm(column.header);
    const lineEm = Math.max(textWidthEm(column.header), ...column.cells.map(textWidthEm), 0);
    const lineChars = Math.max(
      Array.from(column.header).length,
      ...column.cells.map((cell) => Array.from(cell).length),
      0,
    );
    return { tokenEm, lineEm: Math.min(lineEm, MAX_LINE_EM), lineChars };
  });
}

function minimumWidth(tokenEm: number, paddingEm: number): number {
  return Math.max(tokenEm, MIN_TOKEN_EM) * TABLE_WIDTH_SAFETY + TABLE_SAFETY_EM + paddingEm;
}

function maximumWidth(lineEm: number, minimum: number, paddingEm: number): number {
  return Math.max(minimum, lineEm * TABLE_WIDTH_SAFETY + TABLE_SAFETY_EM + paddingEm);
}

/** Fit distribution: minima plus the leftover shared by the wish to grow. */
function distribute(minimums: number[], maximums: number[], available: number): number[] {
  const sumMin = minimums.reduce((sum, value) => sum + value, 0);
  const extra = available - sumMin;
  const growth = minimums.map((minimum, index) => Math.max(maximums[index]! - minimum, 0));
  const sumGrowth = growth.reduce((sum, value) => sum + value, 0);
  return minimums.map((minimum, index) =>
    sumGrowth > 0 ? minimum + (extra * growth[index]!) / sumGrowth : minimum + (extra * minimum) / sumMin,
  );
}

/** Dense shrink: prose columns first (down to a readable line), then everyone. */
function shrink(minimums: number[], measures: ColumnMeasure[], available: number, paddingEm: number): number[] {
  const floor = minimumWidth(MIN_TOKEN_EM, paddingEm);
  const proseFloor = minimumWidth(TABLE_PROSE_MIN_CHARS * 0.55, paddingEm);
  let widths = [...minimums];
  let deficit = widths.reduce((sum, value) => sum + value, 0) - available;
  const tiers: Array<(index: number) => number> = [
    (index) => (measures[index]!.lineChars > TABLE_PROSE_CHARS ? Math.max(widths[index]! - proseFloor, 0) : 0),
    (index) => Math.max(widths[index]! - floor, 0),
  ];
  for (const slackOf of tiers) {
    if (deficit <= 0) break;
    const slack = widths.map((_width, index) => slackOf(index));
    const sumSlack = slack.reduce((sum, value) => sum + value, 0);
    if (sumSlack <= 0) continue;
    const taken = Math.min(deficit, sumSlack);
    widths = widths.map((width, index) => width - (taken * slack[index]!) / sumSlack);
    deficit -= taken;
  }
  return widths;
}

export function layoutTableColumns(
  columns: TableColumnText[],
  availableEm: number,
): TableColumnLayout {
  const count = columns.length;
  if (count === 0) {
    return { mode: 'fit', fractions: [], contentWidthsEm: [], paddingEm: TABLE_PADDING_EM };
  }

  const measures = measure(columns);
  const available = Math.max(availableEm, count * minimumWidth(MIN_TOKEN_EM, TABLE_DENSE_PADDING_EM));

  let mode: TableLayoutMode = 'fit';
  let paddingEm = TABLE_PADDING_EM;
  let minimums = measures.map((column) => minimumWidth(column.tokenEm, paddingEm));
  let widths: number[];

  const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

  if (sum(minimums) <= available) {
    widths = distribute(
      minimums,
      measures.map((column, index) => maximumWidth(column.lineEm, minimums[index]!, paddingEm)),
      available,
    );
  } else {
    mode = 'dense';
    paddingEm = TABLE_DENSE_PADDING_EM;
    minimums = measures.map((column) => minimumWidth(column.tokenEm, paddingEm));
    widths =
      sum(minimums) <= available
        ? distribute(
            minimums,
            measures.map((column, index) => maximumWidth(column.lineEm, minimums[index]!, paddingEm)),
            available,
          )
        : shrink(minimums, measures, available, paddingEm);
  }

  const total = sum(widths);
  const fractions = widths.map((width) => width / total);
  const contentWidthsEm = widths.map((width) => Math.max(width - paddingEm, 0));

  return { mode, fractions, contentWidthsEm, paddingEm };
}

/** A4 text column (210 − 26 − 16 mm) in em of the table font (0.95 × 11 pt). */
export const A4_TABLE_WIDTH_EM = (168 / 25.4) * 72 / (11 * 0.95);
