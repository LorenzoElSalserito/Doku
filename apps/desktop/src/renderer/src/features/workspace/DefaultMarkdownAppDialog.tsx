import { Button, Dialog } from '@doku/ui';
import type { Platform } from '@doku/application';
import { useDict } from '../../i18n/I18nProvider.js';

interface DefaultMarkdownAppDialogProps {
  open: boolean;
  platform: Platform;
  onClose: () => void;
  onOpenPreferences: () => void;
}

export function DefaultMarkdownAppDialog({
  open,
  platform,
  onClose,
  onOpenPreferences,
}: DefaultMarkdownAppDialogProps) {
  const dict = useDict();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={dict.defaultAppPrompt.title}
      subtitle={dict.defaultAppPrompt.subtitle}
      footer={
        <div className="default-app-dialog__actions">
          <Button variant="secondary" onClick={onClose}>
            {dict.defaultAppPrompt.notNow}
          </Button>
          <Button variant="primary" onClick={onOpenPreferences}>
            {dict.defaultAppPrompt.openPreferences}
          </Button>
        </div>
      }
    >
      {platform === 'linux' ? (
        <p className="default-app-dialog__hint">{dict.defaultAppPrompt.linuxHint}</p>
      ) : null}
    </Dialog>
  );
}
