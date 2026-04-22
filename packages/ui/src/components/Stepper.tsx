export interface StepperProps {
  total: number;
  current: number;
  ariaLabel: string;
}

export function Stepper({ total, current, ariaLabel }: StepperProps) {
  return (
    <div
      className="doku-stepper"
      role="progressbar"
      aria-label={ariaLabel}
      aria-valuemin={1}
      aria-valuemax={total}
      aria-valuenow={current + 1}
    >
      {Array.from({ length: total }, (_, i) => {
        const state = i === current ? 'current' : i < current ? 'done' : 'upcoming';
        return (
          <span
            key={i}
            className={[
              'doku-stepper__dot',
              state === 'current' && 'doku-stepper__dot--current',
              state === 'done' && 'doku-stepper__dot--done',
            ]
              .filter(Boolean)
              .join(' ')}
          />
        );
      })}
    </div>
  );
}
