import { useState } from 'react';
import { Button, Dialog, SegmentedControl, type SegmentedOption } from '@doku/ui';
import {
  DOKU_FONT_CATALOG,
  buildUnifiedDokuTypography,
  type AppZoom,
  type DokuFontFamily,
  type Language,
  type Settings,
  type SettingsPatch,
  type ThemePreference,
} from '@doku/application';
import { LANGUAGE_FLAGS, LANGUAGES } from '../../i18n/keys.js';
import { useDict } from '../../i18n/I18nProvider.js';
import { CustomThemeDialog } from './CustomThemeDialog.js';

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
  settings: Settings;
  onUpdate: (patch: SettingsPatch) => Promise<void>;
}

function logSettingsDialogEvent(event: string, context?: Record<string, unknown>): void {
  void (window.doku.system as { logEvent?: (event: string, context?: Record<string, unknown>) => Promise<void> })
    .logEvent?.(event, context);
}

type AppZoomOption = '75' | '100' | '125' | '150';

export function SettingsDialog({ open, onClose, settings, onUpdate }: SettingsDialogProps) {
  const dict = useDict();
  const [customThemeOpen, setCustomThemeOpen] = useState(false);
  const [uninstallPreparing, setUninstallPreparing] = useState(false);
  const [restartNoticeVisible, setRestartNoticeVisible] = useState(false);

  const languageOptions: SegmentedOption<Language>[] = LANGUAGES.map((code) => ({
    value: code,
    label: <LanguageOption flag={LANGUAGE_FLAGS[code]} />,
    ariaLabel: dict.languages[code],
    title: dict.languages[code],
  }));

  const themeOptions: SegmentedOption<ThemePreference>[] = [
    { value: 'light', label: dict.themes.light, description: dict.themes.lightDescription },
    { value: 'dark', label: dict.themes.dark, description: dict.themes.darkDescription },
    { value: 'custom', label: dict.themes.custom, description: dict.themes.customDescription },
    { value: 'system', label: dict.themes.system, description: dict.themes.systemDescription },
  ];

  const zoomOptions: SegmentedOption<AppZoomOption>[] = [
    { value: '75', label: '75%' },
    { value: '100', label: '100%' },
    { value: '125', label: '125%' },
    { value: '150', label: '150%' },
  ];

  const updateWithRestartNotice = (patch: SettingsPatch) => {
    setRestartNoticeVisible(true);
    void onUpdate(patch);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={dict.settings.title}
      subtitle={dict.settings.subtitle}
      footer={
        <div className="settings-dialog__footer">
          {restartNoticeVisible ? (
            <div className="settings-restart-notice settings-restart-notice--footer" role="alert">
              {dict.settings.restartNotice}
            </div>
          ) : null}
          <Button variant="primary" onClick={onClose}>
            {dict.settings.close}
          </Button>
        </div>
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
        <label className="settings-field__label">{dict.settings.zoomLabel}</label>
        <SegmentedControl
          value={String(settings.appZoom) as AppZoomOption}
          options={zoomOptions}
          onChange={(appZoom) => {
            updateWithRestartNotice({ appZoom: Number(appZoom) as AppZoom });
          }}
          ariaLabel={dict.settings.zoomLabel}
          fullWidth
          idPrefix="settings-zoom"
        />
        <span className="settings-field__hint">{dict.settings.zoomHint}</span>
      </div>

      <div className="settings-field">
        <label className="settings-field__label">{dict.settings.themeLabel}</label>
        <SegmentedControl
          value={settings.theme}
          options={themeOptions}
          onChange={(t) => {
            updateWithRestartNotice({ theme: t });
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
        <FontSelect
          id="settings-font-family"
          label={dict.settings.fontLabel}
          value={settings.typography.uiFontFamily}
          onChange={(fontFamily) => {
            void onUpdate({
              typography: buildUnifiedDokuTypography(fontFamily),
              writingFontFamily: null,
            });
          }}
        />
        <span className="settings-field__hint">{dict.settings.fontHint}</span>
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

      <div className="settings-field settings-field--danger">
        <label className="settings-field__label">{dict.settings.uninstallPreparationLabel}</label>
        <Button
          variant="secondary"
          size="sm"
          className="settings-danger-button"
          disabled={uninstallPreparing}
          onClick={() => {
            const confirmed = window.confirm(dict.settings.uninstallPreparationConfirm);
            if (!confirmed) {
              return;
            }
            setUninstallPreparing(true);
            logSettingsDialogEvent('uninstall-preparation-confirmed');
            void window.doku.system.prepareForUninstall();
          }}
        >
          {uninstallPreparing
            ? dict.settings.uninstallPreparationWorking
            : dict.settings.uninstallPreparationButton}
        </Button>
        <span className="settings-field__hint">{dict.settings.uninstallPreparationHint}</span>
      </div>

      <CustomThemeDialog
        open={customThemeOpen}
        initialTheme={settings.customTheme}
        onClose={() => setCustomThemeOpen(false)}
        onApply={async (customTheme) => {
          setRestartNoticeVisible(true);
          await onUpdate({ theme: 'custom', customTheme });
          setCustomThemeOpen(false);
        }}
      />
    </Dialog>
  );
}

function LanguageOption({ flag }: { flag: string }) {
  return (
    <span className="language-option language-option--flag-only">
      <span className="language-option__flag" aria-hidden>{flag}</span>
    </span>
  );
}

function FontSelect({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: DokuFontFamily;
  onChange: (next: DokuFontFamily) => void;
}) {
  return (
    <label className="settings-font-select" htmlFor={id}>
      <span className="settings-field__hint">{label}</span>
      <select
        id={id}
        className="settings-select"
        value={value}
        onChange={(event) => onChange(event.target.value as DokuFontFamily)}
      >
        {DOKU_FONT_CATALOG.map((font) => (
          <option key={font.family} value={font.family}>
            {font.family}
          </option>
        ))}
      </select>
      <span className="font-select-preview" style={{ fontFamily: quoteFontFamily(value) }}>
        {DOKU_FONT_CATALOG.find((font) => font.family === value)?.previewText ?? value}
      </span>
    </label>
  );
}

function quoteFontFamily(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}
