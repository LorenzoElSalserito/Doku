import { useMemo, type CSSProperties } from 'react';
import { Card, Icon } from '@doku/ui';
import type { DocumentSession, DocumentSummary, WorkspaceNode } from '@doku/application';
import { useDict } from '../../i18n/I18nProvider.js';
import { WorkspaceExplorer } from './WorkspaceExplorer.js';
import type { SaveState, ViewMode } from './workspaceTypes.js';
import {
  basenameOf,
  countWords,
  dirnameOf,
  formatTimestamp,
  statusLabel,
  viewModeLabel,
} from './workspaceDocuments.js';
import { SaveStateIcon } from './WorkspaceIcons.js';

interface ExplorerPanelProps {
  style: CSSProperties | undefined;
  document: DocumentSession | null;
  workspaceTree: WorkspaceNode[];
  onOpenFile: (path: string) => void;
  onCreateFile: () => void;
  onCreateFolder: () => void;
}

/** Left panel: the folder of the active file, or a hint for unsaved drafts. */
export function ExplorerPanel({
  style,
  document,
  workspaceTree,
  onOpenFile,
  onCreateFile,
  onCreateFolder,
}: ExplorerPanelProps) {
  const dict = useDict();

  return (
    <aside
      className="workspace__panel workspace__panel--left"
      style={style}
      aria-label={dict.workspace.leftPanelLabel}
    >
      <Card className="workspace__panel-card workspace__panel-card--feature workspace__panel-card--explorer">
        <header className="workspace__panel-head">
          <span className="workspace__panel-eyebrow">
            {dict.workspace.workspaceExplorer.openFolder}
          </span>
          <h2
            className="workspace__panel-title workspace__panel-title--compact"
            title={document?.path ? dirnameOf(document.path) : undefined}
          >
            {document?.path
              ? basenameOf(dirnameOf(document.path)) || dict.workspace.workspaceExplorer.title
              : dict.workspace.workspaceExplorer.title}
          </h2>
        </header>
        {document?.path ? (
          <WorkspaceExplorer
            nodes={workspaceTree}
            activePath={document.path}
            onOpenFile={onOpenFile}
            onCreateFile={onCreateFile}
            onCreateFolder={onCreateFolder}
          />
        ) : (
          <p className="workspace__panel-meta">{dict.workspace.workspaceExplorer.draftHint}</p>
        )}
      </Card>
    </aside>
  );
}

interface DocumentInfoPanelProps {
  style: CSSProperties | undefined;
  document: DocumentSession | null;
  recentDocuments: DocumentSummary[];
  saveState: SaveState;
  errorMessage: string | null;
  viewMode: ViewMode;
  onSelectRecent: (summary: DocumentSummary) => void;
}

/** Right panel: word and character counts, recent documents, session state. */
export function DocumentInfoPanel({
  style,
  document,
  recentDocuments,
  saveState,
  errorMessage,
  viewMode,
  onSelectRecent,
}: DocumentInfoPanelProps) {
  const dict = useDict();
  const previewContent = document?.content ?? '';
  const words = useMemo(() => countWords(previewContent), [previewContent]);
  const characters = previewContent.length;

  return (
    <aside
      className="workspace__panel workspace__panel--right"
      style={style}
      aria-label={dict.workspace.rightPanelLabel}
    >
      <Card className="workspace__panel-card workspace__panel-card--feature">
        <span className="workspace__panel-eyebrow">{dict.workspace.projectPanelEyebrow}</span>
        <dl className="workspace__metrics">
          <div className="workspace__metric">
            <dt>{dict.workspace.wordCountLabel}</dt>
            <dd>{words.toLocaleString()}</dd>
          </div>
          <div className="workspace__metric">
            <dt>{dict.workspace.charCountLabel}</dt>
            <dd>{characters.toLocaleString()}</dd>
          </div>
        </dl>
      </Card>

      <Card className="workspace__panel-card workspace__panel-card--secondary">
        <header className="workspace__panel-head workspace__panel-head--row">
          <Icon name="clock-history" size={14} className="workspace__panel-head-icon" />
          <h3 className="workspace__panel-subtitle">{dict.workspace.recentDocumentsTitle}</h3>
        </header>
        {recentDocuments.length > 0 ? (
          <div className="workspace__recent-list">
            {recentDocuments.map((summary) => (
              <button
                key={summary.id}
                type="button"
                className="workspace__recent-item"
                onClick={() => onSelectRecent(summary)}
                title={summary.path ?? summary.title}
              >
                <Icon name="file-earmark-text" size={14} className="workspace__recent-icon" />
                <span className="workspace__recent-copy">
                  <span className="workspace__recent-title">{summary.title}</span>
                  <span className="workspace__recent-meta">
                    {summary.snippet || formatTimestamp(summary.lastOpenedAt)}
                  </span>
                </span>
              </button>
            ))}
          </div>
        ) : (
          <p className="workspace__panel-meta">{dict.workspace.fileMenu.recentEmpty}</p>
        )}
      </Card>

      <Card className="workspace__panel-card workspace__panel-card--secondary">
        <header className="workspace__panel-head workspace__panel-head--row">
          <span
            className={`workspace__session-status workspace__session-status--${saveState}`}
            aria-hidden="true"
          >
            <SaveStateIcon state={saveState} />
          </span>
          <h3 className="workspace__panel-subtitle">{dict.workspace.sessionTitle}</h3>
        </header>
        <dl className="workspace__session-list">
          <div className="workspace__session-row">
            <dt>{dict.workspace.savedAtLabel}</dt>
            <dd>
              {document?.lastSavedAt
                ? formatTimestamp(document.lastSavedAt)
                : dict.workspace.autosaveLabel}
            </dd>
          </div>
          <div className="workspace__session-row">
            <dt>{dict.workspace.sessionUpdatedLabel}</dt>
            <dd>
              {document?.lastOpenedAt
                ? formatTimestamp(document.lastOpenedAt)
                : dict.workspace.autosaveLabel}
            </dd>
          </div>
          <div className="workspace__session-row">
            <dt>{dict.workspace.sessionViewModeLabel}</dt>
            <dd>{viewModeLabel(viewMode, dict.workspace)}</dd>
          </div>
          <div className="workspace__session-row">
            <dt>{dict.workspace.sessionStorageLabel}</dt>
            <dd>
              {document?.kind === 'file'
                ? dict.workspace.sessionStorageFile
                : dict.workspace.sessionStorageDraft}
            </dd>
          </div>
        </dl>
        <p
          className={`workspace__panel-meta workspace__session-note${
            errorMessage ? ' workspace__session-note--error' : ''
          }`}
        >
          {errorMessage ?? statusLabel(saveState, dict.workspace)}
        </p>
      </Card>
    </aside>
  );
}
