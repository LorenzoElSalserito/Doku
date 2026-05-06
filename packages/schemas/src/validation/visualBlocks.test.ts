import { describe, expect, it } from 'vitest';
import {
  ChartBlockSchema,
  VISUAL_BLOCK_CAPABILITIES,
  VISUAL_BLOCK_KINDS,
  isVisualBlockFence,
  parseChartBlockSource,
} from './visualBlocks.js';

describe('visualBlocks schema', () => {
  it('accepts a valid bar chart payload', () => {
    const result = ChartBlockSchema.safeParse({
      kind: 'chart',
      chartType: 'bar',
      xKey: 'label',
      yKeys: ['value'],
      data: [{ label: 'A', value: 1 }],
    });
    expect(result.success).toBe(true);
  });

  it('rejects unknown chart types', () => {
    const result = ChartBlockSchema.safeParse({
      kind: 'chart',
      chartType: 'donut',
      xKey: 'label',
      yKeys: ['value'],
      data: [{ label: 'A', value: 1 }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty datasets and empty yKeys', () => {
    expect(
      ChartBlockSchema.safeParse({
        kind: 'chart',
        chartType: 'bar',
        xKey: 'label',
        yKeys: [],
        data: [{ label: 'A', value: 1 }],
      }).success,
    ).toBe(false);

    expect(
      ChartBlockSchema.safeParse({
        kind: 'chart',
        chartType: 'bar',
        xKey: 'label',
        yKeys: ['value'],
        data: [],
      }).success,
    ).toBe(false);
  });

  it('rejects non-primitive data values (no React or function payloads allowed)', () => {
    const result = ChartBlockSchema.safeParse({
      kind: 'chart',
      chartType: 'bar',
      xKey: 'label',
      yKeys: ['value'],
      data: [{ label: 'A', value: { nested: 1 } }],
    });
    expect(result.success).toBe(false);
  });
});

describe('parseChartBlockSource', () => {
  it('returns ok for a serialized template factory output', () => {
    const source = VISUAL_BLOCK_CAPABILITIES.rechartsStats.templateFactory();
    const result = parseChartBlockSource(source);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.block.chartType).toBe('bar');
      expect(result.block.data.length).toBeGreaterThan(0);
    }
  });

  it('returns invalid-json for malformed source', () => {
    const result = parseChartBlockSource('{ not json');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('invalid-json');
    }
  });

  it('returns invalid-schema for valid JSON that fails validation', () => {
    const result = parseChartBlockSource(JSON.stringify({ kind: 'chart' }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('invalid-schema');
    }
  });
});

describe('isVisualBlockFence', () => {
  it.each(VISUAL_BLOCK_KINDS)('treats %s as a visual fence', (kind) => {
    expect(isVisualBlockFence(kind)).toBe(true);
    expect(isVisualBlockFence(kind.toUpperCase())).toBe(true);
    expect(isVisualBlockFence(`  ${kind}  `)).toBe(true);
  });

  it('rejects non-visual languages', () => {
    expect(isVisualBlockFence('ts')).toBe(false);
    expect(isVisualBlockFence('')).toBe(false);
    expect(isVisualBlockFence(null)).toBe(false);
    expect(isVisualBlockFence(undefined)).toBe(false);
  });
});

describe('VISUAL_BLOCK_CAPABILITIES', () => {
  it('exposes one capability per visual block kind', () => {
    const blockKinds = Object.values(VISUAL_BLOCK_CAPABILITIES).map((c) => c.blockKind).sort();
    expect(blockKinds).toEqual([...VISUAL_BLOCK_KINDS].sort());
  });

  it('produces non-empty templates for each capability', () => {
    for (const capability of Object.values(VISUAL_BLOCK_CAPABILITIES)) {
      const template = capability.templateFactory();
      expect(template.length).toBeGreaterThan(0);
    }
  });

  it('chart capability template parses against ChartBlockSchema', () => {
    const template = VISUAL_BLOCK_CAPABILITIES.rechartsStats.templateFactory();
    const result = parseChartBlockSource(template);
    expect(result.ok).toBe(true);
  });
});
