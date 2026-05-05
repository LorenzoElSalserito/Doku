// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@doku/ui';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS } from '@doku/schemas';
import type { SettingsPatch } from '@doku/application';
import { I18nProvider } from '../../i18n/I18nProvider.js';
import { SettingsDialog } from './SettingsDialog.js';

describe('SettingsDialog', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    HTMLDialogElement.prototype.showModal = vi.fn(function showModal(this: HTMLDialogElement) {
      this.open = true;
    });
    HTMLDialogElement.prototype.close = vi.fn(function close(this: HTMLDialogElement) {
      this.open = false;
    });

    Object.defineProperty(window, 'doku', {
      configurable: true,
      value: {
        system: {
          openDefaultAppsPreferences: vi.fn(),
          prepareForUninstall: vi.fn(),
          logEvent: vi.fn(),
        },
      },
    });
  });

  it('shows a restart alert after visual preferences change', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn().mockResolvedValue(undefined);

    render(
      <I18nProvider language="en">
        <ThemeProvider preference="light">
          <SettingsDialog
            open
            onClose={vi.fn()}
            settings={DEFAULT_SETTINGS}
            onUpdate={onUpdate}
          />
        </ThemeProvider>
      </I18nProvider>,
    );

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: '125%' }));

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Restart Doku to apply visual changes cleanly.',
    );
    expect(onUpdate).toHaveBeenCalledWith({ appZoom: 125 });
  });

  it('shows a restart alert after theme changes', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn().mockResolvedValue(undefined);

    renderSettingsDialog({ onUpdate });

    await user.click(screen.getByRole('tab', { name: 'Dark' }));

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Restart Doku to apply visual changes cleanly.',
    );
    expect(onUpdate).toHaveBeenCalledWith({ theme: 'dark' });
  });

  it('applies font changes without requiring restart', () => {
    const onUpdate = vi.fn().mockResolvedValue(undefined);

    renderSettingsDialog({ onUpdate });

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole('combobox', { name: /typography/i }), {
      target: { value: 'Roboto' },
    });

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(onUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        writingFontFamily: null,
        typography: expect.objectContaining({
          uiFontFamily: 'Roboto',
        }),
      }),
    );
  });
});

function renderSettingsDialog({
  onUpdate = vi.fn<(patch: SettingsPatch) => Promise<void>>().mockResolvedValue(undefined),
}: {
  onUpdate?: (patch: SettingsPatch) => Promise<void>;
} = {}) {
  return render(
    <I18nProvider language="en">
      <ThemeProvider preference="light">
        <SettingsDialog
          open
          onClose={vi.fn()}
          settings={DEFAULT_SETTINGS}
          onUpdate={onUpdate}
        />
      </ThemeProvider>
    </I18nProvider>,
  );
}
