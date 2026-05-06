import { useDict } from '../i18n/I18nProvider.js';

export function AppLoading() {
  const dict = useDict();

  return (
    <div className="app-loading" role="status" aria-live="polite">
      <div className="app-loading__panel">
        <span className="app-loading__mark" aria-hidden>
          D
        </span>
        <div className="app-loading__copy">
          <span className="app-loading__name">{dict.app.name}</span>
          <span className="app-loading__status">NOW LOADING</span>
        </div>
        <span className="app-loading__bar" aria-hidden />
      </div>
    </div>
  );
}
