import { ipcMain } from 'electron';
import { SettingsPatchSchema } from '@doku/schemas';
import type { SessionLogger } from '../logging/sessionLogger.js';
import type { SettingsRepository } from '../settings/settingsRepository.js';
import { IPC_CHANNELS } from './channels.js';

export function registerSettingsChannel(repo: SettingsRepository, logger?: SessionLogger): () => void {
  const getHandler = async () => {
    logger?.info('settings:get');
    return repo.read();
  };

  const setHandler = async (_event: Electron.IpcMainInvokeEvent, raw: unknown) => {
    const patch = SettingsPatchSchema.parse(raw);
    logger?.info('settings:set', { fields: Object.keys(patch) });
    return repo.update(patch);
  };

  ipcMain.handle(IPC_CHANNELS.settingsGet, getHandler);
  ipcMain.handle(IPC_CHANNELS.settingsSet, setHandler);

  return () => {
    ipcMain.removeHandler(IPC_CHANNELS.settingsGet);
    ipcMain.removeHandler(IPC_CHANNELS.settingsSet);
  };
}
