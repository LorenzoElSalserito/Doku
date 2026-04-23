import { useMemo, useState } from 'react';
import type { WorkspaceNode } from '@doku/application';
import { useDict } from '../../i18n/I18nProvider.js';

interface WorkspaceExplorerProps {
  nodes: WorkspaceNode[];
  activePath?: string;
  onOpenFile: (path: string) => void;
  onCreateFile: () => void;
  onCreateFolder: () => void;
}

export function WorkspaceExplorer({
  nodes,
  activePath,
  onOpenFile,
  onCreateFile,
  onCreateFolder,
}: WorkspaceExplorerProps) {
  const dict = useDict();
  const [expandedPaths, setExpandedPaths] = useState<Record<string, boolean>>({});

  const normalizedExpanded = useMemo(() => {
    const initial: Record<string, boolean> = {};
    for (const node of nodes) {
      if (node.kind === 'directory') {
        initial[node.path] = expandedPaths[node.path] ?? true;
      }
    }
    return initial;
  }, [expandedPaths, nodes]);

  return (
    <>
      <div className="workspace-explorer__actions" aria-label={dict.workspace.workspaceExplorer.openFolder}>
        <button type="button" className="workspace-explorer__action" onClick={onCreateFile}>
          {dict.workspace.workspaceExplorer.newFile}
        </button>
        <button type="button" className="workspace-explorer__action" onClick={onCreateFolder}>
          {dict.workspace.workspaceExplorer.newFolder}
        </button>
      </div>

      {nodes.length === 0 ? (
        <p className="workspace-explorer__empty">{dict.workspace.workspaceExplorer.empty}</p>
      ) : (
        <div className="workspace-explorer" role="tree" aria-label={dict.workspace.workspaceExplorer.title}>
          {nodes.map((node) => (
            <WorkspaceExplorerNode
              key={node.path}
              node={node}
              depth={0}
              activePath={activePath}
              expandedPaths={normalizedExpanded}
              onToggle={(path) =>
                setExpandedPaths((current) => ({
                  ...current,
                  [path]: !(current[path] ?? true),
                }))
              }
              onOpenFile={onOpenFile}
            />
          ))}
        </div>
      )}
    </>
  );
}

interface WorkspaceExplorerNodeProps {
  node: WorkspaceNode;
  depth: number;
  activePath?: string;
  expandedPaths: Record<string, boolean>;
  onToggle: (path: string) => void;
  onOpenFile: (path: string) => void;
}

function WorkspaceExplorerNode({
  node,
  depth,
  activePath,
  expandedPaths,
  onToggle,
  onOpenFile,
}: WorkspaceExplorerNodeProps) {
  const dict = useDict();
  const isDirectory = node.kind === 'directory';
  const isExpanded = isDirectory ? (expandedPaths[node.path] ?? true) : false;
  const isActive = activePath === node.path;
  const label = resolveNodeLabel(node.kind, dict.workspace.workspaceExplorer);

  return (
    <div className="workspace-explorer__node">
      <button
        type="button"
        role="treeitem"
        aria-expanded={isDirectory ? isExpanded : undefined}
        aria-current={isActive ? 'page' : undefined}
        className={`workspace-explorer__item${isActive ? ' workspace-explorer__item--active' : ''}`}
        style={{ paddingLeft: `${depth * 18 + 12}px` }}
        onClick={() => {
          if (isDirectory) {
            onToggle(node.path);
            return;
          }

          if (node.kind === 'markdown') {
            onOpenFile(node.path);
          }
        }}
        title={`${label}: ${node.name}`}
      >
        <span className="workspace-explorer__icon" aria-hidden="true">
          {iconForNode(node.kind, isExpanded)}
        </span>
        <span className="workspace-explorer__name">{node.name}</span>
      </button>

      {isDirectory && isExpanded && node.children?.length ? (
        <div role="group">
          {node.children.map((child) => (
            <WorkspaceExplorerNode
              key={child.path}
              node={child}
              depth={depth + 1}
              activePath={activePath}
              expandedPaths={expandedPaths}
              onToggle={onToggle}
              onOpenFile={onOpenFile}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function iconForNode(kind: WorkspaceNode['kind'], isExpanded: boolean): string {
  if (kind === 'directory') {
    return isExpanded ? '▾' : '▸';
  }
  if (kind === 'markdown') {
    return 'M';
  }
  if (kind === 'asset') {
    return 'I';
  }
  return '•';
}

function resolveNodeLabel(
  kind: WorkspaceNode['kind'],
  dict: ReturnType<typeof useDict>['workspace']['workspaceExplorer'],
): string {
  switch (kind) {
    case 'directory':
      return dict.directory;
    case 'markdown':
      return dict.markdown;
    case 'asset':
      return dict.asset;
    default:
      return dict.other;
  }
}
