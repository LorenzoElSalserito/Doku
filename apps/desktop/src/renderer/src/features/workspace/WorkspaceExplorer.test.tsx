// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ThemeProvider } from '@doku/ui';
import { I18nProvider } from '../../i18n/I18nProvider.js';
import { WorkspaceExplorer } from './WorkspaceExplorer.js';
import type { WorkspaceNode } from '@doku/application';

describe('WorkspaceExplorer', () => {
  it('opens markdown files from the tree and keeps directories collapsible', async () => {
    const user = userEvent.setup();
    const onOpenFile = vi.fn();
    const onCreateFile = vi.fn();
    const onCreateFolder = vi.fn();

    const nodes: WorkspaceNode[] = [
      {
        name: 'assets',
        path: '/workspace/assets',
        kind: 'directory',
        children: [
          {
            name: 'cover.png',
            path: '/workspace/assets/cover.png',
            kind: 'asset',
          },
        ],
      },
      {
        name: 'chapter-1.md',
        path: '/workspace/chapter-1.md',
        kind: 'markdown',
      },
    ];

    render(
      <I18nProvider language="en">
        <ThemeProvider preference="light">
          <WorkspaceExplorer
            nodes={nodes}
            activePath="/workspace/chapter-1.md"
            onOpenFile={onOpenFile}
            onCreateFile={onCreateFile}
            onCreateFolder={onCreateFolder}
          />
        </ThemeProvider>
      </I18nProvider>,
    );

    expect(screen.getByRole('tree')).toBeInTheDocument();
    expect(screen.getByRole('treeitem', { name: /chapter-1\.md/i })).toHaveAttribute('aria-current', 'page');

    await user.click(screen.getByRole('treeitem', { name: /chapter-1\.md/i }));
    expect(onOpenFile).toHaveBeenCalledWith('/workspace/chapter-1.md');

    const directoryButton = screen.getByRole('treeitem', { name: /assets/i });
    expect(directoryButton).toHaveAttribute('aria-expanded', 'true');

    await user.click(directoryButton);
    expect(directoryButton).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('treeitem', { name: /cover\.png/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'New file' }));
    await user.click(screen.getByRole('button', { name: 'New folder' }));
    expect(onCreateFile).toHaveBeenCalled();
    expect(onCreateFolder).toHaveBeenCalled();
  });
});
