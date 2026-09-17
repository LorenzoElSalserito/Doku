import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { PdfExportVisualAsset } from '@doku/schemas';

const VISUAL_LANGUAGES = new Set(['mermaid', 'markmap', 'chart']);

export interface VisualFence {
  /** 0-based line index of the opening fence. */
  start: number;
  /** 0-based line index of the closing fence (inclusive). */
  end: number;
  kind: 'mermaid' | 'markmap' | 'chart';
  index: number;
}

/**
 * Finds the visual code fences (```mermaid / ```markmap / ```chart) of a
 * markdown document, in source order. Mirrors the renderer's classification:
 * the language is the first token after the fence, case-insensitive.
 */
export function findVisualFences(markdown: string): VisualFence[] {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const fences: VisualFence[] = [];
  let index = 0;
  let line = 0;

  while (line < lines.length) {
    const opening = /^\s*(`{3,}|~{3,})\s*([^\s`]*)/.exec(lines[line] ?? '');
    if (!opening) {
      line += 1;
      continue;
    }
    const marker = opening[1] ?? '```';
    const language = (opening[2] ?? '').trim().toLowerCase();
    const start = line;
    line += 1;
    while (line < lines.length && !(lines[line] ?? '').trim().startsWith(marker.charAt(0).repeat(3))) {
      line += 1;
    }
    const end = Math.min(line, lines.length - 1);
    if (VISUAL_LANGUAGES.has(language)) {
      fences.push({ start, end, kind: language as VisualFence['kind'], index });
      index += 1;
    }
    line += 1;
  }

  return fences;
}

export type VisualAssetPreference = 'png-or-svg' | 'png-only';

/**
 * Writes the captured pictures next to the export and replaces each visual
 * fence with an image reference, so pandoc embeds what the preview showed.
 * Fences without a usable capture are left untouched (they print as code).
 */
export async function materializeVisualAssets(
  markdown: string,
  assets: readonly PdfExportVisualAsset[] | undefined,
  assetsDir: string,
  preference: VisualAssetPreference,
): Promise<{ markdown: string; embedded: number }> {
  if (!assets || assets.length === 0) {
    return { markdown, embedded: 0 };
  }

  const fences = findVisualFences(markdown);
  if (fences.length === 0) {
    return { markdown, embedded: 0 };
  }

  const byIndex = new Map(assets.map((asset) => [asset.index, asset]));
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const replacements: Array<{ fence: VisualFence; reference: string }> = [];

  for (const fence of fences) {
    const asset = byIndex.get(fence.index);
    if (!asset || asset.kind !== fence.kind) {
      continue;
    }
    const file = await writeAsset(asset, assetsDir, preference);
    if (!file) {
      continue;
    }
    replacements.push({ fence, reference: `![](${toMarkdownPath(file)})` });
  }

  if (replacements.length === 0) {
    return { markdown, embedded: 0 };
  }

  // Replace from the end so earlier line indexes stay valid.
  for (const { fence, reference } of replacements.reverse()) {
    lines.splice(fence.start, fence.end - fence.start + 1, '', reference, '');
  }

  return { markdown: lines.join('\n'), embedded: replacements.length };
}

async function writeAsset(
  asset: PdfExportVisualAsset,
  assetsDir: string,
  preference: VisualAssetPreference,
): Promise<string | null> {
  const baseName = `visual-${asset.index}-${asset.kind}`;
  if (asset.png) {
    const file = join(assetsDir, `${baseName}.png`);
    await writeFile(file, Buffer.from(asset.png, 'base64'));
    return file;
  }
  if (asset.svg && preference === 'png-or-svg') {
    const file = join(assetsDir, `${baseName}.svg`);
    await writeFile(file, asset.svg, 'utf-8');
    return file;
  }
  return null;
}

function toMarkdownPath(file: string): string {
  // Pandoc reads local paths directly; spaces must be encoded for the
  // link-destination grammar and backslashes normalised for LaTeX.
  return file.replace(/\\/g, '/').replace(/ /g, '%20');
}
