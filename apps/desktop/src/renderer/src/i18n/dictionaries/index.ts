import type { Dictionary, LanguageCode } from '../keys.js';
import { en } from './en.js';
import { it } from './it.js';
import { es } from './es.js';
import { de } from './de.js';
import { fr } from './fr.js';
import { pt } from './pt.js';

export const dictionaries: Record<LanguageCode, Dictionary> = {
  en,
  it,
  es,
  de,
  fr,
  pt,
};
