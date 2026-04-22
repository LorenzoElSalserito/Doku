import { useEffect, useState } from 'react';
import { Button, Dialog, SegmentedControl, type SegmentedOption } from '@doku/ui';
import type { PdfExportResult, PdfExportRequest } from '@doku/application';
import { useDict } from '../../i18n/I18nProvider.js';

interface ExportDialogProps {
  open: boolean;
  documentTitle: string;
  documentContent: string;
  documentPath?: string;
  onClose: () => void;
}

type ExportState =
  | { status: 'idle'; error: null; result: null }
  | { status: 'exporting'; error: null; result: null }
  | { status: 'error'; error: string; result: null }
  | { status: 'success'; error: null; result: PdfExportResult };

const INITIAL_STATE: ExportState = {
  status: 'idle',
  error: null,
  result: null,
};

export function ExportDialog({
  open,
  documentTitle,
  documentContent,
  documentPath,
  onClose,
}: ExportDialogProps) {
  const dict = useDict();
  const [state, setState] = useState<ExportState>(INITIAL_STATE);
  const [engine, setEngine] = useState<PdfExportRequest['engine']>('lualatex');
  const suggestedOutputPath = buildSuggestedOutputPath(documentTitle, documentPath);
  const profileOptions: SegmentedOption<PdfExportRequest['engine']>[] = [
    { value: 'lualatex', label: dict.exportDialog.profiles.lualatex.label },
    { value: 'weasy', label: dict.exportDialog.profiles.weasy.label },
  ];
  const selectedProfile = dict.exportDialog.profiles[engine];

  useEffect(() => {
    if (open) {
      setState(INITIAL_STATE);
      setEngine('lualatex');
    }
  }, [open]);

  const handleExport = async () => {
    setState({ status: 'exporting', error: null, result: null });

    try {
      const result = await window.doku.exports.exportPdf({
        engine,
        title: documentTitle,
        content: documentContent,
        sourcePath: documentPath,
      });
      setState({ status: 'success', error: null, result });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : dict.exportDialog.errorGeneric;
      if (message === 'Export operation canceled.') {
        setState(INITIAL_STATE);
        return;
      }
      setState({ status: 'error', error: message, result: null });
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={dict.exportDialog.title}
      subtitle={dict.exportDialog.subtitle}
      className="doku-dialog--wide"
      footer={
        <div className="export-dialog__actions">
          <Button variant="secondary" onClick={onClose}>
            {dict.exportDialog.close}
          </Button>
          <Button variant="primary" onClick={() => void handleExport()} disabled={state.status === 'exporting'}>
            {state.status === 'exporting' ? dict.exportDialog.exporting : dict.exportDialog.confirm}
          </Button>
        </div>
      }
    >
      <div className="export-dialog">
        <div className="export-dialog__card">
          <span className="export-dialog__eyebrow">{dict.exportDialog.profileLabel}</span>
          <SegmentedControl
            value={engine}
            options={profileOptions}
            onChange={setEngine}
            ariaLabel={dict.exportDialog.profileLabel}
            fullWidth
            idPrefix="export-pdf-profile"
          />
          <h3 className="export-dialog__title">{selectedProfile.title}</h3>
          <p className="export-dialog__body">{selectedProfile.description}</p>
        </div>

        <dl className="export-dialog__meta">
          <div>
            <dt>{dict.exportDialog.documentLabel}</dt>
            <dd>{documentTitle}</dd>
          </div>
          <div>
            <dt>{dict.exportDialog.outputLabel}</dt>
            <dd>
              <code>{suggestedOutputPath}</code>
            </dd>
          </div>
        </dl>

        {state.status === 'exporting' && (
          <div className="export-dialog__result" role="status" aria-live="polite">
            <strong>{dict.exportDialog.exporting}</strong>
            <p>{dict.exportDialog.outputHint}</p>
          </div>
        )}

        {state.status === 'success' && state.result && (
          <div className="export-dialog__result export-dialog__result--success" role="status">
            <strong>{dict.exportDialog.successTitle}</strong>
            <p>{dict.exportDialog.successBody}</p>
            <code>{state.result.outputPath}</code>
            <p className="export-dialog__meta-note">
              {dict.exportDialog.resultEngineLabel}: {dict.exportDialog.profiles[state.result.engine].label}
            </p>
            <p className="export-dialog__meta-note">
              {formatFileSize(state.result.fileSizeBytes)} · {formatTimestamp(state.result.exportedAt)}
            </p>
          </div>
        )}

        {state.status === 'error' && state.error && (
          <div className="export-dialog__result export-dialog__result--error" role="alert">
            <strong>{dict.exportDialog.errorTitle}</strong>
            <p>{state.error}</p>
          </div>
        )}
      </div>
    </Dialog>
  );
}

function buildSuggestedOutputPath(documentTitle: string, documentPath?: string): string {
  if (documentPath) {
    return documentPath.replace(/\.[^.]+$/, '.pdf');
  }

  return `${sanitizeFileName(documentTitle)}.pdf`;
}

function sanitizeFileName(value: string): string {
  return value
    .trim()
    .replace(/[<>:"/\\|?*]+/g, '-')
    .replace(/\s+/g, '-')
    .toLowerCase();
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatTimestamp(value: string): string {
  return new Date(value).toLocaleString();
}
