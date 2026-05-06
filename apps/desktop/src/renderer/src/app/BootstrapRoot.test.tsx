// @vitest-environment jsdom

import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Settings } from '@doku/application';
import { DEFAULT_SETTINGS } from '@doku/schemas';
import { BootstrapRoot } from './BootstrapRoot.js';

vi.mock('./App.js', () => ({
  App: ({ initialSettings }: { initialSettings: Settings }) => (
    <div>App ready: {initialSettings.language}</div>
  ),
  resolvePreferredLanguage: () => 'en',
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('BootstrapRoot', () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    window.requestAnimationFrame = (callback: FrameRequestCallback) => {
      window.setTimeout(() => callback(performance.now()), 0);
      return 1;
    };
    window.cancelAnimationFrame = vi.fn();
  });

  it('does not mount the app until the splash has painted', async () => {
    const logEvent = vi.fn().mockResolvedValue(undefined);
    const frameCallbacks: FrameRequestCallback[] = [];
    window.requestAnimationFrame = (callback: FrameRequestCallback) => {
      frameCallbacks.push(callback);
      return frameCallbacks.length;
    };
    window.doku = {
      settings: {
        get: vi.fn().mockResolvedValue({ ...DEFAULT_SETTINGS, language: 'it' }),
        set: vi.fn(),
      },
      system: {
        platform: 'linux',
        safeMode: false,
        appInfo: vi.fn(),
        prefersDark: vi.fn(),
        openExternal: vi.fn(),
        listFonts: vi.fn(),
        openDefaultAppsPreferences: vi.fn(),
        diagnostics: vi.fn(),
        logEvent,
        prepareForUninstall: vi.fn(),
      },
      documents: {} as typeof window.doku.documents,
      exports: {} as typeof window.doku.exports,
    };

    render(<BootstrapRoot />);
    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByRole('status')).toHaveTextContent('NOW LOADING');
    expect(screen.queryByText('App ready: it')).not.toBeInTheDocument();

    await act(async () => {
      frameCallbacks.shift()?.(performance.now());
      await Promise.resolve();
    });
    expect(screen.queryByText('App ready: it')).not.toBeInTheDocument();

    await act(async () => {
      frameCallbacks.shift()?.(performance.now());
      await Promise.resolve();
    });
    expect(await screen.findByText('App ready: it')).toBeInTheDocument();
  });

  it('keeps the splash mounted until settings are ready', async () => {
    const settingsRequest = deferred<Settings>();
    const logEvent = vi.fn().mockResolvedValue(undefined);
    window.doku = {
      settings: {
        get: vi.fn(() => settingsRequest.promise),
        set: vi.fn(),
      },
      system: {
        platform: 'linux',
        safeMode: false,
        appInfo: vi.fn(),
        prefersDark: vi.fn(),
        openExternal: vi.fn(),
        listFonts: vi.fn(),
        openDefaultAppsPreferences: vi.fn(),
        diagnostics: vi.fn(),
        logEvent,
        prepareForUninstall: vi.fn(),
      },
      documents: {} as typeof window.doku.documents,
      exports: {} as typeof window.doku.exports,
    };

    render(<BootstrapRoot />);

    expect(screen.getByRole('status')).toHaveTextContent('NOW LOADING');
    expect(window.doku.settings.get).toHaveBeenCalledTimes(1);

    settingsRequest.resolve({ ...DEFAULT_SETTINGS, language: 'it' });

    expect(await screen.findByText('App ready: it')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    await waitFor(() => {
      expect(logEvent).toHaveBeenCalledWith(
        'renderer-settings-resolved',
        expect.objectContaining({ language: 'it' }),
      );
    });
  });

  it('keeps startup failures controlled instead of mounting the app', async () => {
    window.doku = {
      settings: {
        get: vi.fn().mockRejectedValue(new Error('settings unavailable')),
        set: vi.fn(),
      },
      system: {
        platform: 'linux',
        safeMode: true,
        appInfo: vi.fn(),
        prefersDark: vi.fn(),
        openExternal: vi.fn(),
        listFonts: vi.fn(),
        openDefaultAppsPreferences: vi.fn(),
        diagnostics: vi.fn(),
        logEvent: vi.fn().mockResolvedValue(undefined),
        prepareForUninstall: vi.fn(),
      },
      documents: {} as typeof window.doku.documents,
      exports: {} as typeof window.doku.exports,
    };

    render(<BootstrapRoot />);

    expect(await screen.findByText('settings unavailable')).toBeInTheDocument();
    expect(screen.queryByText(/App ready:/)).not.toBeInTheDocument();
  });
});
