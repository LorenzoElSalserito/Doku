import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import {
  Button,
  Card,
  Dialog,
  Input,
  SegmentedControl,
  type CustomTheme as UiCustomTheme,
  type SegmentedOption,
} from '@doku/ui';
import { DEFAULT_CUSTOM_THEME, type CustomTheme, type ThemeBase } from '@doku/application';
import { useDict } from '../../i18n/I18nProvider.js';

interface CustomThemeDialogProps {
  open: boolean;
  initialTheme: CustomTheme;
  onClose: () => void;
  onApply: (nextTheme: CustomTheme) => Promise<void>;
}

const COLOR_FIELDS: Array<keyof Omit<CustomTheme, 'mode'>> = [
  'base',
  'surface',
  'elevated',
  'accent',
  'accentSoft',
  'textPrimary',
  'textSecondary',
  'border',
  'focusRing',
];

export function CustomThemeDialog({
  open,
  initialTheme,
  onClose,
  onApply,
}: CustomThemeDialogProps) {
  const dict = useDict();
  const [draft, setDraft] = useState<CustomTheme>(initialTheme);

  useEffect(() => {
    if (open) {
      setDraft(initialTheme);
    }
  }, [initialTheme, open]);

  const modeOptions: SegmentedOption<ThemeBase>[] = [
    { value: 'light', label: dict.themes.light },
    { value: 'dark', label: dict.themes.dark },
  ];

  const previewTheme = useMemo<UiCustomTheme>(
    () => ({
      ...draft,
      textSecondary: draft.textSecondary,
    }),
    [draft],
  );

  const previewStyle = useMemo(() => buildPreviewStyle(previewTheme), [previewTheme]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={dict.settings.customTheme.title}
      subtitle={dict.settings.customTheme.subtitle}
      className="doku-dialog--wide"
      footer={
        <div className="custom-theme-dialog__actions">
          <Button
            variant="ghost"
            onClick={() => {
              setDraft(DEFAULT_CUSTOM_THEME);
            }}
          >
            {dict.settings.customTheme.reset}
          </Button>
          <Button variant="secondary" onClick={onClose}>
            {dict.settings.customTheme.close}
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              void onApply(draft);
            }}
          >
            {dict.settings.customTheme.apply}
          </Button>
        </div>
      }
    >
      <div className="custom-theme-dialog">
        <section className="custom-theme-dialog__controls">
          <div className="settings-field">
            <label className="settings-field__label">{dict.settings.customTheme.modeLabel}</label>
            <SegmentedControl
              value={draft.mode}
              options={modeOptions}
              onChange={(mode) => setDraft((current) => ({ ...current, mode }))}
              ariaLabel={dict.settings.customTheme.modeLabel}
              fullWidth
              idPrefix="custom-theme-mode"
            />
          </div>

          <div className="custom-theme-dialog__grid">
            {COLOR_FIELDS.map((field) => (
              <label key={field} className="custom-theme-field">
                <span className="custom-theme-field__label">
                  {dict.settings.customTheme.fields[field]}
                </span>
                <div className="custom-theme-field__controls">
                  <input
                    className="custom-theme-field__swatch"
                    type="color"
                    value={draft[field]}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, [field]: event.target.value.toUpperCase() }))
                    }
                    aria-label={dict.settings.customTheme.fields[field]}
                  />
                  <Input
                    value={draft[field]}
                    readOnly
                    spellCheck={false}
                  />
                </div>
              </label>
            ))}
          </div>
        </section>

        <section className="custom-theme-dialog__preview" style={previewStyle}>
          <span className="custom-theme-dialog__eyebrow">{dict.settings.customTheme.previewLabel}</span>
          <Card elevated className="custom-theme-dialog__preview-card">
            <div className="custom-theme-dialog__preview-header">
              <div>
                <div className="custom-theme-dialog__preview-title">{dict.app.name}</div>
                <div className="custom-theme-dialog__preview-subtitle">
                  {dict.themes.customDescription}
                </div>
              </div>
              <span className="custom-theme-dialog__preview-badge">{dict.themes.custom}</span>
            </div>
            <div className="custom-theme-dialog__preview-body">
              <p>
                {dict.workspace.previewEmpty}
              </p>
              <blockquote className="custom-theme-dialog__preview-quote">
                {dict.info.local}
              </blockquote>
              <div className="custom-theme-dialog__preview-row">
                <span />
                <span />
                <span />
              </div>
            </div>
          </Card>
        </section>
      </div>
    </Dialog>
  );
}

function buildPreviewStyle(theme: UiCustomTheme): CSSProperties {
  return {
    ...({
      '--color-base': theme.base,
      '--color-surface': theme.surface,
      '--color-elevated': theme.elevated,
      '--color-accent': theme.accent,
      '--color-accent-strong': theme.accent,
      '--color-accent-soft': theme.accentSoft,
      '--color-text-primary': theme.textPrimary,
      '--color-text-secondary': theme.textSecondary,
      '--color-border': theme.border,
      '--color-border-subtle': theme.border,
      '--color-focus-ring': theme.focusRing,
    } as Record<string, string>),
    colorScheme: theme.mode,
    background: theme.base,
    color: theme.textPrimary,
  };
}
