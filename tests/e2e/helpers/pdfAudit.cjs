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
  return ['pdftotext', 'pdfinfo', 'pdfimages', 'pdffonts'].every(
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

/** Embedded raster/vector images: [{ page, width, height, type }]. */
function readPdfImages(pdfPath) {
  const listing = run('pdfimages', ['-list', pdfPath]);
  return listing
    .split('\n')
    .slice(2)
    .map((line) => line.trim().split(/\s+/))
    .filter((cells) => cells.length > 5 && /^\d+$/.test(cells[0]))
    .map((cells) => ({
      page: Number(cells[0]),
      type: cells[2],
      width: Number(cells[3]),
      height: Number(cells[4]),
    }));
}

/** Embedded font names, e.g. ["ABCDEF+Inter-Bold", ...]. */
function readPdfFonts(pdfPath) {
  return run('pdffonts', [pdfPath])
    .split('\n')
    .slice(2)
    .map((line) => line.trim().split(/\s+/)[0])
    .filter(Boolean);
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

/**
 * Words that fall outside the binding-safe text band of their page.
 * `tolerance` absorbs renderer rounding; LuaLaTeX + microtype also lets
 * hyphens and punctuation protrude optically by a couple of points.
 */
function findOverflowingWords(words, tolerance = EDGE_TOLERANCE_PT) {
  return words.filter((word) => {
    const band = textBandForPage(word.page);
    return word.xMax > band.right + tolerance || word.xMin < band.left - tolerance;
  });
}

/**
 * Rebuilds the text of narrow, wrapped table cells: words stacked vertically
 * in the same column (overlapping x-range, consecutive lines) are joined, so a
 * token such as MARK_TD_R1 broken as "MARK" / "_TD_" / "R1" is found again.
 */
function buildColumnChains(words) {
  const chains = [];
  const byPage = new Map();
  for (const word of words) {
    if (!byPage.has(word.page)) byPage.set(word.page, []);
    byPage.get(word.page).push(word);
  }
  for (const pageWords of byPage.values()) {
    const sorted = [...pageWords].sort((a, b) => a.yMin - b.yMin || a.xMin - b.xMin);
    const used = new Set();
    for (const start of sorted) {
      if (used.has(start)) continue;
      let current = start;
      let text = start.text;
      used.add(start);
      for (;;) {
        const lineHeight = current.yMax - current.yMin;
        const next = sorted.find(
          (candidate) =>
            !used.has(candidate) &&
            candidate.yMin > current.yMin + lineHeight * 0.5 &&
            candidate.yMin < current.yMax + lineHeight * 1.2 &&
            candidate.xMin < current.xMax + 1 &&
            candidate.xMax > current.xMin - 1,
        );
        if (!next) break;
        used.add(next);
        text += next.text;
        current = next;
      }
      chains.push(text);
    }
  }
  return chains;
}

/**
 * Markers (MARK_*) present in the source markdown but missing from the PDF.
 * Pass the `-bbox` words as well to recognise markers wrapped inside narrow
 * table cells (pdftotext emits those fragments out of order).
 */
function findMissingMarkers(markdown, pdfText, words = []) {
  const markers = [...new Set(markdown.match(/\bMARK_[A-Z0-9_]+\b/g) ?? [])];
  const flattened = pdfText.replace(/\s+/g, '');
  const chains = words.length > 0 ? buildColumnChains(words).map((chain) => chain.replace(/-$/, '')) : [];
  return markers.filter(
    (marker) => !flattened.includes(marker) && !chains.some((chain) => chain.replace(/\s+/g, '').includes(marker)),
  );
}

module.exports = {
  buildColumnChains,
  A4_HEIGHT_PT,
  A4_WIDTH_PT,
  EDGE_TOLERANCE_PT,
  INNER_MARGIN_MM,
  OUTER_MARGIN_MM,
  PT_PER_MM,
  findMissingMarkers,
  findOverflowingWords,
  hasPdfTools,
  readPdfFonts,
  readPdfImages,
  readPdfPageCount,
  readPdfPageSize,
  readPdfText,
  readPdfWords,
  textBandForPage,
};
