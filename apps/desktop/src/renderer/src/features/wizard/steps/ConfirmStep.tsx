import type { Language, ThemePreference } from '@doku/application';
import { useDict } from '../../../i18n/I18nProvider.js';

interface ConfirmStepProps {
  language: Language;
  theme: ThemePreference;
}

export function ConfirmStep({ language, theme }: ConfirmStepProps) {
  const dict = useDict();

  const themeLabel =
    theme === 'light' ? dict.themes.light : theme === 'dark' ? dict.themes.dark : dict.themes.system;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <div className="confirm-grid">
        <div className="confirm-item">
          <div className="confirm-item__label">{dict.wizard.confirm.languageLabel}</div>
          <div className="confirm-item__value">{dict.languages[language]}</div>
        </div>
        <div className="confirm-item">
          <div className="confirm-item__label">{dict.wizard.confirm.themeLabel}</div>
          <div className="confirm-item__value">{themeLabel}</div>
        </div>
      </div>
      <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        {dict.wizard.confirm.nextSteps}
      </p>
    </div>
  );
}
