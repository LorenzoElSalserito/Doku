import type { PdfExportVisualAsset } from '@doku/application';

const VISUAL_FENCE = /^\s*(?:`{3,}|~{3,})\s*(mermaid|markmap|chart)\b/im;
const RASTER_SCALE = 2;

/** True when the markdown contains at least one Mermaid, Markmap or chart fence. */
export function hasVisualBlocks(markdown: string): boolean {
  return VISUAL_FENCE.test(markdown);
}

interface WaitOptions {
  timeoutMs?: number;
  intervalMs?: number;
}

/**
 * Waits until every visual block inside `container` has finished rendering
 * (an SVG is present, or the block reported an error). Resolves early on
 * timeout so an export is never blocked by a diagram that cannot render.
 */
export async function waitForVisualBlocks(
  container: HTMLElement,
  { timeoutMs = 12_000, intervalMs = 120 }: WaitOptions = {},
): Promise<void> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const blocks = container.querySelectorAll('.markdown-preview__visual');
    const pending = [...blocks].filter((block) => {
      if (block.querySelector('.visual-block--error')) return false;
      if (block.querySelector('.visual-block--loading')) return true;
      const svg = block.querySelector('svg');
      if (!svg) return true;
      const box = svg.getBoundingClientRect();
      return box.width < 2 || box.height < 2 || svg.childElementCount === 0;
    });
    if (pending.length === 0) {
      // One more frame so late layout passes (chart resize, markmap fit) settle.
      await new Promise((resolve) => window.requestAnimationFrame(() => resolve(undefined)));
      return;
    }
    await new Promise((resolve) => window.setTimeout(resolve, intervalMs));
  }
}

/**
 * Captures the rendered visual blocks of a preview container, in source
 * order, as standalone SVG plus (when the browser allows it) a 2× PNG raster.
 */
export async function captureVisualAssets(container: HTMLElement): Promise<PdfExportVisualAsset[]> {
  const blocks = [...container.querySelectorAll<HTMLElement>('.markdown-preview__visual')];
  const assets: PdfExportVisualAsset[] = [];

  for (const [index, block] of blocks.entries()) {
    const kind = resolveKind(block);
    const svg = block.querySelector('svg');
    if (!kind || !svg || block.querySelector('.visual-block--error')) {
      continue;
    }
    const serialized = serializeSvg(svg);
    if (!serialized) {
      continue;
    }
    const asset: PdfExportVisualAsset = {
      index,
      kind,
      svg: serialized.markup,
      width: serialized.width,
      height: serialized.height,
    };
    try {
      asset.png = await rasterize(serialized.markup, serialized.width, serialized.height);
    } catch {
      // Tainted canvas (e.g. foreignObject labels) or decode failure: the SVG
      // alone is still usable by the web/print engine.
    }
    assets.push(asset);
  }

  return assets;
}

function resolveKind(block: HTMLElement): PdfExportVisualAsset['kind'] | null {
  for (const kind of ['mermaid', 'markmap', 'chart'] as const) {
    if (block.classList.contains(`markdown-preview__visual--${kind}`)) {
      return kind;
    }
  }
  return null;
}

interface SerializedSvg {
  markup: string;
  width: number;
  height: number;
}

function serializeSvg(source: SVGSVGElement): SerializedSvg | null {
  const rect = source.getBoundingClientRect();
  const viewBox = source.viewBox?.baseVal;
  const width = Math.round(rect.width || viewBox?.width || 0);
  const height = Math.round(rect.height || viewBox?.height || 0);
  if (width < 2 || height < 2) {
    return null;
  }

  const clone = source.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
  clone.setAttribute('width', String(width));
  clone.setAttribute('height', String(height));
  if (!clone.getAttribute('viewBox')) {
    clone.setAttribute('viewBox', `0 0 ${width} ${height}`);
  }
  clone.removeAttribute('style');
  inlineTextStyles(source, clone);

  const markup = new XMLSerializer().serializeToString(clone);
  return { markup, width, height };
}

/**
 * Copies the computed font properties of text nodes onto the clone, so the
 * standalone SVG keeps the preview's typography without the app stylesheet.
 */
function inlineTextStyles(source: SVGSVGElement, clone: SVGSVGElement): void {
  const sourceTexts = source.querySelectorAll('text, tspan');
  const cloneTexts = clone.querySelectorAll('text, tspan');
  sourceTexts.forEach((node, index) => {
    const target = cloneTexts[index];
    if (!target) return;
    const style = window.getComputedStyle(node);
    for (const property of ['font-family', 'font-size', 'font-weight', 'fill'] as const) {
      const value = style.getPropertyValue(property);
      if (value && !target.getAttribute(property)) {
        target.setAttribute(property, value);
      }
    }
  });
}

async function rasterize(markup: string, width: number, height: number): Promise<string> {
  const image = new Image();
  image.decoding = 'sync';
  // The renderer CSP allows `data:` images but not `blob:` URLs.
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('SVG decode failed'));
      image.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width * RASTER_SCALE));
    canvas.height = Math.max(1, Math.round(height * RASTER_SCALE));
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Canvas unavailable');
    }
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/png');
    const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
    if (!base64) {
      throw new Error('Empty raster');
    }
    return base64;
  } finally {
    image.src = '';
  }
}
