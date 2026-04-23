import { describe, expect, it } from 'vitest';
import { classifyWorkspaceFile, compareWorkspaceEntries } from './workspaceTree.js';

describe('workspaceTree', () => {
  it('classifies markdown files', () => {
    expect(classifyWorkspaceFile('chapter.md')).toBe('markdown');
    expect(classifyWorkspaceFile('notes.markdown')).toBe('markdown');
  });

  it('classifies image assets', () => {
    expect(classifyWorkspaceFile('cover.png')).toBe('asset');
    expect(classifyWorkspaceFile('diagram.SVG')).toBe('asset');
  });

  it('falls back to generic files for unsupported extensions', () => {
    expect(classifyWorkspaceFile('archive.zip')).toBe('other');
  });

  it('sorts directories before files and keeps lexical order inside each group', () => {
    const entries = [
      { name: 'zeta.md', isDirectory: () => false },
      { name: 'assets', isDirectory: () => true },
      { name: 'Drafts', isDirectory: () => true },
      { name: 'alpha.md', isDirectory: () => false },
    ];

    const sorted = [...entries].sort(compareWorkspaceEntries);

    expect(sorted.map((entry) => entry.name)).toEqual([
      'assets',
      'Drafts',
      'alpha.md',
      'zeta.md',
    ]);
  });
});
