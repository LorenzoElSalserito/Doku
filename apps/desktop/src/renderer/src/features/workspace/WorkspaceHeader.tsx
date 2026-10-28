import { IconButton, SegmentedControl, type SegmentedOption } from '@doku/ui';
import type { DocumentSummary, Settings } from '@doku/application';
import { useDict } from '../../i18n/I18nProvider.js';
import { DocumentTabs } from './DocumentTabs.js';
import { FileMenu } from './FileMenu.js';
import type { SaveState, ViewMode, WorkspaceDocumentTab } from './workspaceTypes.js';
import { statusLabel } from './workspaceDocuments.js';
import {
  ExportIcon,
  GuideIcon,
  InfoIcon,
  PanelLeftIcon,
  PanelRightIcon,
  PreviewModeIcon,
  QuickActionsIcon,
  SaveAsIcon,
  SaveIcon,
  SaveStateIcon,
  SettingsIcon,
  SplitModeIcon,
  WriteModeIcon,
} from './WorkspaceIcons.js';

interface WorkspaceHeaderProps {
  recents: DocumentSummary[];
  tabs: WorkspaceDocumentTab[];
  activeTabId: string | null;
  layout: Settings['workspace'];
  quickActionsVisible: boolean;
  viewMode: ViewMode;
  saveState: SaveState;
  onNewDocument: () => void;
  onOpenFile: () => void;
  onSelectRecent: (summary: DocumentSummary) => void;
  onActivateTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onReorderTabs: (fromId: string, toId: string) => void;
  onReopenTabFromDisk: (tabId: string) => void;
  onToggleLeft: () => void;
  onToggleQuickActions: () => void;
  onToggleRight: () => void;
  onViewModeChange: (mode: ViewMode) => void;
  onSave: () => void;
  onSaveAs: () => void;
  onExport: () => void;
  onOpenGuide: () => void;
  onOpenSettings: () => void;
  onOpenInfo: () => void;
}

/** Top bar: file menu, document tabs, panel and view toggles, file actions. */
export function WorkspaceHeader({
  recents,
  tabs,
  activeTabId,
  layout,
  quickActionsVisible,
  viewMode,
  saveState,
  onNewDocument,
  onOpenFile,
  onSelectRecent,
  onActivateTab,
  onCloseTab,
  onReorderTabs,
  onReopenTabFromDisk,
  onToggleLeft,
  onToggleQuickActions,
  onToggleRight,
  onViewModeChange,
  onSave,
  onSaveAs,
  onExport,
  onOpenGuide,
  onOpenSettings,
  onOpenInfo,
}: WorkspaceHeaderProps) {
  const dict = useDict();

  const viewOptions: SegmentedOption<ViewMode>[] = [
    {
      value: 'write',
      label: <WriteModeIcon />,
      ariaLabel: dict.workspace.writeMode,
      title: dict.workspace.writeMode,
    },
    {
      value: 'preview',
      label: <PreviewModeIcon />,
      ariaLabel: dict.workspace.previewMode,
      title: dict.workspace.previewMode,
    },
    {
      value: 'split',
      label: <SplitModeIcon />,
      ariaLabel: dict.workspace.splitMode,
      title: dict.workspace.splitMode,
    },
  ];

  return (
    <header className="workspace__header">
      <FileMenu
        labels={dict.workspace.fileMenu}
        recents={recents}
        onNew={onNewDocument}
        onOpen={onOpenFile}
        onSelectRecent={onSelectRecent}
      />

      <div className="workspace__header-tabs">
        <DocumentTabs
          tabs={tabs}
          activeTabId={activeTabId}
          labels={dict.workspace.tabs}
          onActivate={onActivateTab}
          onClose={onCloseTab}
          onReorder={onReorderTabs}
          onReopenFromDisk={onReopenTabFromDisk}
        />
      </div>

      <div className="workspace__header-side">
        <div className="workspace__header-actions">
          <div className="workspace__action-group workspace__action-group--panels">
            <IconButton
              label={
                layout.leftPanelCollapsed
                  ? dict.workspace.leftPanelToggleExpand
                  : dict.workspace.leftPanelToggleCollapse
              }
              onClick={onToggleLeft}
            >
              <PanelLeftIcon />
            </IconButton>
            <IconButton
              label={
                quickActionsVisible
                  ? dict.workspace.quickActions.toggleHide
                  : dict.workspace.quickActions.toggleShow
              }
              aria-pressed={quickActionsVisible}
              className={
                quickActionsVisible
                  ? 'workspace__quick-toggle workspace__quick-toggle--active'
                  : 'workspace__quick-toggle'
              }
              onClick={onToggleQuickActions}
            >
              <QuickActionsIcon />
            </IconButton>
            <IconButton
              label={
                layout.rightPanelCollapsed
                  ? dict.workspace.rightPanelToggleExpand
                  : dict.workspace.rightPanelToggleCollapse
              }
              onClick={onToggleRight}
            >
              <PanelRightIcon />
            </IconButton>
          </div>

          <div className="workspace__action-group workspace__action-group--view">
            <SegmentedControl
              value={viewMode}
              options={viewOptions}
              onChange={onViewModeChange}
              ariaLabel={dict.workspace.previewEyebrow}
              idPrefix="workspace-mode"
            />
          </div>

          <div className="workspace__action-group workspace__action-group--primary">
            <IconButton label={dict.workspace.save} onClick={onSave}>
              <SaveIcon />
            </IconButton>
            <IconButton label={dict.workspace.saveAs} onClick={onSaveAs}>
              <SaveAsIcon />
            </IconButton>
            <IconButton label={dict.workspace.export} onClick={onExport}>
              <ExportIcon />
            </IconButton>
          </div>

          <div className="workspace__action-group workspace__action-group--secondary">
            <IconButton label={dict.workspace.guide} onClick={onOpenGuide}>
              <GuideIcon />
            </IconButton>
            <IconButton label={dict.workspace.settings} onClick={onOpenSettings}>
              <SettingsIcon />
            </IconButton>
            <IconButton label={dict.workspace.info} onClick={onOpenInfo}>
              <InfoIcon />
            </IconButton>
          </div>
        </div>

        <span
          className={`workspace__save-indicator workspace__save-indicator--${saveState}`}
          role="status"
          aria-live="polite"
          aria-label={statusLabel(saveState, dict.workspace)}
          title={statusLabel(saveState, dict.workspace)}
        >
          <SaveStateIcon state={saveState} />
        </span>
      </div>
    </header>
  );
}
