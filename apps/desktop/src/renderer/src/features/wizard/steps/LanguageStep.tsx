import { SegmentedControl, type SegmentedOption } from '@doku/ui';
import type { Language } from '@doku/application';
import { LANGUAGES } from '../../../i18n/keys.js';
import { useDict } from '../../../i18n/I18nProvider.js';

interface LanguageStepProps {
  value: Language;
  onChange: (value: Language) => void;
}

export function LanguageStep({ value, onChange }: LanguageStepProps) {
  const dict = useDict();

  const options: SegmentedOption<Language>[] = LANGUAGES.map((code) => ({
    value: code,
    label: dict.languages[code],
  }));

  return (
    <SegmentedControl
      value={value}
      options={options}
      onChange={onChange}
      ariaLabel={dict.wizard.language.title}
      fullWidth
      idPrefix="wizard-lang"
    />
  );
}
