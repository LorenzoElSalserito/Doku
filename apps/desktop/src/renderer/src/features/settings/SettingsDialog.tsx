import { useEffect, useState } from 'react';
import { Button, Dialog, SegmentedControl, type SegmentedOption } from '@doku/ui';
import type { Language, Settings, SettingsPatch, ThemePreference } from '@doku/application';
import { LANGUAGES } from '../../i18n/keys.js';
import { useDict } from '../../i18n/I18nProvider.js';
import { CustomThemeDialog } from './CustomThemeDialog.js';

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
  settings: Settings;
  onUpdate: (patch: SettingsPatch) => Promise<void>;
}

export function SettingsDialog({ open, onClose, settings, onUpdate }: SettingsDialogProps) {
  const dict = useDict();
  const [customThemeOpen, setCustomThemeOpen] = useState(false);
  const [fonts, setFonts] = useState<string[]>([]);
  const [fontsLoading, setFontsLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;
    setFontsLoading(true);

    window.doku.system
      .listFonts()
      .then((items) => {
        if (cancelled) {
          return;
        }
        setFonts(items);
      })
      .finally(() => {
        if (!cancelled) {
          setFontsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  const languageOptions: SegmentedOption<Language>[] = LANGUAGES.map((code) => ({
    value: code,
    label: dict.languages[code],
  }));

  const themeOptions: SegmentedOption<ThemePreference>[] = [
    { value: 'light', label: dict.themes.light, description: dict.themes.lightDescription },
    { value: 'dark', label: dict.themes.dark, description: dict.themes.darkDescription },
    { value: 'custom', label: dict.themes.custom, description: dict.themes.customDescription },
    { value: 'system', label: dict.themes.system, description: dict.themes.systemDescription },
  ];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={dict.settings.title}
      subtitle={dict.settings.subtitle}
      footer={
        <Button variant="primary" onClick={onClose}>
          {dict.settings.close}
        </Button>
      }
    >
      <div className="settings-field">
        <label className="settings-field__label">{dict.settings.languageLabel}</label>
        <SegmentedControl
          value={settings.language}
          options={languageOptions}
          onChange={(lang) => {
            void onUpdate({ language: lang });
          }}
          ariaLabel={dict.settings.languageLabel}
          fullWidth
          idPrefix="settings-lang"
        />
        <span className="settings-field__hint">{dict.settings.languageHint}</span>
      </div>

      <div className="settings-field">
        <label className="settings-field__label">{dict.settings.themeLabel}</label>
        <SegmentedControl
          value={settings.theme}
          options={themeOptions}
          onChange={(t) => {
            void onUpdate({ theme: t });
          }}
          ariaLabel={dict.settings.themeLabel}
          fullWidth
          idPrefix="settings-theme"
        />
        <span className="settings-field__hint">{dict.settings.themeHint}</span>
        <div className="settings-field__actions">
          <Button variant="secondary" size="sm" onClick={() => setCustomThemeOpen(true)}>
            {dict.settings.customThemeOpen}
          </Button>
          <span className="settings-field__hint">{dict.settings.customThemeHint}</span>
        </div>
      </div>

      <div className="settings-field">
        <label className="settings-field__label" htmlFor="settings-font-family">
          {dict.settings.fontLabel}
        </label>
        <select
          id="settings-font-family"
          className="settings-select"
          value={settings.writingFontFamily ?? ''}
          onChange={(event) => {
            void onUpdate({ writingFontFamily: event.target.value || null });
          }}
        >
          <option value="">{dict.settings.fontDefault}</option>
          {fonts.map((font) => (
            <option key={font} value={font}>
              {font}
            </option>
          ))}
        </select>
        <span className="settings-field__hint">
          {fontsLoading ? dict.settings.fontLoading : dict.settings.fontHint}
        </span>
        <span className="settings-field__hint">{dict.settings.fontLatexNotice}</span>
      </div>

      <div className="settings-field">
        <label className="settings-field__label">{dict.settings.openDefaultApps}</label>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            void window.doku.system.openDefaultAppsPreferences();
          }}
        >
          {dict.settings.openDefaultApps}
        </Button>
        <span className="settings-field__hint">{dict.settings.defaultAppsHint}</span>
      </div>

      <CustomThemeDialog
        open={customThemeOpen}
        initialTheme={settings.customTheme}
        onClose={() => setCustomThemeOpen(false)}
        onApply={async (customTheme) => {
          await onUpdate({ theme: 'custom', customTheme });
          setCustomThemeOpen(false);
        }}
      />
    </Dialog>
  );
}
