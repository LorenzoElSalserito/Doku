import { useEffect, useRef, useState } from 'react';

interface MermaidRendererProps {
  source: string;
  fallbackLabel: string;
}

let mermaidPromise: Promise<typeof import('mermaid').default> | null = null;

async function loadMermaid(): Promise<typeof import('mermaid').default> {
  if (!mermaidPromise) {
    mermaidPromise = import('mermaid').then((mod) => {
      const mermaid = mod.default;
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'strict',
        theme: 'default',
        fontFamily: 'inherit',
      });
      return mermaid;
    });
  }
  return mermaidPromise;
}

export function MermaidRenderer({ source, fallbackLabel }: MermaidRendererProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, setRenderToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setError(null);

    void (async () => {
      try {
        const mermaid = await loadMermaid();
        if (cancelled) return;
        const id = `mermaid-${Math.random().toString(36).slice(2, 10)}`;
        const { svg } = await mermaid.render(id, source);
        if (cancelled) return;
        if (containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
        setRenderToken((token) => token + 1);
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'Mermaid render failed';
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
        className="visual-block visual-block--mermaid visual-block--error"
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
    <div
      ref={containerRef}
      className="visual-block visual-block--mermaid"
      data-testid="mermaid-renderer"
      aria-label={fallbackLabel}
    />
  );
}
