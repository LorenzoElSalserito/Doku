import { Suspense, lazy, useCallback, useMemo, useState } from 'react';
import { ThemeProvider } from '@doku/ui';
import type { Settings, SettingsPatch, ThemePreference } from '@doku/application';
import { useSettings } from '../hooks/useSettings.js';
import { I18nProvider, useDict } from '../i18n/I18nProvider.js';
import { SetupWizard } from '../features/wizard/SetupWizard.js';
import { Workspace } from '../features/workspace/Workspace.js';
import { AppLoading } from './AppLoading.js';
import { AppError } from './AppError.js';
import type { LanguageCode } from '../i18n/keys.js';

const SettingsDialog = lazy(async () => {
  const module = await import('../features/settings/SettingsDialog.js');
  return { default: module.SettingsDialog };
});
const InfoDialog = lazy(async () => {
  const module = await import('../features/info/InfoDialog.js');
  return { default: module.InfoDialog };
});
const ExportDialog = lazy(async () => {
  const module = await import('../features/export/ExportDialog.js');
  return { default: module.ExportDialog };
});
const GuideDialog = lazy(async () => {
  const module = await import('../features/guide/GuideDialog.js');
  return { default: module.GuideDialog };
});

export function App() {
  const { status, settings, error, update } = useSettings();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportDraft, setExportDraft] = useState<{
    title: string;
    content: string;
    path?: string;
  } | null>(null);
  const bootstrapLanguage = settings?.language ?? resolvePreferredLanguage();

  const handleThemeChange = useCallback(
    (next: ThemePreference) => {
      void update({ theme: next });
    },
    [update],
  );

  if (status === 'loading' || !settings) {
    return (
      <I18nProvider language={bootstrapLanguage}>
        <AppLoading />
      </I18nProvider>
    );
  }

  if (status === 'error') {
    return (
      <I18nProvider language={bootstrapLanguage}>
        <AppError error={error} />
      </I18nProvider>
    );
  }

  return (
    <I18nProvider language={settings.language}>
      <ThemeProvider
        preference={settings.theme}
        customTheme={settings.customTheme}
        writingFontFamily={settings.writingFontFamily}
        onPreferenceChange={handleThemeChange}
      >
        <AppShell
          settings={settings}
          settingsOpen={settingsOpen}
          infoOpen={infoOpen}
          guideOpen={guideOpen}
          exportOpen={exportOpen}
          onUpdate={update}
          onOpenSettings={() => setSettingsOpen(true)}
          onCloseSettings={() => setSettingsOpen(false)}
          onOpenInfo={() => setInfoOpen(true)}
          onCloseInfo={() => setInfoOpen(false)}
          onOpenGuide={() => setGuideOpen(true)}
          onCloseGuide={() => setGuideOpen(false)}
          onOpenExport={(document) => {
            setExportDraft(document);
            setExportOpen(true);
          }}
          onCloseExport={() => setExportOpen(false)}
          exportDraft={exportDraft}
        />
      </ThemeProvider>
    </I18nProvider>
  );
}

interface AppShellProps {
  settings: Settings;
  settingsOpen: boolean;
  infoOpen: boolean;
  guideOpen: boolean;
  exportOpen: boolean;
  exportDraft: { title: string; content: string; path?: string } | null;
  onUpdate: (patch: SettingsPatch) => Promise<void>;
  onOpenSettings: () => void;
  onCloseSettings: () => void;
  onOpenInfo: () => void;
  onCloseInfo: () => void;
  onOpenGuide: () => void;
  onCloseGuide: () => void;
  onOpenExport: (document: { title: string; content: string; path?: string }) => void;
  onCloseExport: () => void;
}

function AppShell({
  settings,
  settingsOpen,
  infoOpen,
  guideOpen,
  exportOpen,
  exportDraft,
  onUpdate,
  onOpenSettings,
  onCloseSettings,
  onOpenInfo,
  onCloseInfo,
  onOpenGuide,
  onCloseGuide,
  onOpenExport,
  onCloseExport,
}: AppShellProps) {
  const dict = useDict();
  const quickResumeDocument = useMemo(
    () =>
      settings.launcher.recentDocuments.find(
        (document) => document.id === settings.launcher.quickResumeId,
      ) ??
      settings.launcher.recentDocuments[0] ??
      null,
    [settings.launcher],
  );

  if (!settings.firstRunCompleted) {
    return <SetupWizard initialSettings={settings} onComplete={onUpdate} />;
  }

  return (
    <div className="app-root">
      <a className="app-skip-link" href="#workspace-editor">
        {dict.app.skipToEditor}
      </a>

      <Workspace
        settings={settings}
        initialDocument={quickResumeDocument}
        onUpdate={onUpdate}
        onOpenSettings={onOpenSettings}
        onOpenInfo={onOpenInfo}
        onOpenGuide={onOpenGuide}
        onOpenExport={onOpenExport}
      />

      <Suspense fallback={null}>
        {settingsOpen ? (
          <SettingsDialog
            open={settingsOpen}
            onClose={onCloseSettings}
            settings={settings}
            onUpdate={onUpdate}
          />
        ) : null}
      </Suspense>

      <Suspense fallback={null}>
        {infoOpen ? <InfoDialog open={infoOpen} onClose={onCloseInfo} /> : null}
      </Suspense>
      <Suspense fallback={null}>
        {guideOpen ? <GuideDialog open={guideOpen} onClose={onCloseGuide} /> : null}
      </Suspense>
      <Suspense fallback={null}>
        {exportOpen ? (
          <ExportDialog
            open={exportOpen}
            onClose={onCloseExport}
            documentTitle={
              exportDraft?.title ?? quickResumeDocument?.title ?? dict.workspace.untitledDocument
            }
            documentContent={exportDraft?.content ?? ''}
            documentPath={exportDraft?.path}
          />
        ) : null}
      </Suspense>
    </div>
  );
}

function resolvePreferredLanguage(): LanguageCode {
  if (typeof navigator === 'undefined') {
    return 'en';
  }

  const language = navigator.language.toLowerCase();
  if (language.startsWith('it')) return 'it';
  if (language.startsWith('es')) return 'es';
  if (language.startsWith('de')) return 'de';
  if (language.startsWith('fr')) return 'fr';
  if (language.startsWith('pt')) return 'pt';
  return 'en';
}
