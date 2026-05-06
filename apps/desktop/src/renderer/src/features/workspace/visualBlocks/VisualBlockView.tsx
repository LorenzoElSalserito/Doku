import { lazy, Suspense } from 'react';
import type { ParsedVisualBlock } from './visualBlockParser.js';
import { InvalidVisualBlock } from './InvalidVisualBlock.js';

const MermaidRenderer = lazy(async () => {
  const module = await import('./MermaidRenderer.js');
  return { default: module.MermaidRenderer };
});

const MarkmapRenderer = lazy(async () => {
  const module = await import('./MarkmapRenderer.js');
  return { default: module.MarkmapRenderer };
});

const ChartRenderer = lazy(async () => {
  const module = await import('./ChartRenderer.js');
  return { default: module.ChartRenderer };
});

interface VisualBlockViewProps {
  block: ParsedVisualBlock;
  loadingLabel: string;
  fallbackLabel: string;
  errorTitle: string;
}

export function VisualBlockView({
  block,
  loadingLabel,
  fallbackLabel,
  errorTitle,
}: VisualBlockViewProps) {
  if (block.kind === 'invalid') {
    return (
      <InvalidVisualBlock
        blockKind={block.blockKind}
        rawSource={block.rawSource}
        message={block.message}
        errorTitle={errorTitle}
      />
    );
  }

  const fallback = (
    <div
      className={`visual-block visual-block--${block.kind} visual-block--loading`}
      aria-label={loadingLabel}
      data-testid={`visual-block-loading-${block.kind}`}
    >
      {loadingLabel}
    </div>
  );

  if (block.kind === 'mermaid') {
    return (
      <Suspense fallback={fallback}>
        <MermaidRenderer source={block.source} fallbackLabel={fallbackLabel} />
      </Suspense>
    );
  }

  if (block.kind === 'markmap') {
    return (
      <Suspense fallback={fallback}>
        <MarkmapRenderer source={block.source} fallbackLabel={fallbackLabel} />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={fallback}>
      <ChartRenderer block={block.block} fallbackLabel={fallbackLabel} />
    </Suspense>
  );
}
