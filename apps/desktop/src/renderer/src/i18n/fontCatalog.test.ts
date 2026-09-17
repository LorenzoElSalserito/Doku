import { describe, expect, it } from 'vitest';
import { DOKU_FONT_CATALOG } from '@doku/schemas';
import { en } from './dictionaries/en.js';
import { it as italian } from './dictionaries/it.js';
import { es } from './dictionaries/es.js';
import { fr } from './dictionaries/fr.js';
import { de } from './dictionaries/de.js';
import { pt } from './dictionaries/pt.js';

const DICTIONARIES = { en, it: italian, es, fr, de, pt } as const;

describe('font catalog copy is localised', () => {
  for (const [language, dict] of Object.entries(DICTIONARIES)) {
    it(`covers every family and category in "${language}"`, () => {
      for (const font of DOKU_FONT_CATALOG) {
        const use = dict.fontCatalog.use[font.family];
        expect(use, `${language}: use for ${font.family}`).toBeTruthy();
        const preview = dict.fontCatalog.preview[font.category];
        expect(preview, `${language}: preview for ${font.category}`).toBeTruthy();
      }
      // No stale entries for families that no longer exist.
      for (const family of Object.keys(dict.fontCatalog.use)) {
        expect(
          DOKU_FONT_CATALOG.some((font) => font.family === family),
          `${language}: stale family ${family}`,
        ).toBe(true);
      }
    });
  }

  it('translates the donation call to action everywhere', () => {
    const ctas = new Set<string>();
    for (const [language, dict] of Object.entries(DICTIONARIES)) {
      expect(dict.info.support.cta, language).toBeTruthy();
      expect(dict.info.support.title, language).toBeTruthy();
      expect(dict.info.support.body, language).toBeTruthy();
      expect(dict.info.support.note, language).toBeTruthy();
      ctas.add(dict.info.support.cta);
    }
    expect(ctas.size).toBe(Object.keys(DICTIONARIES).length);
    expect(italian.info.support.cta).toBe('Sostienimi donando');
  });
});
