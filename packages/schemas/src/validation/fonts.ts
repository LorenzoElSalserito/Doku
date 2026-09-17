import { z } from 'zod';

export const DokuFontFamilySchema = z.enum([
  'Inter',
  'Roboto',
  'Open Sans',
  'IBM Plex Sans',
  'Ubuntu',
  'Source Sans 3',
  'Work Sans',
  'Nunito',
  'Manrope',
  'Noto Sans',
  'Montserrat',
  'Raleway',
  'Rubik',
  'Karla',
  'Public Sans',
  'Outfit',
  'DM Sans',
  'Figtree',
  'Source Serif 4',
  'Merriweather',
  'Lora',
  'Libre Baskerville',
  'EB Garamond',
  'Crimson Pro',
  'Playfair Display',
  'Noto Serif',
  'Literata',
  'Bitter',
  'Alegreya',
  'Vollkorn',
  'Newsreader',
  'Cormorant Garamond',
  'JetBrains Mono',
  'Fira Code',
  'Roboto Mono',
  'Source Code Pro',
  'Inconsolata',
  'Red Hat Mono',
  'OpenDyslexic',
  'Atkinson Hyperlegible',
  'Lexend',
  'Atkinson Hyperlegible Next',
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
  { family: 'Source Sans 3', category: 'sans', license: 'SIL OFL', recommendedUse: 'Documenti e interfacce, testo lungo', previewText: 'Versatile everyday prose', fileName: 'SourceSans3.ttf' },
  { family: 'Work Sans', category: 'sans', license: 'SIL OFL', recommendedUse: 'Titoli e UI a schermo', previewText: 'Confident screen headings', fileName: 'WorkSans.ttf' },
  { family: 'Nunito', category: 'sans', license: 'SIL OFL', recommendedUse: 'Note informali, testo morbido', previewText: 'Soft and friendly notes', fileName: 'Nunito.ttf' },
  { family: 'Manrope', category: 'sans', license: 'SIL OFL', recommendedUse: 'UI minimali, dashboard', previewText: 'Minimal geometric interface', fileName: 'Manrope.ttf' },
  { family: 'Noto Sans', category: 'sans', license: 'SIL OFL', recommendedUse: 'Copertura universale, ogni lingua', previewText: 'Clean interface writing', fileName: 'NotoSans.ttf' },
  { family: 'Montserrat', category: 'sans', license: 'SIL OFL', recommendedUse: 'Titoli geometrici e poster', previewText: 'Clean interface writing', fileName: 'Montserrat.ttf' },
  { family: 'Raleway', category: 'sans', license: 'SIL OFL', recommendedUse: 'Titoli eleganti e copertine', previewText: 'Clean interface writing', fileName: 'Raleway.ttf' },
  { family: 'Rubik', category: 'sans', license: 'SIL OFL', recommendedUse: 'Interfacce arrotondate e amichevoli', previewText: 'Clean interface writing', fileName: 'Rubik.ttf' },
  { family: 'Karla', category: 'sans', license: 'SIL OFL', recommendedUse: 'Grottesco compatto per appunti', previewText: 'Clean interface writing', fileName: 'Karla.ttf' },
  { family: 'Public Sans', category: 'sans', license: 'SIL OFL', recommendedUse: 'Documenti istituzionali neutri', previewText: 'Clean interface writing', fileName: 'PublicSans.ttf' },
  { family: 'Outfit', category: 'sans', license: 'SIL OFL', recommendedUse: 'Titoli geometrici moderni', previewText: 'Clean interface writing', fileName: 'Outfit.ttf' },
  { family: 'DM Sans', category: 'sans', license: 'SIL OFL', recommendedUse: 'Interfaccia e testo puliti', previewText: 'Clean interface writing', fileName: 'DMSans.ttf' },
  { family: 'Figtree', category: 'sans', license: 'SIL OFL', recommendedUse: 'Testo d’interfaccia leggero e amichevole', previewText: 'Clean interface writing', fileName: 'Figtree.ttf' },
  { family: 'Source Serif 4', category: 'serif', license: 'SIL OFL', recommendedUse: 'Report, manuali, PDF professionali', previewText: 'Editorial report prose', fileName: 'SourceSerif4.ttf' },
  { family: 'Merriweather', category: 'serif', license: 'SIL OFL', recommendedUse: 'PDF leggibili, stampa', previewText: 'Readable printed pages', fileName: 'Merriweather.ttf' },
  { family: 'Lora', category: 'serif', license: 'SIL OFL', recommendedUse: 'Documenti editoriali', previewText: 'Narrative long-form text', fileName: 'Lora.ttf' },
  { family: 'Libre Baskerville', category: 'serif', license: 'SIL OFL', recommendedUse: 'PDF classici', previewText: 'Classic formal documents', fileName: 'LibreBaskerville.ttf' },
  { family: 'EB Garamond', category: 'serif', license: 'SIL OFL', recommendedUse: 'Libri, saggi, PDF classici', previewText: 'Timeless book typography', fileName: 'EBGaramond.ttf' },
  { family: 'Crimson Pro', category: 'serif', license: 'SIL OFL', recommendedUse: 'Narrativa, manoscritti', previewText: 'Warm literary manuscript', fileName: 'CrimsonPro.ttf' },
  { family: 'Playfair Display', category: 'serif', license: 'SIL OFL', recommendedUse: 'Titoli editoriali, copertine', previewText: 'Elegant editorial display', fileName: 'PlayfairDisplay.ttf' },
  { family: 'Noto Serif', category: 'serif', license: 'SIL OFL', recommendedUse: 'Serif universale per ogni lingua', previewText: 'Editorial long-form prose', fileName: 'NotoSerif.ttf' },
  { family: 'Literata', category: 'serif', license: 'SIL OFL', recommendedUse: 'Lettura lunga ed e-book', previewText: 'Editorial long-form prose', fileName: 'Literata.ttf' },
  { family: 'Bitter', category: 'serif', license: 'SIL OFL', recommendedUse: 'Slab serif per lettura a schermo', previewText: 'Editorial long-form prose', fileName: 'Bitter.ttf' },
  { family: 'Alegreya', category: 'serif', license: 'SIL OFL', recommendedUse: 'Prosa letteraria e saggi', previewText: 'Editorial long-form prose', fileName: 'Alegreya.ttf' },
  { family: 'Vollkorn', category: 'serif', license: 'SIL OFL', recommendedUse: 'Testo classico e caldo', previewText: 'Editorial long-form prose', fileName: 'Vollkorn.ttf' },
  { family: 'Newsreader', category: 'serif', license: 'SIL OFL', recommendedUse: 'Tipografia editoriale e giornalistica', previewText: 'Editorial long-form prose', fileName: 'Newsreader.ttf' },
  { family: 'Cormorant Garamond', category: 'serif', license: 'SIL OFL', recommendedUse: 'Serif display per copertine', previewText: 'Editorial long-form prose', fileName: 'CormorantGaramond.ttf' },
  { family: 'JetBrains Mono', category: 'monospace', license: 'SIL OFL', recommendedUse: 'Codice, dati tecnici', previewText: 'Code, tables, metadata', fileName: 'JetBrainsMono.ttf' },
  { family: 'Fira Code', category: 'monospace', license: 'SIL OFL', recommendedUse: 'Codice con ligature', previewText: 'Technical markdown blocks', fileName: 'FiraCode.ttf' },
  { family: 'Roboto Mono', category: 'monospace', license: 'Apache 2.0 / OFL', recommendedUse: 'Tabelle, codice', previewText: 'Structured technical notes', fileName: 'RobotoMono.ttf' },
  { family: 'Source Code Pro', category: 'monospace', license: 'SIL OFL', recommendedUse: 'Codice, documentazione tecnica', previewText: 'Readable source listings', fileName: 'SourceCodePro.ttf' },
  { family: 'Inconsolata', category: 'monospace', license: 'SIL OFL', recommendedUse: 'Codice compatto, tabelle', previewText: 'Compact terminal notes', fileName: 'Inconsolata.ttf' },
  { family: 'Red Hat Mono', category: 'monospace', license: 'SIL OFL', recommendedUse: 'Codice compatto e leggibile', previewText: 'Code, tables, metadata', fileName: 'RedHatMono.ttf' },
  { family: 'OpenDyslexic', category: 'accessibility', license: 'SIL OFL', recommendedUse: 'Modalita dislessia', previewText: 'Accessible reading flow', fileName: 'OpenDyslexic.otf' },
  { family: 'Atkinson Hyperlegible', category: 'accessibility', license: 'SIL OFL', recommendedUse: 'Alta leggibilita generale', previewText: 'High-legibility writing', fileName: 'AtkinsonHyperlegible.ttf' },
  { family: 'Lexend', category: 'accessibility', license: 'SIL OFL', recommendedUse: 'Lettura fluida, affaticamento ridotto', previewText: 'Effortless reading flow', fileName: 'Lexend.ttf' },
  { family: 'Atkinson Hyperlegible Next', category: 'accessibility', license: 'SIL OFL', recommendedUse: 'Massima leggibilità, più pesi', previewText: 'Accessible reading flow', fileName: 'AtkinsonHyperlegibleNext.ttf' },
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
