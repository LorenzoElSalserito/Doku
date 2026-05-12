import { useDict } from '../i18n/I18nProvider.js';
import dokuIconUrl from '../../../assets/icon.png';

export function AppLoading() {
  const dict = useDict();

  return (
    <div className="app-loading" role="status" aria-live="polite">
      <div className="app-loading__panel">
        <div className="app-loading__logo" aria-hidden>
          <img src={dokuIconUrl} alt="" />
        </div>
        <span className="app-loading__status">NOW LOADING</span>
        <span className="app-loading__bar" aria-hidden />
        <span className="app-loading__name">{dict.app.name}</span>
      </div>
    </div>
  );
}
