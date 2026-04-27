import { describe, expect, it } from 'vitest';
import {
  buildLatexFontVariables,
  buildWeasyTypographyCss,
  resolvePdfTypography,
} from './pdfTypography.js';

describe('PDF typography', () => {
  it('normalizes typography to one selected font for every output surface', () => {
    const typography = resolvePdfTypography({
      profile: 'professional',
      uiFontFamily: 'Lora',
      pdfFontFamily: 'Source Serif 4',
      monospaceFontFamily: 'JetBrains Mono',
      accessibilityFontFamily: 'OpenDyslexic',
      accessibilityMode: true,
    });

    expect(typography).toEqual(
      expect.objectContaining({
        uiFontFamily: 'Lora',
        pdfFontFamily: 'Lora',
        monospaceFontFamily: 'Lora',
        accessibilityFontFamily: 'Lora',
        accessibilityMode: false,
      }),
    );
  });

  it('builds LuaLaTeX and Weasy font instructions from the unified font', () => {
    const typography = resolvePdfTypography({
      profile: 'professional',
      uiFontFamily: 'Atkinson Hyperlegible',
      pdfFontFamily: 'Inter',
      monospaceFontFamily: 'Roboto Mono',
      accessibilityFontFamily: 'OpenDyslexic',
      accessibilityMode: false,
    });

    expect(buildLatexFontVariables(typography)).toEqual([
      '--variable',
      'mainfont=Atkinson Hyperlegible',
      '--variable',
      'sansfont=Atkinson Hyperlegible',
      '--variable',
      'monofont=Atkinson Hyperlegible',
    ]);

    expect(buildWeasyTypographyCss(typography)).toContain(
      '--print-font-body: "Atkinson Hyperlegible"',
    );
    expect(buildWeasyTypographyCss(typography)).toContain(
      '--print-font-code: "Atkinson Hyperlegible"',
    );
  });
});
