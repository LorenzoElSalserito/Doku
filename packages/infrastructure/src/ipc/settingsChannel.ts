import { ipcMain } from 'electron';
import { SettingsPatchSchema } from '@doku/schemas';
import type { SessionLogger } from '../logging/sessionLogger.js';
import { serializeErrorForLog } from '../logging/sessionLogger.js';
import type { SettingsRepository } from '../settings/settingsRepository.js';
import { IPC_CHANNELS } from './channels.js';

export function registerSettingsChannel(repo: SettingsRepository, logger?: SessionLogger): () => void {
  const getHandler = async () => {
    const startedAt = Date.now();
    logger?.info('settings:get-started');
    try {
      const settings = await repo.read();
      logger?.info('settings:get-finished', {
        elapsedMs: Date.now() - startedAt,
        language: settings.language,
        theme: settings.theme,
        firstRunCompleted: settings.firstRunCompleted,
      });
      return settings;
    } catch (error: unknown) {
      logger?.error('settings:get-failed', {
        elapsedMs: Date.now() - startedAt,
        error: serializeErrorForLog(error),
      });
      throw error;
    }
  };

  const setHandler = async (_event: Electron.IpcMainInvokeEvent, raw: unknown) => {
    const patch = SettingsPatchSchema.parse(raw);
    const startedAt = Date.now();
    logger?.info('settings:set-started', { fields: Object.keys(patch) });
    try {
      const settings = await repo.update(patch);
      logger?.info('settings:set-finished', {
        elapsedMs: Date.now() - startedAt,
        fields: Object.keys(patch),
      });
      return settings;
    } catch (error: unknown) {
      logger?.error('settings:set-failed', {
        elapsedMs: Date.now() - startedAt,
        fields: Object.keys(patch),
        error: serializeErrorForLog(error),
      });
      throw error;
    }
  };

  ipcMain.handle(IPC_CHANNELS.settingsGet, getHandler);
  ipcMain.handle(IPC_CHANNELS.settingsSet, setHandler);

  return () => {
    ipcMain.removeHandler(IPC_CHANNELS.settingsGet);
    ipcMain.removeHandler(IPC_CHANNELS.settingsSet);
  };
}
