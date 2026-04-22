import { useCallback, useMemo, useState } from 'react';
import { Button, Card, Stepper } from '@doku/ui';
import {
  DEFAULT_WORKSPACE_LAYOUT,
  type Language,
  type Settings,
  type SettingsPatch,
  type ThemePreference,
} from '@doku/application';
import { I18nProvider, useDict } from '../../i18n/I18nProvider.js';
import { ThemeProvider } from '@doku/ui';
import { LanguageStep } from './steps/LanguageStep.js';
import { ThemeStep } from './steps/ThemeStep.js';
import { ConfirmStep } from './steps/ConfirmStep.js';

interface SetupWizardProps {
  initialSettings: Settings;
  onComplete: (patch: SettingsPatch) => Promise<void>;
}

export function SetupWizard({ initialSettings, onComplete }: SetupWizardProps) {
  const [language, setLanguage] = useState<Language>(initialSettings.language);
  const [theme, setTheme] = useState<ThemePreference>(initialSettings.theme);
  const [stepIndex, setStepIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const goNext = useCallback(() => setStepIndex((i) => Math.min(i + 1, 2)), []);
  const goBack = useCallback(() => setStepIndex((i) => Math.max(i - 1, 0)), []);

  const handleFinish = useCallback(async () => {
    setSubmitting(true);
    try {
      await onComplete({
        language,
        theme,
        firstRunCompleted: true,
        workspace: DEFAULT_WORKSPACE_LAYOUT,
        workspaceViewMode: 'split',
      });
    } finally {
      setSubmitting(false);
    }
  }, [language, theme, onComplete]);

  // Wrap the wizard body in provider that reflects live selection so ogni
  // modifica aggiorna copy e tema immediatamente.
  return (
    <I18nProvider language={language}>
      <ThemeProvider preference={theme} onPreferenceChange={setTheme}>
        <WizardInner
          stepIndex={stepIndex}
          language={language}
          theme={theme}
          onLanguageChange={setLanguage}
          onThemeChange={setTheme}
          onBack={goBack}
          onNext={goNext}
          onFinish={handleFinish}
          submitting={submitting}
        />
      </ThemeProvider>
    </I18nProvider>
  );
}

interface WizardInnerProps {
  stepIndex: number;
  language: Language;
  theme: ThemePreference;
  onLanguageChange: (l: Language) => void;
  onThemeChange: (t: ThemePreference) => void;
  onBack: () => void;
  onNext: () => void;
  onFinish: () => void;
  submitting: boolean;
}

function WizardInner({
  stepIndex,
  language,
  theme,
  onLanguageChange,
  onThemeChange,
  onBack,
  onNext,
  onFinish,
  submitting,
}: WizardInnerProps) {
  const dict = useDict();

  const steps = useMemo(
    () => [
      {
        key: 'language' as const,
        title: dict.wizard.language.title,
        subtitle: dict.wizard.language.subtitle,
      },
      {
        key: 'theme' as const,
        title: dict.wizard.theme.title,
        subtitle: dict.wizard.theme.subtitle,
      },
      {
        key: 'confirm' as const,
        title: dict.wizard.confirm.title,
        subtitle: dict.wizard.confirm.subtitle,
      },
    ],
    [dict],
  );

  const current = steps[stepIndex];
  if (!current) return null;
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === steps.length - 1;

  return (
    <main className="wizard" aria-labelledby="wizard-title">
      <Card elevated className="wizard__card">
        <header className="wizard__header">
          <span className="wizard__eyebrow">
            {dict.wizard.eyebrow} · {dict.wizard.steps[current.key]}
          </span>
          <h1 id="wizard-title" className="wizard__title">
            {current.title}
          </h1>
          <p className="wizard__subtitle">{current.subtitle}</p>
        </header>

        <div className="wizard__content">
          {current.key === 'language' && (
            <LanguageStep value={language} onChange={onLanguageChange} />
          )}
          {current.key === 'theme' && <ThemeStep value={theme} onChange={onThemeChange} />}
          {current.key === 'confirm' && <ConfirmStep language={language} theme={theme} />}
        </div>

        <footer className="wizard__footer">
          <Stepper
            total={steps.length}
            current={stepIndex}
            ariaLabel={dict.wizard.eyebrow}
          />
          <div className="wizard__footer-actions">
            <Button variant="ghost" onClick={onBack} disabled={isFirst}>
              {dict.wizard.actions.back}
            </Button>
            {isLast ? (
              <Button variant="primary" size="lg" onClick={onFinish} disabled={submitting}>
                {dict.wizard.actions.finish}
              </Button>
            ) : (
              <Button variant="primary" size="lg" onClick={onNext}>
                {dict.wizard.actions.next}
              </Button>
            )}
          </div>
        </footer>
      </Card>
    </main>
  );
}
