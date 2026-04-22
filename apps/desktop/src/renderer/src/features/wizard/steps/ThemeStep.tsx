import { SegmentedControl, type SegmentedOption } from '@doku/ui';
import type { ThemePreference } from '@doku/application';
import { useDict } from '../../../i18n/I18nProvider.js';

interface ThemeStepProps {
  value: ThemePreference;
  onChange: (value: ThemePreference) => void;
}

export function ThemeStep({ value, onChange }: ThemeStepProps) {
  const dict = useDict();

  const options: SegmentedOption<ThemePreference>[] = [
    { value: 'light', label: dict.themes.light, description: dict.themes.lightDescription },
    { value: 'dark', label: dict.themes.dark, description: dict.themes.darkDescription },
    { value: 'system', label: dict.themes.system, description: dict.themes.systemDescription },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <SegmentedControl
        value={value}
        options={options}
        onChange={onChange}
        ariaLabel={dict.wizard.theme.title}
        fullWidth
        idPrefix="wizard-theme"
      />

      <div className="theme-preview-grid">
        <LivePreview />
        <SwatchPreview />
      </div>
    </div>
  );
}

function LivePreview() {
  const dict = useDict();
  return (
    <article
      className="theme-preview"
      style={{
        background: 'var(--color-surface)',
        color: 'var(--color-text-primary)',
        boxShadow: 'var(--shadow-md)',
      }}
      aria-hidden
    >
      <span className="theme-preview__eyebrow" style={{ color: 'var(--color-text-secondary)' }}>
        {dict.app.name} · Preview
      </span>
      <h3 className="theme-preview__title">{dict.wizard.theme.previewHeading}</h3>
      <p className="theme-preview__body" style={{ color: 'var(--color-text-secondary)' }}>
        {dict.wizard.theme.previewBody}
      </p>
    </article>
  );
}

function SwatchPreview() {
  return (
    <div className="theme-preview" aria-hidden>
      <span className="theme-preview__eyebrow" style={{ color: 'var(--color-text-secondary)' }}>
        Palette
      </span>
      <div className="theme-preview__swatches">
        <span className="theme-preview__swatch" style={{ background: 'var(--color-base)' }} />
        <span className="theme-preview__swatch" style={{ background: 'var(--color-surface)' }} />
        <span className="theme-preview__swatch" style={{ background: 'var(--color-elevated)' }} />
        <span
          className="theme-preview__swatch"
          style={{ background: 'var(--color-accent-surface)' }}
        />
        <span className="theme-preview__swatch" style={{ background: 'var(--color-accent)' }} />
      </div>
      <div className="theme-preview__swatches">
        <span
          className="theme-preview__swatch"
          style={{ background: 'var(--color-text-primary)' }}
        />
        <span
          className="theme-preview__swatch"
          style={{ background: 'var(--color-text-secondary)' }}
        />
        <span
          className="theme-preview__swatch"
          style={{ background: 'var(--color-border)' }}
        />
      </div>
    </div>
  );
}
