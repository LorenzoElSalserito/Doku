import { z } from 'zod';

export const VISUAL_BLOCK_KINDS = ['mermaid', 'markmap', 'chart'] as const;
export const VisualBlockKindSchema = z.enum(VISUAL_BLOCK_KINDS);
export type VisualBlockKind = z.infer<typeof VisualBlockKindSchema>;

export const ChartTypeSchema = z.enum(['bar', 'line', 'area', 'pie']);
export type ChartType = z.infer<typeof ChartTypeSchema>;

const ChartCellSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);

export const ChartBlockSchema = z.object({
  kind: z.literal('chart'),
  chartType: ChartTypeSchema,
  title: z.string().min(1).optional(),
  xKey: z.string().min(1),
  yKeys: z.array(z.string().min(1)).min(1),
  data: z.array(z.record(z.string(), ChartCellSchema)).min(1),
});
export type ChartBlock = z.infer<typeof ChartBlockSchema>;

export interface VisualBlockCapability {
  readonly id: 'mermaidDiagram' | 'markmapMindmap' | 'rechartsStats';
  readonly blockKind: VisualBlockKind;
  readonly markdownFence: VisualBlockKind;
  readonly i18nLabel: string;
  readonly templateFactory: () => string;
}

const MERMAID_TEMPLATE = ['flowchart TD', '  A[Idea] --> B[Bozza]', '  B --> C[Revisione]'].join('\n');
const MARKMAP_TEMPLATE = ['# Mappa mentale', '## Nodo principale', '### Dettaglio'].join('\n');
const CHART_TEMPLATE: ChartBlock = {
  kind: 'chart',
  chartType: 'bar',
  title: 'Esempio statistiche',
  xKey: 'label',
  yKeys: ['value'],
  data: [
    { label: 'A', value: 10 },
    { label: 'B', value: 20 },
  ],
};

export const VISUAL_BLOCK_CAPABILITIES = {
  mermaidDiagram: {
    id: 'mermaidDiagram',
    blockKind: 'mermaid',
    markdownFence: 'mermaid',
    i18nLabel: 'visualBlocks.mermaid.label',
    templateFactory: () => MERMAID_TEMPLATE,
  },
  markmapMindmap: {
    id: 'markmapMindmap',
    blockKind: 'markmap',
    markdownFence: 'markmap',
    i18nLabel: 'visualBlocks.markmap.label',
    templateFactory: () => MARKMAP_TEMPLATE,
  },
  rechartsStats: {
    id: 'rechartsStats',
    blockKind: 'chart',
    markdownFence: 'chart',
    i18nLabel: 'visualBlocks.chart.label',
    templateFactory: () => JSON.stringify(CHART_TEMPLATE, null, 2),
  },
} as const satisfies Record<string, VisualBlockCapability>;

export type VisualBlockCapabilityId = keyof typeof VISUAL_BLOCK_CAPABILITIES;

export interface ChartParseSuccess {
  ok: true;
  block: ChartBlock;
}

export interface ChartParseFailure {
  ok: false;
  reason: 'invalid-json' | 'invalid-schema';
  message: string;
}

export type ChartParseResult = ChartParseSuccess | ChartParseFailure;

export function parseChartBlockSource(source: string): ChartParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(source);
  } catch (err) {
    return {
      ok: false,
      reason: 'invalid-json',
      message: err instanceof Error ? err.message : 'Invalid JSON',
    };
  }
  const result = ChartBlockSchema.safeParse(parsed);
  if (!result.success) {
    return {
      ok: false,
      reason: 'invalid-schema',
      message: result.error.issues
        .map((issue) => `${issue.path.join('.') || '<root>'}: ${issue.message}`)
        .join('; '),
    };
  }
  return { ok: true, block: result.data };
}

export function isVisualBlockFence(language: string | undefined | null): language is VisualBlockKind {
  if (!language) return false;
  return (VISUAL_BLOCK_KINDS as readonly string[]).includes(language.trim().toLowerCase());
}
