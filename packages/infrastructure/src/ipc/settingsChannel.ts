import { ipcMain } from 'electron';
import { SettingsPatchSchema } from '@doku/schemas';
import type { SettingsRepository } from '../settings/settingsRepository.js';
import { IPC_CHANNELS } from './channels.js';

export function registerSettingsChannel(repo: SettingsRepository): () => void {
  const getHandler = async () => repo.read();

  const setHandler = async (_event: Electron.IpcMainInvokeEvent, raw: unknown) => {
    const patch = SettingsPatchSchema.parse(raw);
    return repo.update(patch);
  };

  ipcMain.handle(IPC_CHANNELS.settingsGet, getHandler);
  ipcMain.handle(IPC_CHANNELS.settingsSet, setHandler);

  return () => {
    ipcMain.removeHandler(IPC_CHANNELS.settingsGet);
    ipcMain.removeHandler(IPC_CHANNELS.settingsSet);
  };
}
