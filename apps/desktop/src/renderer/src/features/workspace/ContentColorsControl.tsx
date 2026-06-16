import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@doku/ui';
import type { ContentColors } from '@doku/application';

export interface ContentColorsLabels {
  button: string;
  title: string;
  link: string;
  heading: string;
  code: string;
  quote: string;
  reset: string;
}

interface ContentColorsControlProps {
  labels: ContentColorsLabels;
  colors: ContentColors;
  onChange: (next: ContentColors) => void;
  disabled?: boolean;
}

type ColorFieldKey = keyof ContentColors;

const FIELD_FALLBACKS: Record<ColorFieldKey, string> = {
  link: '#007EB8',
  heading: '#1A1816',
  code: '#FDFBF7',
  quote: '#F9FCFE',
};

const POPOVER_ID = 'workspace-content-colors';

export function ContentColorsControl({
  labels,
  colors,
  onChange,
  disabled = false,
}: ContentColorsControlProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (disabled && open) {
      setOpen(false);
    }
  }, [disabled, open]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const node = containerRef.current;
      if (node && event.target instanceof Node && !node.contains(event.target)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const fields = useMemo<Array<{ key: ColorFieldKey; label: string }>>(
    () => [
      { key: 'link', label: labels.link },
      { key: 'heading', label: labels.heading },
      { key: 'code', label: labels.code },
      { key: 'quote', label: labels.quote },
    ],
    [labels.code, labels.heading, labels.link, labels.quote],
  );

  const hasOverrides = (Object.keys(colors) as ColorFieldKey[]).some((key) => colors[key] !== null);

  const setColor = (key: ColorFieldKey, value: string | null) => {
    onChange({ ...colors, [key]: value });
  };

  return (
    <div className="workspace__colors" ref={containerRef}>
      <Button
        ref={triggerRef}
        type="button"
        variant="ghost"
        size="sm"
        className="workspace__quick-action-button workspace__colors-trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? POPOVER_ID : undefined}
        aria-label={labels.button}
        title={labels.button}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
      >
        <PaletteIcon />
      </Button>
      {open ? (
        <div
          className="workspace__colors-popover"
          id={POPOVER_ID}
          role="dialog"
          aria-label={labels.title}
        >
          <span className="workspace__colors-title">{labels.title}</span>
          <div className="workspace__colors-grid">
            {fields.map((field) => {
              const current = colors[field.key];
              return (
                <div key={field.key} className="workspace__colors-field">
                  <span className="workspace__colors-field-label">{field.label}</span>
                  <span className="workspace__colors-field-controls">
                    <input
                      type="color"
                      className="workspace__colors-swatch"
                      value={current ?? FIELD_FALLBACKS[field.key]}
                      data-active={current !== null}
                      aria-label={field.label}
                      onChange={(event) => setColor(field.key, event.target.value.toUpperCase())}
                    />
                    {current !== null ? (
                      <button
                        type="button"
                        className="workspace__colors-clear"
                        aria-label={`${field.label} — ${labels.reset}`}
                        title={labels.reset}
                        onClick={() => setColor(field.key, null)}
                      >
                        ×
                      </button>
                    ) : null}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="workspace__colors-actions">
            <Button
              variant="ghost"
              size="sm"
              disabled={!hasOverrides}
              onClick={() => onChange({ link: null, heading: null, code: null, quote: null })}
            >
              {labels.reset}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PaletteIcon() {
  return (
    <svg
      className="workspace__quick-action-icon"
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M12 3a9 9 0 1 0 0 18c1.3 0 2-1 2-1.8 0-.5-.3-.9-.6-1.3-.3-.4-.6-.8-.6-1.3 0-.8.7-1.4 1.5-1.4H16a5 5 0 0 0 5-5c0-3.6-4-6.2-9-6.2Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="7.5" cy="12" r="1.1" fill="currentColor" />
      <circle cx="10" cy="7.8" r="1.1" fill="currentColor" />
      <circle cx="15" cy="7.8" r="1.1" fill="currentColor" />
    </svg>
  );
}
