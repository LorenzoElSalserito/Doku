import { PRODUCT_ICON_URL } from '../branding.js';
import { useDict } from '../i18n/I18nProvider.js';

export function AppLoading() {
  const dict = useDict();

  return (
    <div className="app-loading" role="status" aria-live="polite">
      <div className="app-loading__brand">
        <img className="app-loading__icon" src={PRODUCT_ICON_URL} alt="" aria-hidden />
        <div className="app-loading__copy">
          <span className="app-loading__name">{dict.app.name}</span>
          <span className="app-loading__status">{dict.app.loading}</span>
        </div>
      </div>
    </div>
  );
}
