import { Icon } from '@doku/ui';
import type { MarkdownActionId } from './markdownActions.js';
import type { SaveState } from './workspaceTypes.js';

export function PanelLeftIcon() {
  return <Icon name="layout-sidebar" size={17} />;
}

export function PanelRightIcon() {
  return <Icon name="layout-sidebar-reverse" size={17} />;
}

export function ImmersiveEnterIcon() {
  return <Icon name="arrows-fullscreen" size={15} />;
}

export function ImmersiveExitIcon() {
  return <Icon name="fullscreen-exit" size={15} />;
}

export function FitWidthIcon() {
  return <Icon name="arrows-expand-vertical" size={15} />;
}

export function FitPageIcon() {
  return <Icon name="arrows-expand" size={15} />;
}

export function InvertColorsIcon() {
  return <Icon name="circle-half" size={15} />;
}

export function QuickActionsIcon() {
  return <Icon name="magic" size={17} />;
}

export function WriteModeIcon() {
  return <Icon name="pencil" className="workspace__mode-icon" />;
}

export function PreviewModeIcon() {
  return <Icon name="eye" className="workspace__mode-icon" />;
}

export function SplitModeIcon() {
  return <Icon name="layout-split" className="workspace__mode-icon" />;
}

export function SaveIcon() {
  return <Icon name="floppy" size={17} />;
}

export function SaveAsIcon() {
  return <Icon name="copy" size={17} />;
}

export function SaveStateIcon({ state }: { state: SaveState }) {
  const name =
    state === 'dirty'
      ? 'exclamation-circle'
      : state === 'saving'
        ? 'arrow-repeat'
        : state === 'error'
          ? 'exclamation-triangle'
          : 'check-circle';
  return <Icon name={name} size={17} />;
}

export function ExportIcon() {
  return <Icon name="file-earmark-pdf" size={17} />;
}

export function GuideIcon() {
  return <Icon name="book" size={17} />;
}

export function SettingsIcon() {
  return <Icon name="gear" size={17} />;
}

export function InfoIcon() {
  return <Icon name="info-circle" size={17} />;
}

export function CloseTabIcon() {
  return <Icon name="x-lg" size={12} />;
}

export function WarningIcon() {
  return <Icon name="exclamation-triangle" size={13} />;
}

export function ReopenIcon() {
  return <Icon name="arrow-counterclockwise" size={13} />;
}

export function MarkdownActionIcon({ actionId }: { actionId: MarkdownActionId }) {
  switch (actionId) {
    case 'h1':
      return <TextHeadingIcon level="1" />;
    case 'h2':
      return <TextHeadingIcon level="2" />;
    case 'bold':
      return <TextMarkIcon mark="B" />;
    case 'italic':
      return <TextMarkIcon mark="I" italic />;
    case 'link':
      return <LinkIcon />;
    case 'image':
      return <ImageIcon />;
    case 'bullet-list':
      return <ListIcon ordered={false} />;
    case 'ordered-list':
      return <ListIcon ordered />;
    case 'checklist':
      return <ChecklistIcon />;
    case 'quote':
      return <QuoteIcon />;
    case 'inline-code':
      return <InlineCodeIcon />;
    case 'code-block':
      return <CodeBlockIcon />;
    case 'divider':
      return <DividerIcon />;
    case 'mermaid-diagram':
      return <MermaidIcon />;
    case 'markmap-mindmap':
      return <MarkmapIcon />;
    case 'chart-block':
      return <ChartIcon />;
  }
}

export function MermaidIcon() {
  return <Icon name="diagram-3" className="workspace__quick-action-icon" />;
}

export function MarkmapIcon() {
  return <Icon name="diagram-2" className="workspace__quick-action-icon" />;
}

export function ChartIcon() {
  return <Icon name="bar-chart" className="workspace__quick-action-icon" />;
}

export function TextHeadingIcon({ level }: { level: '1' | '2' }) {
  return (
    <Icon name={level === '1' ? 'type-h1' : 'type-h2'} className="workspace__quick-action-icon" />
  );
}

export function TextMarkIcon({ mark }: { mark: 'B' | 'I'; italic?: boolean }) {
  return (
    <Icon
      name={mark === 'B' ? 'type-bold' : 'type-italic'}
      className="workspace__quick-action-icon"
    />
  );
}

export function LinkIcon() {
  return <Icon name="link-45deg" className="workspace__quick-action-icon" />;
}

export function ImageIcon() {
  return <Icon name="image" className="workspace__quick-action-icon" />;
}

export function ListIcon({ ordered }: { ordered: boolean }) {
  return <Icon name={ordered ? 'list-ol' : 'list-ul'} className="workspace__quick-action-icon" />;
}

export function ChecklistIcon() {
  return <Icon name="list-check" className="workspace__quick-action-icon" />;
}

export function QuoteIcon() {
  return <Icon name="quote" className="workspace__quick-action-icon" />;
}

export function InlineCodeIcon() {
  return <Icon name="code" className="workspace__quick-action-icon" />;
}

export function CodeBlockIcon() {
  return <Icon name="code-square" className="workspace__quick-action-icon" />;
}

export function DividerIcon() {
  return <Icon name="hr" className="workspace__quick-action-icon" />;
}

export function TableIcon() {
  return <Icon name="table" className="workspace__quick-actions-table-icon" />;
}
