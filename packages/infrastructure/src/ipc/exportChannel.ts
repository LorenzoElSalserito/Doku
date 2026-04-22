import { basename } from 'node:path';
import { BrowserWindow, dialog, ipcMain, type SaveDialogOptions } from 'electron';
import { PdfExportRequestSchema, type PdfExportRequest, type PdfExportResult } from '@doku/schemas';
import { LatexPdfExportService } from '../export/latexPdfExportService.js';
import { WeasyPdfExportService } from '../export/weasyPdfExportService.js';
import { IPC_CHANNELS } from './channels.js';

export function registerExportChannel(
  services = {
    lualatex: new LatexPdfExportService(),
    weasy: new WeasyPdfExportService(),
  },
): () => void {
  const exportPdfHandler = async (
    event: Electron.IpcMainInvokeEvent,
    raw: unknown,
  ): Promise<PdfExportResult> => {
    const input = PdfExportRequestSchema.parse(raw);
    const ownerWindow = BrowserWindow.fromWebContents(event.sender) ?? undefined;
    const outputPath = await requestPdfSavePath(ownerWindow, input);

    if (!outputPath) {
      throw new Error('Export operation canceled.');
    }

    if (input.engine === 'weasy') {
      return services.weasy.exportPdf(input, outputPath);
    }

    return services.lualatex.exportPdf(input, outputPath);
  };

  ipcMain.handle(IPC_CHANNELS.exportsPdf, exportPdfHandler);

  return () => {
    ipcMain.removeHandler(IPC_CHANNELS.exportsPdf);
  };
}

async function requestPdfSavePath(
  ownerWindow: BrowserWindow | undefined,
  input: PdfExportRequest,
): Promise<string | null> {
  const dialogOptions: SaveDialogOptions = {
    defaultPath: buildDefaultPdfName(input),
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  };

  const result = ownerWindow
    ? await dialog.showSaveDialog(ownerWindow, dialogOptions)
    : await dialog.showSaveDialog(dialogOptions);

  return result.canceled ? null : (result.filePath ?? null);
}

function buildDefaultPdfName(input: PdfExportRequest): string {
  if (input.sourcePath) {
    return basename(input.sourcePath).replace(/\.[^.]+$/, '.pdf');
  }

  return `${sanitizeFileName(input.title)}.pdf`;
}

function sanitizeFileName(value: string): string {
  return value
    .trim()
    .replace(/[<>:"/\\|?*]+/g, '-')
    .replace(/\s+/g, '-')
    .toLowerCase();
}
