import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('main process multi-instance policy', () => {
  it('uses a single-instance handoff so OS .md double-clicks reach the running window', async () => {
    const source = await readFile(join(__dirname, 'index.ts'), 'utf-8');

    expect(source).toContain('requestSingleInstanceLock');
    expect(source).toContain("app.on('second-instance'");
    expect(source).toContain('documentsOpenFileRequest');
    expect(source).toContain('findMarkdownFilePath');
  });
});
