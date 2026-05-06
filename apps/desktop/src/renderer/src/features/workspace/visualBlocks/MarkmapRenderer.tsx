import { useEffect, useRef, useState } from 'react';

interface MarkmapRendererProps {
  source: string;
  fallbackLabel: string;
}

interface MarkmapDeps {
  Transformer: typeof import('markmap-lib').Transformer;
  Markmap: typeof import('markmap-view').Markmap;
}

let markmapPromise: Promise<MarkmapDeps> | null = null;

async function loadMarkmap(): Promise<MarkmapDeps> {
  if (!markmapPromise) {
    markmapPromise = (async () => {
      const [{ Transformer }, { Markmap }] = await Promise.all([
        import('markmap-lib'),
        import('markmap-view'),
      ]);
      return { Transformer, Markmap };
    })();
  }
  return markmapPromise;
}

export function MarkmapRenderer({ source, fallbackLabel }: MarkmapRendererProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);

    void (async () => {
      try {
        const { Transformer, Markmap } = await loadMarkmap();
        if (cancelled || !svgRef.current) return;
        const transformer = new Transformer();
        const { root } = transformer.transform(source);
        // Reset previous render.
        svgRef.current.replaceChildren();
        const markmap = Markmap.create(svgRef.current, undefined, root);
        await markmap.fit();
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'Markmap render failed';
        setError(message);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [source]);

  if (error) {
    return (
      <div
        className="visual-block visual-block--markmap visual-block--error"
        role="alert"
        aria-label={fallbackLabel}
      >
        <p className="visual-block__error-title">{fallbackLabel}</p>
        <pre className="visual-block__error-source">{source}</pre>
        <p className="visual-block__error-message">{error}</p>
      </div>
    );
  }

  return (
    <div className="visual-block visual-block--markmap" aria-label={fallbackLabel}>
      <svg
        ref={svgRef}
        className="visual-block__markmap-svg"
        data-testid="markmap-renderer"
        role="img"
        aria-label={fallbackLabel}
      />
    </div>
  );
}
