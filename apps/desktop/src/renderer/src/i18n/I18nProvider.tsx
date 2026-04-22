import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { Dictionary, LanguageCode } from './keys.js';
import { dictionaries } from './dictionaries/index.js';

interface I18nContextValue {
  language: LanguageCode;
  dict: Dictionary;
}

const I18nContext = createContext<I18nContextValue | null>(null);

interface I18nProviderProps {
  language: LanguageCode;
  children: ReactNode;
}

export function I18nProvider({ language, children }: I18nProviderProps) {
  const value = useMemo<I18nContextValue>(
    () => ({ language, dict: dictionaries[language] }),
    [language],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}

export function useDict(): Dictionary {
  return useI18n().dict;
}
