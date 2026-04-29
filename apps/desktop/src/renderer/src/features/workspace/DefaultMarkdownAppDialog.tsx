import { Button, Dialog } from '@doku/ui';
import type { Platform } from '@doku/application';
import { useDict } from '../../i18n/I18nProvider.js';
import { useState } from 'react';

interface DefaultMarkdownAppDialogProps {
  open: boolean;
  platform: Platform;
  onClose: (options: { dontAskAgain: boolean }) => void;
  onOpenPreferences: (options: { dontAskAgain: boolean }) => void;
}

export function DefaultMarkdownAppDialog({
  open,
  platform,
  onClose,
  onOpenPreferences,
}: DefaultMarkdownAppDialogProps) {
  const dict = useDict();
  const [dontAskAgain, setDontAskAgain] = useState(true);

  return (
    <Dialog
      open={open}
      onClose={() => onClose({ dontAskAgain })}
      title={dict.defaultAppPrompt.title}
      subtitle={dict.defaultAppPrompt.subtitle}
      footer={
        <div className="default-app-dialog__actions">
          <Button variant="secondary" onClick={() => onClose({ dontAskAgain })}>
            {dict.defaultAppPrompt.notNow}
          </Button>
          <Button variant="primary" onClick={() => onOpenPreferences({ dontAskAgain })}>
            {dict.defaultAppPrompt.openPreferences}
          </Button>
        </div>
      }
    >
      <label className="settings-checkbox">
        <input
          type="checkbox"
          checked={dontAskAgain}
          onChange={(event) => setDontAskAgain(event.currentTarget.checked)}
        />
        <span>{dict.defaultAppPrompt.dontAskAgain}</span>
      </label>
      {platform === 'linux' ? (
        <p className="default-app-dialog__hint">{dict.defaultAppPrompt.linuxHint}</p>
      ) : null}
    </Dialog>
  );
}
