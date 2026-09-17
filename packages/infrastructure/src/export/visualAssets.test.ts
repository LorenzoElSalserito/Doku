import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { findVisualFences, materializeVisualAssets } from './visualAssets.js';

const DOCUMENT = [
  '# Report',
  '',
  '```mermaid',
  'graph TD; A-->B',
  '```',
  '',
  'Testo.',
  '',
  '```js',
  'const x = 1;',
  '```',
  '',
  '~~~Chart',
  'type: bar',
  '~~~',
  '',
  '```markmap',
  '# Root',
  '```',
  '',
].join('\n');

const PNG_1PX =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

describe('findVisualFences', () => {
  it('lists mermaid, markmap and chart fences in source order, skipping other code', () => {
    expect(findVisualFences(DOCUMENT)).toEqual([
      { start: 2, end: 4, kind: 'mermaid', index: 0 },
      { start: 12, end: 14, kind: 'chart', index: 1 },
      { start: 16, end: 18, kind: 'markmap', index: 2 },
    ]);
  });

  it('tolerates an unterminated fence at the end of the document', () => {
    expect(findVisualFences('```mermaid\ngraph TD;')).toEqual([
      { start: 0, end: 1, kind: 'mermaid', index: 0 },
    ]);
  });
});

describe('materializeVisualAssets', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'doku-visual-assets-'));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('replaces captured fences with image references and writes the files', async () => {
    const result = await materializeVisualAssets(
      DOCUMENT,
      [
        { index: 0, kind: 'mermaid', png: PNG_1PX },
        { index: 2, kind: 'markmap', svg: '<svg xmlns="http://www.w3.org/2000/svg"></svg>' },
      ],
      dir,
      'png-or-svg',
    );

    expect(result.embedded).toBe(2);
    expect(result.markdown).toContain(`![](${dir.replace(/ /g, '%20')}/visual-0-mermaid.png)`);
    expect(result.markdown).toContain(`![](${dir.replace(/ /g, '%20')}/visual-2-markmap.svg)`);
    // The chart without a capture and the JS block stay as code.
    expect(result.markdown).toContain('~~~Chart\ntype: bar\n~~~');
    expect(result.markdown).toContain('```js\nconst x = 1;\n```');
    expect(result.markdown).not.toContain('graph TD; A-->B');
    expect((await readFile(join(dir, 'visual-0-mermaid.png'))).subarray(1, 4).toString()).toBe('PNG');
    expect(await readFile(join(dir, 'visual-2-markmap.svg'), 'utf-8')).toContain('<svg');
  });

  it('never embeds SVG when the engine needs raster pictures', async () => {
    const result = await materializeVisualAssets(
      DOCUMENT,
      [{ index: 0, kind: 'mermaid', svg: '<svg xmlns="http://www.w3.org/2000/svg"></svg>' }],
      dir,
      'png-only',
    );
    expect(result.embedded).toBe(0);
    expect(result.markdown).toBe(DOCUMENT);
  });

  it('ignores captures whose kind does not match the fence', async () => {
    const result = await materializeVisualAssets(
      DOCUMENT,
      [{ index: 0, kind: 'chart', png: PNG_1PX }],
      dir,
      'png-or-svg',
    );
    expect(result.embedded).toBe(0);
  });

  it('is a no-op without assets', async () => {
    expect(await materializeVisualAssets(DOCUMENT, undefined, dir, 'png-or-svg')).toEqual({
      markdown: DOCUMENT,
      embedded: 0,
    });
  });
});
