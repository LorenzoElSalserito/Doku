const { spawnSync } = require('node:child_process');

// A4 in PostScript points, plus the mirrored binding geometry declared in
// packages/infrastructure/src/export/printStylesheet.css.
const A4_WIDTH_PT = 595.276;
const A4_HEIGHT_PT = 841.89;
const PT_PER_MM = 72 / 25.4;
const OUTER_MARGIN_MM = 16;
const INNER_MARGIN_MM = 26;
// Rounding slack between WeasyPrint's layout and poppler's glyph boxes.
const EDGE_TOLERANCE_PT = 1.5;

function hasPdfTools() {
  return ['pdftotext', 'pdfinfo'].every(
    (binary) => spawnSync('which', [binary], { encoding: 'utf-8' }).status === 0,
  );
}

function run(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf-8', maxBuffer: 32 * 1024 * 1024 });
  if (result.status !== 0) {
    throw new Error(`${command} failed: ${result.stderr || result.stdout}`);
  }
  return result.stdout;
}

/** Whole PDF text with all whitespace stripped, for marker lookups. */
function readPdfText(pdfPath) {
  return run('pdftotext', [pdfPath, '-']);
}

function readPdfPageCount(pdfPath) {
  const match = /Pages:\s+(\d+)/.exec(run('pdfinfo', [pdfPath]));
  return match ? Number(match[1]) : 0;
}

function readPdfPageSize(pdfPath) {
  const match = /Page size:\s+([\d.]+) x ([\d.]+) pts/.exec(run('pdfinfo', [pdfPath]));
  return match ? { width: Number(match[1]), height: Number(match[2]) } : null;
}

/** Per-page word boxes: [{ page, text, xMin, xMax, yMin, yMax }]. */
function readPdfWords(pdfPath) {
  const xml = run('pdftotext', ['-bbox', pdfPath, '-']);
  const words = [];
  const pageRe = /<page width="[\d.]+" height="[\d.]+">([\s\S]*?)<\/page>/g;
  const wordRe =
    /<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([\s\S]*?)<\/word>/g;

  let pageMatch;
  let pageNumber = 0;
  while ((pageMatch = pageRe.exec(xml)) !== null) {
    pageNumber += 1;
    let wordMatch;
    while ((wordMatch = wordRe.exec(pageMatch[1])) !== null) {
      words.push({
        page: pageNumber,
        xMin: Number(wordMatch[1]),
        yMin: Number(wordMatch[2]),
        xMax: Number(wordMatch[3]),
        yMax: Number(wordMatch[4]),
        text: wordMatch[5],
      });
    }
  }
  return words;
}

/**
 * Horizontal text band allowed on a given page. Page 1 is a recto (right-hand)
 * sheet, so odd pages bind on the left and even pages on the right.
 */
function textBandForPage(pageNumber) {
  const recto = pageNumber % 2 === 1;
  const inner = INNER_MARGIN_MM * PT_PER_MM;
  const outer = OUTER_MARGIN_MM * PT_PER_MM;
  return recto
    ? { left: inner, right: A4_WIDTH_PT - outer }
    : { left: outer, right: A4_WIDTH_PT - inner };
}

/** Words that fall outside the binding-safe text band of their page. */
function findOverflowingWords(words) {
  return words.filter((word) => {
    const band = textBandForPage(word.page);
    return (
      word.xMax > band.right + EDGE_TOLERANCE_PT || word.xMin < band.left - EDGE_TOLERANCE_PT
    );
  });
}

/** Markers (MARK_*) present in the source markdown but missing from the PDF. */
function findMissingMarkers(markdown, pdfText) {
  const markers = [...new Set(markdown.match(/\bMARK_[A-Z0-9_]+\b/g) ?? [])];
  const flattened = pdfText.replace(/\s+/g, '');
  return markers.filter((marker) => !flattened.includes(marker));
}

module.exports = {
  A4_HEIGHT_PT,
  A4_WIDTH_PT,
  EDGE_TOLERANCE_PT,
  INNER_MARGIN_MM,
  OUTER_MARGIN_MM,
  PT_PER_MM,
  findMissingMarkers,
  findOverflowingWords,
  hasPdfTools,
  readPdfPageCount,
  readPdfPageSize,
  readPdfText,
  readPdfWords,
  textBandForPage,
};
