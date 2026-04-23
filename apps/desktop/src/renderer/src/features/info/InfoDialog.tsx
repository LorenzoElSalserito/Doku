import { useEffect, useState } from 'react';
import { Button, Dialog } from '@doku/ui';
import { useDict } from '../../i18n/I18nProvider.js';
import { PRODUCT_ICON_URL } from '../../branding.js';

const APP_LICENSE = 'AGPL-3.0-only';
const DONATE_URL = 'https://www.paypal.me/lorenzodemarco92';
const FALLBACK_APP_VERSION = '0.1.0';
const BUG_REPORT_EMAIL = 'commercial.lorenzodm@gmail.com';

interface InfoDialogProps {
  open: boolean;
  onClose: () => void;
}

export function InfoDialog({ open, onClose }: InfoDialogProps) {
  const dict = useDict();
  const [appVersion, setAppVersion] = useState(FALLBACK_APP_VERSION);

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;

    const loadAppInfo = async () => {
      try {
        const info = await window.doku.system.appInfo();
        if (!cancelled) {
          setAppVersion(info.version);
        }
      } catch {
        if (!cancelled) {
          setAppVersion(FALLBACK_APP_VERSION);
        }
      }
    };

    void loadAppInfo();

    return () => {
      cancelled = true;
    };
  }, [open]);

  const openExternal = (url: string) => {
    void window.doku.system.openExternal(url);
  };

  const handleReportBug = async () => {
    const diagnostics =
      (await (
        window.doku.system as {
          diagnostics?: typeof window.doku.system.diagnostics;
        }
      ).diagnostics?.()) ?? {
        sessionId: 'unavailable',
        startedAt: '',
        logFilePath: '',
        logPreview: '',
        appDataDir: '',
        electronUserDataDir: '',
      };
    const body = [
      '',
      '',
      '---',
      `App: ${dict.app.name}`,
      `Version: ${appVersion}`,
      `Platform: ${window.doku.system.platform}`,
      `Session: ${diagnostics.sessionId}`,
      `Log file to attach: ${diagnostics.logFilePath}`,
      `App data: ${diagnostics.appDataDir}`,
      `Electron profile: ${diagnostics.electronUserDataDir}`,
      '',
      'Describe the issue here.',
      '',
      'Latest session log preview:',
      diagnostics.logPreview || '(log unavailable)',
    ].join('\n');

    const mailtoUrl = `mailto:${BUG_REPORT_EMAIL}?subject=${encodeURIComponent('[DOKU BUG]')}&body=${encodeURIComponent(body)}`;
    openExternal(mailtoUrl);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={dict.info.title}
      subtitle={dict.info.subtitle}
      footer={
        <div className="info-dialog__links">
          <Button variant="secondary" onClick={() => openExternal(DONATE_URL)}>
            {dict.info.donations}
          </Button>
          <Button variant="secondary" onClick={() => void handleReportBug()}>
            {dict.info.reportBug}
          </Button>
          <Button variant="primary" onClick={onClose}>
            {dict.info.close}
          </Button>
        </div>
      }
    >
      <div className="info-dialog__brand">
        <div className="info-dialog__icon-frame">
          <img className="info-dialog__icon" src={PRODUCT_ICON_URL} alt="" aria-hidden />
        </div>
      </div>
      <dl className="info-dialog__meta">
        <div>
          <dt>{dict.info.versionLabel}</dt>
          <dd>{appVersion}</dd>
        </div>
        <div>
          <dt>{dict.info.licenseLabel}</dt>
          <dd>{APP_LICENSE}</dd>
        </div>
      </dl>
      <p className="info-dialog__local">{dict.info.local}</p>
    </Dialog>
  );
}
