import { DOKU_FONT_CATALOG, DEFAULT_DOKU_TYPOGRAPHY, type DokuTypography } from '@doku/schemas';

export function resolvePdfTypography(input: DokuTypography | undefined): DokuTypography {
  const typography = input ?? DEFAULT_DOKU_TYPOGRAPHY;
  const fontFamily = typography.uiFontFamily;

  return {
    ...typography,
    pdfFontFamily: fontFamily,
    monospaceFontFamily: fontFamily,
    accessibilityFontFamily: fontFamily,
    accessibilityMode: false,
  };
}

export function resolveReadableTextFont(typography: DokuTypography): string {
  return typography.accessibilityMode
    ? typography.accessibilityFontFamily
    : typography.pdfFontFamily;
}

export function buildWeasyTypographyCss(typography: DokuTypography, fontAssetsDir?: string): string {
  const textFont = quoteCssFont(resolveReadableTextFont(typography));
  const uiFont = quoteCssFont(
    typography.accessibilityMode ? typography.accessibilityFontFamily : typography.uiFontFamily,
  );
  const monoFont = quoteCssFont(typography.monospaceFontFamily);
  const fontFaces = fontAssetsDir ? buildBundledFontFaces(fontAssetsDir) : '';

  return `
${fontFaces}
:root {
  --print-font-body: ${textFont}, ${uiFont}, serif;
  --print-font-heading: ${textFont}, ${uiFont}, serif;
  --print-font-code: ${monoFont}, monospace;
}
`;
}

export function buildLatexFontVariables(typography: DokuTypography): string[] {
  const textFont = resolveReadableTextFont(typography);
  const uiFont = typography.accessibilityMode
    ? typography.accessibilityFontFamily
    : typography.uiFontFamily;

  return [
    '--variable',
    `mainfont=${textFont}`,
    '--variable',
    `sansfont=${uiFont}`,
    '--variable',
    `monofont=${typography.monospaceFontFamily}`,
  ];
}

function quoteCssFont(value: string): string {
  return `"${value.replace(/"/g, '\\"')}"`;
}

function buildBundledFontFaces(fontAssetsDir: string): string {
  return DOKU_FONT_CATALOG.map((font) => {
    const format = font.fileName.endsWith('.otf') ? 'opentype' : 'truetype';
    const url = pathToFileUrl(`${fontAssetsDir}/${font.fileName}`);

    return `@font-face {
  font-family: ${quoteCssFont(font.family)};
  src: url("${url}") format("${format}");
  font-display: swap;
}`;
  }).join('\n');
}

function pathToFileUrl(path: string): string {
  return `file://${path.replace(/\\/g, '/').replace(/"/g, '%22')}`;
}
