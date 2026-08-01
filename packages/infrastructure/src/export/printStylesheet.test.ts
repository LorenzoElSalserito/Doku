import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const stylesheetPath = fileURLToPath(new URL('./printStylesheet.css', import.meta.url));

async function loadStylesheet(): Promise<string> {
  return readFile(stylesheetPath, 'utf-8');
}

function ruleBody(css: string, selector: string): string {
  const index = css.indexOf(`${selector} {`);
  expect(index, `missing rule for ${selector}`).toBeGreaterThan(-1);
  return css.slice(index, css.indexOf('}', index));
}

describe('A4 print stylesheet', () => {
  it('declares mirrored binding margins on A4 pages', async () => {
    const css = await loadStylesheet();

    expect(css).toContain('size: A4');
    // Recto binds on the left, verso on the right: the gutter always ends up on
    // the inner edge of the bound printout.
    expect(ruleBody(css, '@page :right')).toContain('margin-left: 26mm');
    expect(ruleBody(css, '@page :right')).toContain('margin-right: 16mm');
    expect(ruleBody(css, '@page :left')).toContain('margin-left: 16mm');
    expect(ruleBody(css, '@page :left')).toContain('margin-right: 26mm');
  });

  it('keeps the app typography variables so exports match the editor fonts', async () => {
    const css = await loadStylesheet();

    expect(css).toContain('var(--print-font-body');
    expect(css).toContain('var(--print-font-heading');
    expect(css).toContain('var(--print-font-code');
  });

  it('forces code blocks to wrap instead of being clipped', async () => {
    const css = await loadStylesheet();
    const pre = ruleBody(css, 'pre');

    expect(pre).toContain('white-space: pre-wrap');
    expect(pre).toContain('word-break: break-all');
    expect(pre).toContain('overflow: visible');
    // Pandoc's highlighting CSS pins these selectors to `white-space: pre`.
    expect(css).toContain('pre > code.sourceCode,');
    expect(css).toContain('pre > code.sourceCode > span,');
  });

  it('keeps wide tables inside the text column and repeats their header', async () => {
    const css = await loadStylesheet();
    const table = ruleBody(css, 'table');
    const cells = ruleBody(css, 'th, td');

    expect(table).toContain('width: 100%');
    expect(table).toContain('max-width: 100%');
    expect(cells).toContain('overflow-wrap: anywhere');
    expect(ruleBody(css, 'thead')).toContain('display: table-header-group');
    expect(ruleBody(css, 'tr')).toContain('break-inside: avoid');
  });

  it('never lets images or long links overflow the page', async () => {
    const css = await loadStylesheet();

    expect(ruleBody(css, 'img, svg')).toContain('max-width: 100%');
    expect(ruleBody(css, 'a')).toContain('overflow-wrap: anywhere');
  });
});
