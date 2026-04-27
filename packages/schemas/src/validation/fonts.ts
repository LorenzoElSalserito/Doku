import { z } from 'zod';

export const DokuFontFamilySchema = z.enum([
  'Inter',
  'Roboto',
  'Open Sans',
  'IBM Plex Sans',
  'Ubuntu',
  'Source Serif 4',
  'Merriweather',
  'Lora',
  'Libre Baskerville',
  'JetBrains Mono',
  'Fira Code',
  'Roboto Mono',
  'OpenDyslexic',
  'Atkinson Hyperlegible',
]);
export type DokuFontFamily = z.infer<typeof DokuFontFamilySchema>;

export const DokuFontProfileSchema = z.enum(['professional', 'allPurpose']);
export type DokuFontProfile = z.infer<typeof DokuFontProfileSchema>;

export const DokuTypographySchema = z.object({
  profile: DokuFontProfileSchema,
  uiFontFamily: DokuFontFamilySchema,
  pdfFontFamily: DokuFontFamilySchema,
  monospaceFontFamily: DokuFontFamilySchema,
  accessibilityFontFamily: DokuFontFamilySchema,
  accessibilityMode: z.boolean(),
});
export type DokuTypography = z.infer<typeof DokuTypographySchema>;

export interface DokuFontDefinition {
  family: DokuFontFamily;
  category: 'sans' | 'serif' | 'monospace' | 'accessibility';
  license: string;
  recommendedUse: string;
  previewText: string;
  fileName: string;
}

export const DOKU_FONT_CATALOG: DokuFontDefinition[] = [
  { family: 'Inter', category: 'sans', license: 'SIL OFL', recommendedUse: 'UI moderne, dashboard, desktop app', previewText: 'Clean interface writing', fileName: 'Inter.ttf' },
  { family: 'Roboto', category: 'sans', license: 'Apache 2.0 / OFL', recommendedUse: 'UI general purpose', previewText: 'Neutral everyday notes', fileName: 'Roboto.ttf' },
  { family: 'Open Sans', category: 'sans', license: 'SIL OFL', recommendedUse: 'App professionali, documenti', previewText: 'Balanced document text', fileName: 'OpenSans.ttf' },
  { family: 'IBM Plex Sans', category: 'sans', license: 'SIL OFL', recommendedUse: 'Software enterprise', previewText: 'Precise product writing', fileName: 'IBMPlexSans.ttf' },
  { family: 'Ubuntu', category: 'sans', license: 'Ubuntu Font License', recommendedUse: 'Desktop app', previewText: 'Friendly desktop notes', fileName: 'Ubuntu.ttf' },
  { family: 'Source Serif 4', category: 'serif', license: 'SIL OFL', recommendedUse: 'Report, manuali, PDF professionali', previewText: 'Editorial report prose', fileName: 'SourceSerif4.ttf' },
  { family: 'Merriweather', category: 'serif', license: 'SIL OFL', recommendedUse: 'PDF leggibili, stampa', previewText: 'Readable printed pages', fileName: 'Merriweather.ttf' },
  { family: 'Lora', category: 'serif', license: 'SIL OFL', recommendedUse: 'Documenti editoriali', previewText: 'Narrative long-form text', fileName: 'Lora.ttf' },
  { family: 'Libre Baskerville', category: 'serif', license: 'SIL OFL', recommendedUse: 'PDF classici', previewText: 'Classic formal documents', fileName: 'LibreBaskerville.ttf' },
  { family: 'JetBrains Mono', category: 'monospace', license: 'SIL OFL', recommendedUse: 'Codice, dati tecnici', previewText: 'Code, tables, metadata', fileName: 'JetBrainsMono.ttf' },
  { family: 'Fira Code', category: 'monospace', license: 'SIL OFL', recommendedUse: 'Codice con ligature', previewText: 'Technical markdown blocks', fileName: 'FiraCode.ttf' },
  { family: 'Roboto Mono', category: 'monospace', license: 'Apache 2.0 / OFL', recommendedUse: 'Tabelle, codice', previewText: 'Structured technical notes', fileName: 'RobotoMono.ttf' },
  { family: 'OpenDyslexic', category: 'accessibility', license: 'SIL OFL', recommendedUse: 'Modalita dislessia', previewText: 'Accessible reading flow', fileName: 'OpenDyslexic.otf' },
  { family: 'Atkinson Hyperlegible', category: 'accessibility', license: 'SIL OFL', recommendedUse: 'Alta leggibilita generale', previewText: 'High-legibility writing', fileName: 'AtkinsonHyperlegible.ttf' },
];

export const DOKU_FONT_PROFILES: Record<DokuFontProfile, DokuTypography> = {
  professional: {
    profile: 'professional',
    uiFontFamily: 'Inter',
    pdfFontFamily: 'Inter',
    monospaceFontFamily: 'Inter',
    accessibilityFontFamily: 'Inter',
    accessibilityMode: false,
  },
  allPurpose: {
    profile: 'allPurpose',
    uiFontFamily: 'Open Sans',
    pdfFontFamily: 'Open Sans',
    monospaceFontFamily: 'Open Sans',
    accessibilityFontFamily: 'Open Sans',
    accessibilityMode: false,
  },
};

export const DEFAULT_DOKU_TYPOGRAPHY: DokuTypography = DOKU_FONT_PROFILES.professional;

export function buildUnifiedDokuTypography(fontFamily: DokuFontFamily): DokuTypography {
  return {
    profile: 'professional',
    uiFontFamily: fontFamily,
    pdfFontFamily: fontFamily,
    monospaceFontFamily: fontFamily,
    accessibilityFontFamily: fontFamily,
    accessibilityMode: false,
  };
}
