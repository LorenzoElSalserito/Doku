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
  appZoom?: 75 | 100 | 125 | 150;
  writingFontFamily?: string | null;
  uiFontFamily?: string;
  contentFontFamily?: string;
  monospaceFontFamily?: string;
  accessibilityFontFamily?: string;
  accessibilityMode?: boolean;
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
  appZoom = 100,
  writingFontFamily,
  uiFontFamily,
  contentFontFamily,
  monospaceFontFamily,
  accessibilityFontFamily,
  accessibilityMode = false,
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
    root.dataset.appZoom = String(appZoom);
    root.style.fontSize = `${appZoom}%`;
    if (preference === 'custom' && customTheme) {
      for (const [variable, key] of CUSTOM_THEME_VARIABLES) {
        root.style.setProperty(variable, customTheme[key]);
      }
    } else {
      for (const [variable] of CUSTOM_THEME_VARIABLES) {
        root.style.removeProperty(variable);
      }
    }

    const readableFamily = accessibilityMode && accessibilityFontFamily ? accessibilityFontFamily : undefined;
    const resolvedUiFont = readableFamily ?? uiFontFamily ?? writingFontFamily;
    const resolvedContentFont = readableFamily ?? contentFontFamily ?? writingFontFamily;
    const metricScale = getFontMetricScale(resolvedUiFont);

    setFontVariable(root, '--font-sans', resolvedUiFont, 'Inter');
    setFontVariable(root, '--font-serif', resolvedContentFont, 'Source Serif 4');
    setFontVariable(root, '--font-mono', monospaceFontFamily, 'JetBrains Mono');
    root.style.setProperty('--font-metric-scale', metricScale.toString());
  }, [
    accessibilityFontFamily,
    accessibilityMode,
    appZoom,
    contentFontFamily,
    customTheme,
    monospaceFontFamily,
    preference,
    resolved,
    uiFontFamily,
    writingFontFamily,
  ]);

  const themeKey = useMemo(
    () =>
      [
        preference === 'custom' && customTheme
          ? `custom:${JSON.stringify(customTheme)}`
          : `${preference}:${resolved}`,
        `zoom:${appZoom}`,
        `ui:${uiFontFamily ?? writingFontFamily ?? ''}`,
        `content:${contentFontFamily ?? writingFontFamily ?? ''}`,
        `mono:${monospaceFontFamily ?? ''}`,
        `access:${accessibilityMode ? accessibilityFontFamily ?? '' : ''}`,
      ].join('|'),
    [
      accessibilityFontFamily,
      accessibilityMode,
      appZoom,
      contentFontFamily,
      customTheme,
      monospaceFontFamily,
      preference,
      resolved,
      uiFontFamily,
      writingFontFamily,
    ],
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

const FONT_METRIC_SCALE: Record<string, number> = {
  Inter: 1,
  Roboto: 0.98,
  'Open Sans': 0.96,
  'IBM Plex Sans': 0.98,
  Ubuntu: 0.96,
  'Source Serif 4': 0.98,
  Merriweather: 0.88,
  Lora: 0.97,
  'Libre Baskerville': 0.94,
  'JetBrains Mono': 0.92,
  'Fira Code': 0.92,
  'Roboto Mono': 0.92,
  OpenDyslexic: 0.88,
  'Atkinson Hyperlegible': 0.96,
};

function getFontMetricScale(family: string | null | undefined): number {
  return family ? (FONT_METRIC_SCALE[family] ?? 1) : 1;
}

function quoteFontFamily(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function setFontVariable(
  root: HTMLElement,
  variable: string,
  family: string | null | undefined,
  fallbackFamily: string,
): void {
  root.style.setProperty(variable, quoteFontFamily(family ?? fallbackFamily));
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
