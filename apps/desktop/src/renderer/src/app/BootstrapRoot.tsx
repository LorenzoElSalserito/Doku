import { Component, useEffect, useRef, useState, type ErrorInfo, type ReactNode } from 'react';
import type { Settings } from '@doku/application';
import { I18nProvider } from '../i18n/I18nProvider.js';
import { App } from './App.js';
import { AppError } from './AppError.js';
import { AppLoading } from './AppLoading.js';
import { resolvePreferredLanguage } from './App.js';

const SETTINGS_BOOTSTRAP_TIMEOUT_MS = 10_000;

type BootstrapState =
  | { phase: 'startup-loading'; splashReady: boolean; settings: Settings | null }
  | { phase: 'startup-error'; error: Error };

function logBootstrapEvent(event: string, context?: Record<string, unknown>): void {
  void window.doku.system.logEvent(event, context);
}

export function BootstrapRoot() {
  const [state, setState] = useState<BootstrapState>({
    phase: 'startup-loading',
    splashReady: false,
    settings: null,
  });
  const startedAtRef = useRef(Date.now());
  const language = state.phase === 'startup-loading' && state.settings
    ? state.settings.language
    : resolvePreferredLanguage();

  useEffect(() => {
    let cancelled = false;
    const startedAt = startedAtRef.current;

    logBootstrapEvent('renderer-bootstrap-started', {
      safeMode: window.doku.system.safeMode,
    });
    logBootstrapEvent('renderer-bridge-ready');

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        logBootstrapEvent('splash-ready', {
          elapsedMs: Date.now() - startedAt,
        });
        if (!cancelled) {
          setState((current) =>
            current.phase === 'startup-loading'
              ? { ...current, splashReady: true }
              : current,
          );
        }
      });
    });

    const timeout = window.setTimeout(() => {
      if (cancelled) return;
      const error = new Error('Settings did not load before the startup timeout.');
      logBootstrapEvent('renderer-settings-timeout', {
        timeoutMs: SETTINGS_BOOTSTRAP_TIMEOUT_MS,
        elapsedMs: Date.now() - startedAt,
      });
      setState({ phase: 'startup-error', error });
    }, SETTINGS_BOOTSTRAP_TIMEOUT_MS);

    logBootstrapEvent('renderer-settings-requested');
    window.doku.settings
      .get()
      .then((settings) => {
        if (cancelled) return;
        window.clearTimeout(timeout);
        logBootstrapEvent('renderer-settings-resolved', {
          language: settings.language,
          theme: settings.theme,
          firstRunCompleted: settings.firstRunCompleted,
          recentDocuments: settings.launcher.recentDocuments.length,
          elapsedMs: Date.now() - startedAt,
        });
        setState((current) =>
          current.phase === 'startup-loading'
            ? { ...current, settings }
            : current,
        );
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        window.clearTimeout(timeout);
        const error = err instanceof Error ? err : new Error(String(err));
        logBootstrapEvent('renderer-settings-rejected', {
          message: error.message,
          elapsedMs: Date.now() - startedAt,
        });
        setState({ phase: 'startup-error', error });
      });

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, []);

  if (state.phase === 'startup-loading' && state.splashReady && state.settings) {
    return (
      <I18nProvider language={state.settings.language}>
        <BootstrapErrorBoundary>
          <App initialSettings={state.settings} />
        </BootstrapErrorBoundary>
      </I18nProvider>
    );
  }

  if (state.phase === 'startup-error') {
    return (
      <I18nProvider language={language}>
        <AppError error={state.error} />
      </I18nProvider>
    );
  }

  return (
    <I18nProvider language={language}>
      <AppLoading />
    </I18nProvider>
  );
}

interface BootstrapErrorBoundaryProps {
  children: ReactNode;
}

interface BootstrapErrorBoundaryState {
  error: Error | null;
}

class BootstrapErrorBoundary extends Component<
  BootstrapErrorBoundaryProps,
  BootstrapErrorBoundaryState
> {
  override state: BootstrapErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): BootstrapErrorBoundaryState {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    logBootstrapEvent('renderer-app-render-failed', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      componentStack: info.componentStack,
    });
  }

  override render() {
    if (this.state.error) {
      return <AppError error={this.state.error} />;
    }

    return this.props.children;
  }
}
