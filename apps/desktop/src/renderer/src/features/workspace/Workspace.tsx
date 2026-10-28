import { WorkspaceStoreProvider } from './state/workspaceStore.js';
import { WorkspaceShell } from './WorkspaceShell.js';
import type { WorkspaceProps } from './workspaceTypes.js';

/**
 * Workspace entry point. The tab store lives above the shell so every hook
 * and component of the workspace reads the same tabs and active tab.
 */
export function Workspace(props: WorkspaceProps) {
  return (
    <WorkspaceStoreProvider restoringTabs={props.initialTabs.length > 0}>
      <WorkspaceShell {...props} />
    </WorkspaceStoreProvider>
  );
}
