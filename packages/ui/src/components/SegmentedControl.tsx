import { useCallback, useRef, type KeyboardEvent, type ReactNode } from 'react';

export interface SegmentedOption<T extends string> {
  value: T;
  label: ReactNode;
  description?: string;
}

export interface SegmentedControlProps<T extends string> {
  value: T;
  options: SegmentedOption<T>[];
  onChange: (value: T) => void;
  ariaLabel: string;
  fullWidth?: boolean;
  idPrefix?: string;
}

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  fullWidth = false,
  idPrefix = 'seg',
}: SegmentedControlProps<T>) {
  const listRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
      const total = options.length;
      let next = index;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (index + 1) % total;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (index - 1 + total) % total;
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = total - 1;
      else return;
      e.preventDefault();
      const nextOption = options[next];
      if (!nextOption) return;
      onChange(nextOption.value);
      const buttons = listRef.current?.querySelectorAll<HTMLButtonElement>(
        'button[role="tab"]',
      );
      buttons?.[next]?.focus();
    },
    [onChange, options],
  );

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={ariaLabel}
      className={['doku-segmented', fullWidth && 'doku-segmented--full'].filter(Boolean).join(' ')}
    >
      {options.map((opt, i) => {
        const selected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            id={`${idPrefix}-${opt.value}`}
            aria-selected={selected}
            aria-label={opt.description}
            tabIndex={selected ? 0 : -1}
            className="doku-segmented__option"
            onClick={() => onChange(opt.value)}
            onKeyDown={(e) => handleKeyDown(e, i)}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
