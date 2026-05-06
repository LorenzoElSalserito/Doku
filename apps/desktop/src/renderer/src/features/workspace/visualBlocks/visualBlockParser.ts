import {
  parseChartBlockSource,
  type ChartBlock,
  type VisualBlockKind,
} from '@doku/application';

export interface CodeFenceBlock {
  language: string | null;
  source: string;
}

export interface MermaidVisualBlock {
  kind: 'mermaid';
  source: string;
}

export interface MarkmapVisualBlock {
  kind: 'markmap';
  source: string;
}

export interface ChartVisualBlock {
  kind: 'chart';
  block: ChartBlock;
  rawSource: string;
}

export interface InvalidVisualBlock {
  kind: 'invalid';
  blockKind: VisualBlockKind;
  rawSource: string;
  message: string;
}

export type ParsedVisualBlock =
  | MermaidVisualBlock
  | MarkmapVisualBlock
  | ChartVisualBlock
  | InvalidVisualBlock;

export function classifyCodeFence(fence: CodeFenceBlock): ParsedVisualBlock | null {
  const language = (fence.language ?? '').trim().toLowerCase();
  if (language === 'mermaid') {
    return { kind: 'mermaid', source: fence.source };
  }
  if (language === 'markmap') {
    return { kind: 'markmap', source: fence.source };
  }
  if (language === 'chart') {
    const result = parseChartBlockSource(fence.source);
    if (result.ok) {
      return { kind: 'chart', block: result.block, rawSource: fence.source };
    }
    return {
      kind: 'invalid',
      blockKind: 'chart',
      rawSource: fence.source,
      message: result.message,
    };
  }
  return null;
}

const FENCE_PATTERN = /^([ \t]*)(```|~~~)([^\n`]*)\n([\s\S]*?)(?:\r?\n)?\1\2[ \t]*$/gm;

export interface ExtractedFence {
  language: string | null;
  source: string;
  start: number;
  end: number;
}

export function extractFencedBlocks(markdown: string): ExtractedFence[] {
  const result: ExtractedFence[] = [];
  const text = markdown.replace(/\r\n/g, '\n');
  FENCE_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = FENCE_PATTERN.exec(text)) !== null) {
    const language = match[3]?.trim() || null;
    const source = match[4] ?? '';
    result.push({
      language,
      source,
      start: match.index,
      end: match.index + match[0].length,
    });
  }
  return result;
}

export function findVisualBlocks(markdown: string): ParsedVisualBlock[] {
  return extractFencedBlocks(markdown)
    .map((fence) => classifyCodeFence(fence))
    .filter((block): block is ParsedVisualBlock => block !== null);
}
