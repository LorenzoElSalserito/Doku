import { Button, Input } from '@doku/ui';
import { useDict } from '../../i18n/I18nProvider.js';
import { ContentColorsControl } from './ContentColorsControl.js';
import { MARKDOWN_ACTION_SPECS } from './markdownActions.js';
import type { QuickActionsControls } from './hooks/useQuickActions.js';
import type { ViewMode } from './workspaceTypes.js';
import { MarkdownActionIcon, TableIcon } from './WorkspaceIcons.js';

interface QuickActionsBarProps {
  viewMode: ViewMode;
  controls: QuickActionsControls;
}

/** Markdown formatting buttons, content colours and the table inserter. */
export function QuickActionsBar({ viewMode, controls }: QuickActionsBarProps) {
  const dict = useDict();

  return (
    <div className="workspace__quick-actions" aria-label={dict.workspace.quickActions.barLabel}>
      <div className="workspace__quick-actions-list">
        {MARKDOWN_ACTION_SPECS.map((action) => (
          <Button
            key={action.id}
            variant="ghost"
            size="sm"
            className="workspace__quick-action-button"
            onClick={() => controls.handleMarkdownAction(action.id)}
            disabled={viewMode === 'preview'}
            aria-label={action.label(dict.workspace.quickActions)}
            title={action.label(dict.workspace.quickActions)}
          >
            <MarkdownActionIcon actionId={action.id} />
          </Button>
        ))}
        <ContentColorsControl
          labels={dict.workspace.contentColors}
          colors={controls.contentColors}
          onChange={controls.handleContentColorsChange}
        />
      </div>

      <div className="workspace__quick-actions-table">
        <span className="workspace__quick-actions-table-label">
          <TableIcon />
          {dict.workspace.quickActions.tableButton}
        </span>
        <label className="workspace__quick-actions-field">
          <span>{dict.workspace.quickActions.tableRows}</span>
          <Input
            type="number"
            min={1}
            max={12}
            value={controls.tableRows}
            onChange={(event) => controls.setTableRows(event.target.value)}
          />
        </label>
        <label className="workspace__quick-actions-field">
          <span>{dict.workspace.quickActions.tableColumns}</span>
          <Input
            type="number"
            min={1}
            max={8}
            value={controls.tableColumns}
            onChange={(event) => controls.setTableColumns(event.target.value)}
          />
        </label>
        <Button
          variant="secondary"
          size="sm"
          onClick={controls.handleInsertTable}
          disabled={viewMode === 'preview'}
        >
          {dict.workspace.quickActions.tableInsert}
        </Button>
      </div>
    </div>
  );
}
