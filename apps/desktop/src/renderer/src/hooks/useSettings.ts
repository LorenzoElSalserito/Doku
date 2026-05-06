import { useCallback, useEffect, useState } from 'react';
import type { Settings, SettingsPatch } from '@doku/application';

type Status = 'loading' | 'ready' | 'error';

interface UseSettingsResult {
  status: Status;
  settings: Settings | null;
  error: Error | null;
  update: (patch: SettingsPatch) => Promise<void>;
}

function logSettingsEvent(event: string, context?: Record<string, unknown>): void {
  void (window.doku.system as { logEvent?: (event: string, context?: Record<string, unknown>) => Promise<void> })
    .logEvent?.(event, context);
}

export function useSettings(initialSettings?: Settings): UseSettingsResult {
  const [settings, setSettings] = useState<Settings | null>(initialSettings ?? null);
  const [status, setStatus] = useState<Status>(initialSettings ? 'ready' : 'loading');
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (initialSettings) {
      return;
    }
    let cancelled = false;
    window.doku.settings
      .get()
      .then((s) => {
        if (cancelled) return;
        logSettingsEvent('settings-loaded', {
          language: s.language,
          theme: s.theme,
          firstRunCompleted: s.firstRunCompleted,
          recentDocuments: s.launcher.recentDocuments.length,
        });
        setSettings(s);
        setStatus('ready');
      })
      .catch((err: Error) => {
        if (cancelled) return;
        logSettingsEvent('settings-load-failed', { message: err.message });
        setError(err);
        setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [initialSettings]);

  const update = useCallback(async (patch: SettingsPatch) => {
    const next = await window.doku.settings.set(patch);
    logSettingsEvent('settings-updated', { fields: Object.keys(patch) });
    setSettings(next);
  }, []);

  return { status, settings, error, update };
}
