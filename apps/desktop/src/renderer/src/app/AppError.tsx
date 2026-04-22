import { useDict } from '../i18n/I18nProvider.js';

interface AppErrorProps {
  error: Error | null;
}

export function AppError({ error }: AppErrorProps) {
  const dict = useDict();

  return (
    <div className="app-loading" role="alert">
      <div>
        <div style={{ fontSize: 'var(--font-size-xl)', marginBottom: 'var(--space-2)' }}>
          {dict.app.errorTitle}
        </div>
        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
          {error?.message ?? dict.app.unknownError}
        </div>
      </div>
    </div>
  );
}
