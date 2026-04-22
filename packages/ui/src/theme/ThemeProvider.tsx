import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type ThemePreference = 'light' | 'dark' | 'system' | 'custom';
export type ResolvedTheme = 'light' | 'dark';
export interface CustomTheme {
  mode: ResolvedTheme;
  base: string;
  surface: string;
  elevated: string;
  accent: string;
  accentSoft: string;
  textPrimary: string;
  textSecondary: string;
  border: string;
  focusRing: string;
}

interface ThemeContextValue {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  themeKey: string;
  setPreference: (next: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

interface ThemeProviderProps {
  preference: ThemePreference;
  customTheme?: CustomTheme;
  writingFontFamily?: string | null;
  onPreferenceChange?: (next: ThemePreference) => void;
  children: ReactNode;
}

const CUSTOM_THEME_VARIABLES = [
  ['--color-base', 'base'],
  ['--color-surface', 'surface'],
  ['--color-elevated', 'elevated'],
  ['--color-accent', 'accent'],
  ['--color-accent-strong', 'accent'],
  ['--color-accent-soft', 'accentSoft'],
  ['--color-text-primary', 'textPrimary'],
  ['--color-text-secondary', 'textSecondary'],
  ['--color-border', 'border'],
  ['--color-focus-ring', 'focusRing'],
] as const satisfies ReadonlyArray<readonly [string, keyof CustomTheme]>;

export function ThemeProvider({
  preference,
  customTheme,
  writingFontFamily,
  onPreferenceChange,
  children,
}: ThemeProviderProps) {
  const [systemDark, setSystemDark] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, []);

  const resolved: ResolvedTheme = useMemo(() => {
    if (preference === 'system') return systemDark ? 'dark' : 'light';
    if (preference === 'custom') return customTheme?.mode ?? 'light';
    return preference;
  }, [preference, customTheme?.mode, systemDark]);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = resolved;
    if (preference === 'custom' && customTheme) {
      for (const [variable, key] of CUSTOM_THEME_VARIABLES) {
        root.style.setProperty(variable, customTheme[key]);
      }
    } else {
      for (const [variable] of CUSTOM_THEME_VARIABLES) {
        root.style.removeProperty(variable);
      }
    }

    if (writingFontFamily) {
      const family = quoteFontFamily(writingFontFamily);
      root.style.setProperty('--font-sans', `${family}, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`);
      root.style.setProperty('--font-serif', `${family}, 'Source Serif 4', 'Source Serif Pro', 'Iowan Old Style', 'Charter', Georgia, 'Times New Roman', serif`);
    } else {
      root.style.removeProperty('--font-sans');
      root.style.removeProperty('--font-serif');
    }
  }, [resolved, preference, customTheme, writingFontFamily]);

  const themeKey = useMemo(
    () =>
      preference === 'custom' && customTheme
        ? `custom:${JSON.stringify(customTheme)}`
        : `${preference}:${resolved}`,
    [customTheme, preference, resolved],
  );

  const value = useMemo<ThemeContextValue>(
    () => ({
      preference,
      resolved,
      themeKey,
      setPreference: (next) => onPreferenceChange?.(next),
    }),
    [preference, resolved, themeKey, onPreferenceChange],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

function quoteFontFamily(value: string): string {
  return /\s/.test(value) ? `'${value.replace(/'/g, "\\'")}'` : value;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
