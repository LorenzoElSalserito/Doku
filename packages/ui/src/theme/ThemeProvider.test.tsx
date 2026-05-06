// @vitest-environment jsdom

import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ThemeProvider } from './ThemeProvider.js';

describe('ThemeProvider', () => {
  afterEach(() => {
    cleanup();
    document.documentElement.removeAttribute('style');
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('data-app-zoom');
  });

  it('applies selected fonts to all UI font variables safely', async () => {
    render(
      <ThemeProvider
        preference="light"
        uiFontFamily="Source Serif 4"
        contentFontFamily="Source Serif 4"
        monospaceFontFamily="Source Serif 4"
      >
        <div />
      </ThemeProvider>,
    );

    const root = document.documentElement;
    expect(root.style.getPropertyValue('--font-sans')).toContain('"Source Serif 4"');
    expect(root.style.getPropertyValue('--font-serif')).toContain('"Source Serif 4"');
    expect(root.style.getPropertyValue('--font-mono')).toContain('"Source Serif 4"');
  });

  it('does not call the browser Font Loading API during startup', () => {
    const fontLoad = vi.fn();
    Object.defineProperty(document, 'fonts', {
      configurable: true,
      value: {
        ready: Promise.resolve(),
        load: fontLoad,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
    });
    render(
      <ThemeProvider preference="light" uiFontFamily="Merriweather">
        <div data-testid="content" />
      </ThemeProvider>,
    );

    expect(document.documentElement.style.getPropertyValue('--font-sans')).toContain('"Merriweather"');
    expect(fontLoad).not.toHaveBeenCalled();
  });
});
